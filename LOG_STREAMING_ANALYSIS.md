# Log Streaming Analysis Report - GUM Application

## Summary
Found critical issues with the log streaming endpoint that could lead to orphaned processes and resource leaks.

## 1. ENDPOINT LOCATION: `/execute-logs-stream/:projectId/:logId`

**File:** `/home/chartbox/Development/gum/backend/src/api/server.ts` (lines 1319-1438)

### Endpoint Overview
```typescript
this.app.get('/execute-logs-stream/:projectId/:logId', async (req: Request, res: Response) => {
```

---

## 2. PROCESS SPAWNING

### Where the tail/log process is spawned:
**File:** `/home/chartbox/Development/gum/backend/src/services/executor.service.ts` (line 427)

```typescript
const childProcess = spawn(shellCommand, shellArgs, spawnOptions);
```

**Called from server.ts line 1382:**
```typescript
const logStream = executorService.executeLogStream(logConfig.command, workingDir);
```

### Key Details:
- **Method:** `spawn()` from Node.js `child_process` module
- **Shell Command:** `/bin/sh` on Unix or `cmd.exe` on Windows
- **Arguments:** User-supplied log command passed through `logConfig.command`
- **Working Directory:** Set via `spawnOptions.cwd` if provided

---

## 3. CLIENT DISCONNECT HANDLING

### Issue: INCOMPLETE CLEANUP ON CLIENT DISCONNECT

**Current Implementation (server.ts lines 1417-1425):**
```typescript
// Handle client disconnect
res.on('close', () => {
    console.log('[LogStream] Client disconnected');
    // Kill the child process if it's still running
    const childProcess = (logStream as any).childProcess;
    if (childProcess) {
        childProcess.kill();
    }
});
```

### Problems Found:

1. **Race Condition in Event Listeners**
   - The `logStream.on('close')` listener (line 1404) calls `res.end()`
   - The `res.on('close')` listener (line 1418) tries to kill the process AFTER response ends
   - If the process closes naturally, the response ends before cleanup can run

2. **Timing Issue**
   - Child process may complete before client closes
   - Process cleanup runs too late or not at all
   - No timeout mechanism for long-running commands

3. **Incomplete Error Handling**
   - `logStream.on('error')` (line 1411) calls `res.end()` 
   - Child process kill is attempted in `res.on('close')` but response already ended
   - Orphaned process if error occurs

### Code Flow Analysis:

```
1. Client connects → logStream starts spawning command
2. Process outputs data → res.write() sends events
3. Process completes → logStream.on('close') → res.end()
4. Client disconnects → res.on('close') → tries to kill process
   ^^^ BUT PROCESS ALREADY ENDED, so kill has no effect

OR

1. Client disconnects before process finishes
2. res.on('close') fires → kills process ✓ (this works)
3. BUT if process completes between #1 and #2, kill fails silently
```

---

## 4. PROCESS CLEANUP ISSUES

### Location: ExecutorService.executeLogStream() - Lines 398-470

```typescript
public executeLogStream(command: string, workingDirectory?: string): EventEmitter {
    const emitter = new EventEmitter();
    
    try {
        // ... setup code ...
        const childProcess = spawn(shellCommand, shellArgs, spawnOptions);
        
        // Event listeners registered but NO cleanup reference stored properly
        childProcess.on('close', (code) => {
            emitter.emit('close', { code });
        });
        
        // Store reference for cleanup
        (emitter as any).childProcess = childProcess;
    } catch (error) {
        emitter.emit('error', errorMsg);
    }
    
    return emitter;
}
```

### Identified Issues:

1. **No Cleanup on Stream Error**
   - If `logStream.on('error')` fires, child process is NOT killed
   - Error handler only emits event, doesn't clean up process

2. **No Timeout Mechanism**
   - Commands that hang indefinitely will stay running
   - Client disconnect is only cleanup trigger
   - No backup cleanup strategy

3. **Weak Reference Handling**
   - TS type casting to `any` to store childProcess
   - No guarantee childProcess exists when accessed in res.on('close')
   - No validation that kill() succeeded

4. **EventEmitter Leak**
   - Event listeners on childProcess are never removed
   - Multiple connections could create cascading listeners
   - No max listeners set

---

## 5. DETAILED ISSUE BREAKDOWN

### Issue A: Race Condition
```
Process completes (close event)
↓
executor service emits 'close'
↓
server.ts res.write() then res.end()
↓
(PROBLEM: res.on('close') already fired when response ended)
↓
res.on('close') tries to kill already-dead process
```

### Issue B: Orphaned Processes on Client Abort
```
Client disconnects (connection reset, timeout, tab close)
↓
res.on('close') fires
↓
Tries to kill childProcess
↓
IF process already exited: kill() fails silently ✓ OK
IF process still running: kill() works ✓ OK
IF multiple refs exist: only one kill() called ✗ OTHER REFS LEAK
```

### Issue C: Unhandled Error Scenario
```
Process encounters error (permission denied, command not found)
↓
childProcess.on('error') fires
↓
emitter.emit('error')
↓
server.ts: logStream.on('error') → res.write() + res.end()
↓
(PROBLEM: res ends but process still running)
↓
res.on('close') may not fire for error conditions
↓
Orphaned process
```

---

## 6. MISSING SAFETY MECHANISMS

### Not Implemented:
1. **Process Timeout**
   - No automatic termination after N seconds
   - Long-running tail commands never killed

2. **Process Pool Management**
   - No tracking of active processes
   - No limit on concurrent log streams
   - No cleanup on server shutdown

3. **Signal Handling**
   - No SIGTERM → SIGKILL escalation
   - Process.kill() may not force termination
   - Child processes of tail might survive

4. **Error Recovery**
   - No retry logic
   - No fallback if process won't die
   - Silent failures on kill()

5. **Stream Backpressure**
   - No handling of res.write() return value
   - Could buffer unlimited data in memory
   - Process not paused if client can't keep up

---

## 7. COMPARISON WITH `/execution-stream/:executionId`

**Better Implementation (lines 286-379):**

```typescript
// Lines 357-378: Proper cleanup pattern
const cleanup = () => {
    emitter.removeListener(`execution:${executionId}:stdout`, stdoutListener);
    emitter.removeListener(`execution:${executionId}:stderr`, stderrListener);
    emitter.removeListener(`execution:${executionId}:close`, closeListener);
    emitter.removeListener(`execution:${executionId}:error`, errorListener);
    res.end();
};

// Cleanup on multiple triggers
req.on('close', cleanup);
req.on('aborted', cleanup);

// Even cleanup twice
req.on('close', () => {
    clearInterval(keepAlive);
    cleanup();
});
```

**Differences:**
- ✓ Removes all listeners (not just implicitly via scope)
- ✓ Handles both 'close' AND 'aborted' events
- ✓ Cleanup called BEFORE res.end() in normal flow
- ✓ Keepalive mechanism ensures connection vitality
- ✗ Still no timeout, process kill, or pool management

---

## 8. RECOMMENDED FIXES

### Priority 1: Immediate Fix (Process Kill)
```typescript
// In server.ts executeLogStream handler

// BEFORE: res.write() and listeners setup
let processKilled = false;

// IMPROVED cleanup
res.on('close', () => {
    if (!processKilled) {
        processKilled = true;
        const childProcess = (logStream as any).childProcess;
        if (childProcess && !childProcess.killed) {
            console.log('[LogStream] Killing process on client disconnect');
            childProcess.kill('SIGTERM');
            // Escalate to SIGKILL if needed
            setTimeout(() => {
                if (childProcess && !childProcess.killed) {
                    console.warn('[LogStream] Process did not die, sending SIGKILL');
                    childProcess.kill('SIGKILL');
                }
            }, 5000);
        }
    }
});

// Also handle on stream close
logStream.on('close', () => {
    processKilled = true;
    // ... rest of close handling
});
```

### Priority 2: Add Timeout
```typescript
const STREAM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const timeoutId = setTimeout(() => {
    console.warn('[LogStream] Stream timeout reached');
    const childProcess = (logStream as any).childProcess;
    if (childProcess) {
        childProcess.kill('SIGKILL');
    }
    res.end();
}, STREAM_TIMEOUT);

// Clear timeout when stream closes
logStream.on('close', () => {
    clearTimeout(timeoutId);
    // ...
});
```

### Priority 3: Process Tracking
```typescript
class LogStreamManager {
    private activeStreams = new Map<string, ChildProcess>();
    
    registerStream(logId: string, childProcess: ChildProcess) {
        this.activeStreams.set(logId, childProcess);
    }
    
    killStream(logId: string) {
        const proc = this.activeStreams.get(logId);
        if (proc && !proc.killed) {
            proc.kill('SIGKILL');
        }
        this.activeStreams.delete(logId);
    }
    
    killAllOnShutdown() {
        for (const [id, proc] of this.activeStreams) {
            if (proc && !proc.killed) {
                proc.kill('SIGKILL');
            }
        }
        this.activeStreams.clear();
    }
}
```

---

## 9. SEVERITY ASSESSMENT

### Impact:
- **Process Leaks:** Long-running commands (tail, watch, etc.) accumulate
- **Resource Exhaustion:** System runs out of file descriptors, memory
- **System Instability:** Orphaned processes consume CPU
- **Security:** Processes run with Node.js permissions indefinitely

### Likelihood:
- **HIGH** - Affects every log stream disconnect
- Especially likely with:
  - Client disconnect (network issues, tab close)
  - Long-running log commands (tail -f)
  - Interrupted streams

### Overall Risk: **HIGH**

---

## 10. FILES REQUIRING CHANGES

1. `/home/chartbox/Development/gum/backend/src/api/server.ts` (lines 1319-1438)
   - Add process kill on all cleanup paths
   - Add timeout mechanism
   - Improve error handling

2. `/home/chartbox/Development/gum/backend/src/services/executor.service.ts` (lines 398-470)
   - Add cleanup mechanism to returned emitter
   - Add process pool management
   - Improve error handling in executeLogStream()

3. Consider adding:
   - `/home/chartbox/Development/gum/backend/src/utils/ProcessManager.ts` (new file)
   - Global process tracking and cleanup

---

## 11. VERIFICATION COMMANDS

Test to verify the issue:

```bash
# Terminal 1: Start backend with logging
cd /home/chartbox/Development/gum/backend
npm start

# Terminal 2: Connect to log stream (with timeout to simulate early disconnect)
timeout 2 curl -N "http://localhost:3000/execute-logs-stream/1/1?token=YOUR_TOKEN" \
  2>/dev/null | head -10

# Terminal 3: Check if tail process is still running
ps aux | grep tail
# RESULT: Process likely still running after curl timeout
```

