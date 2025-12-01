# Log Streaming Cleanup Issues - Code Examples

## Overview
This document shows the problematic code patterns and contrasts them with better approaches.

---

## Issue #1: Race Condition Pattern

### Current (PROBLEMATIC)
```typescript
// In /execute-logs-stream endpoint (server.ts lines 1319-1438)

// Line 1382: Start process
const logStream = executorService.executeLogStream(logConfig.command, workingDir);

// Lines 1404-1408: Process completion listener
logStream.on('close', (result: any) => {
    console.log('[LogStream] Connection closed:', result);
    res.write(`data: ${JSON.stringify({ type: 'close', result, timestamp: Date.now() })}\n\n`);
    res.end();  // <-- RESPONSE ENDS HERE
});

// Lines 1411-1415: Error listener
logStream.on('error', (error: string) => {
    console.error('[LogStream] Stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error, timestamp: Date.now() })}\n\n`);
    res.end();  // <-- RESPONSE ENDS HERE TOO
});

// Lines 1418-1425: Client disconnect listener (TOO LATE!)
res.on('close', () => {
    console.log('[LogStream] Client disconnected');
    // Kill the child process if it's still running
    const childProcess = (logStream as any).childProcess;
    if (childProcess) {
        childProcess.kill();  // <-- Process already dead!
    }
});
```

### Issues:
1. Response ends in stream.on('close') AND stream.on('error')
2. res.on('close') tries to cleanup after response already ended
3. Process may already be dead or continue running

### Better Pattern (from /execution-stream)
```typescript
// From /execution-stream/:executionId endpoint (server.ts lines 286-379)

// Create cleanup function BEFORE setting up listeners
const cleanup = () => {
    emitter.removeListener(`execution:${executionId}:stdout`, stdoutListener);
    emitter.removeListener(`execution:${executionId}:stderr`, stderrListener);
    emitter.removeListener(`execution:${executionId}:close`, closeListener);
    emitter.removeListener(`execution:${executionId}:error`, errorListener);
    res.end();
};

// Register cleanup on multiple events
req.on('close', cleanup);      // Client disconnect
req.on('aborted', cleanup);    // Request aborted

// Also cleanup after close event
req.on('close', () => {
    clearInterval(keepAlive);
    cleanup();  // <-- Explicitly call cleanup
});

// Define listeners to use in cleanup function
const closeListener = (result: any) => {
    console.log(`SSE - Close event received:`, result);
    res.write(`data: ${JSON.stringify({ type: 'close', result, timestamp: Date.now() })}\n\n`);
    cleanup();  // <-- Call cleanup function instead of res.end()
};
```

### Advantages:
- Single cleanup function called everywhere
- Listeners properly removed
- res.end() called consistently
- Prevents duplicate cleanup

---

## Issue #2: Missing Process Kill

### Current (PROBLEMATIC)
```typescript
// server.ts line 1423
childProcess.kill();  // <-- Just calls kill() with no signal, no error handling
```

### Better Pattern
```typescript
// Proper process termination with escalation

const killProcess = (process: ChildProcess) => {
    if (!process || process.killed) {
        return;  // Already dead or doesn't exist
    }
    
    try {
        // First try SIGTERM (graceful shutdown)
        process.kill('SIGTERM');
        console.log('[LogStream] Sent SIGTERM to process');
        
        // Wait 5 seconds, then escalate to SIGKILL if needed
        const killTimeout = setTimeout(() => {
            if (!process.killed) {
                console.warn('[LogStream] Process did not die, sending SIGKILL');
                try {
                    process.kill('SIGKILL');  // Force kill
                } catch (err) {
                    console.error('[LogStream] Failed to SIGKILL process:', err);
                }
            }
        }, 5000);
        
        // Clear timeout if process dies naturally
        process.on('exit', () => {
            clearTimeout(killTimeout);
        });
        
    } catch (error) {
        console.error('[LogStream] Error killing process:', error);
    }
};

// In cleanup:
const childProcess = (logStream as any).childProcess;
if (childProcess) {
    killProcess(childProcess);
}
```

---

## Issue #3: No Timeout Protection

### Current (PROBLEMATIC)
```typescript
// No timeout mechanism - process can run indefinitely
const logStream = executorService.executeLogStream(logConfig.command, workingDir);

// Only way to stop it is client disconnect
res.on('close', () => {
    // Cleanup
});
```

### Better Pattern
```typescript
const MAX_STREAM_TIMEOUT = 30 * 60 * 1000;  // 30 minutes max

// Set timeout at start
const timeoutId = setTimeout(() => {
    console.warn('[LogStream] Stream timeout reached after 30 minutes');
    
    // Kill the process
    const childProcess = (logStream as any).childProcess;
    if (childProcess && !childProcess.killed) {
        childProcess.kill('SIGKILL');
    }
    
    // End response
    res.write(`data: ${JSON.stringify({ type: 'timeout', timestamp: Date.now() })}\n\n`);
    res.end();
    
}, MAX_STREAM_TIMEOUT);

// Set up stream
const logStream = executorService.executeLogStream(logConfig.command, workingDir);

// Clear timeout when stream ends naturally
logStream.on('close', (result: any) => {
    clearTimeout(timeoutId);  // <-- Clean up timeout
    res.write(`data: ${JSON.stringify({ type: 'close', result, timestamp: Date.now() })}\n\n`);
    res.end();
});

// Also clear on error
logStream.on('error', (error: string) => {
    clearTimeout(timeoutId);  // <-- Clean up timeout
    res.write(`data: ${JSON.stringify({ type: 'error', error, timestamp: Date.now() })}\n\n`);
    res.end();
});

// And on client disconnect
res.on('close', () => {
    clearTimeout(timeoutId);  // <-- Clean up timeout
    // Kill process...
});
```

---

## Issue #4: Weak Reference Handling

### Current (PROBLEMATIC)
```typescript
// In executor.service.ts line 461
(emitter as any).childProcess = childProcess;  // <-- Using 'any' bypasses type safety

// Later in server.ts line 1421
const childProcess = (logStream as any).childProcess;  // <-- Type-unsafe retrieval
if (childProcess) {  // Weak check
    childProcess.kill();
}
```

### Better Pattern
```typescript
// Option 1: Create proper interface
interface LogStream extends EventEmitter {
    childProcess: ChildProcess;
    kill(): void;
}

export class ExecutorService {
    public executeLogStream(command: string, workingDirectory?: string): LogStream {
        const emitter = new EventEmitter();
        let childProcess: ChildProcess | null = null;
        
        // ... setup code ...
        
        childProcess = spawn(shellCommand, shellArgs, spawnOptions);
        
        // ... event handlers ...
        
        // Attach properly typed method
        (emitter as unknown as LogStream).childProcess = childProcess;
        (emitter as unknown as LogStream).kill = function() {
            if (childProcess && !childProcess.killed) {
                childProcess.kill('SIGKILL');
            }
        };
        
        return emitter as unknown as LogStream;
    }
}

// Option 2: Use Map for tracking
class LogStreamManager {
    private streams = new Map<string, ChildProcess>();
    
    createStream(streamId: string, command: string): EventEmitter {
        const childProcess = spawn(...);
        this.streams.set(streamId, childProcess);
        // ...
        return emitter;
    }
    
    killStream(streamId: string) {
        const process = this.streams.get(streamId);
        if (process && !process.killed) {
            process.kill('SIGKILL');
        }
        this.streams.delete(streamId);
    }
    
    cleanup() {
        for (const process of this.streams.values()) {
            if (!process.killed) {
                process.kill('SIGKILL');
            }
        }
        this.streams.clear();
    }
}
```

---

## Issue #5: No Error Handler Process Kill

### Current (PROBLEMATIC)
```typescript
// server.ts lines 1411-1415
logStream.on('error', (error: string) => {
    console.error('[LogStream] Stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error, timestamp: Date.now() })}\n\n`);
    res.end();  // <-- Response ends, but process not killed!
});
```

### Better Pattern
```typescript
logStream.on('error', (error: string) => {
    console.error('[LogStream] Stream error:', error);
    
    // Kill process on error
    const childProcess = (logStream as any).childProcess;
    if (childProcess && !childProcess.killed) {
        console.log('[LogStream] Killing process due to error');
        try {
            childProcess.kill('SIGKILL');
        } catch (err) {
            console.error('[LogStream] Failed to kill process:', err);
        }
    }
    
    // Send error to client
    res.write(`data: ${JSON.stringify({ type: 'error', error, timestamp: Date.now() })}\n\n`);
    res.end();
});
```

---

## Issue #6: No Event Listener Cleanup

### Current (PROBLEMATIC)
```typescript
// executor.service.ts lines 436-457
childProcess.stdout.on('data', (data) => {
    const output = data.toString();
    emitter.emit('stdout', output);
});

childProcess.stderr.on('data', (data) => {
    const output = data.toString();
    emitter.emit('stderr', output);
});

childProcess.on('close', (code) => {
    emitter.emit('close', { code });
});

childProcess.on('exit', (code) => {
    console.log(`[LogStream] Process exited with code: ${code}`);
});
// <-- NO CLEANUP: Listeners stay attached indefinitely
```

### Better Pattern
```typescript
interface StreamCleanup {
    cleanup(): void;
}

public executeLogStream(command: string, workingDirectory?: string): EventEmitter & StreamCleanup {
    const emitter = new EventEmitter();
    let childProcess: ChildProcess | null = null;
    
    // ... spawn code ...
    
    // Store listeners for cleanup
    const dataListener = (data: any) => {
        const output = data.toString();
        emitter.emit('stdout', output);
    };
    
    const closeListener = (code: number) => {
        emitter.emit('close', { code });
        cleanup();  // Auto-cleanup on close
    };
    
    const cleanup = () => {
        if (childProcess) {
            childProcess.stdout?.removeListener('data', dataListener);
            childProcess.stderr?.removeListener('data', dataListener);
            childProcess.removeListener('close', closeListener);
            childProcess.removeListener('error', errorListener);
        }
    };
    
    childProcess.stdout.on('data', dataListener);
    childProcess.stderr.on('data', dataListener);
    childProcess.on('close', closeListener);
    childProcess.on('error', errorListener);
    
    // Expose cleanup method
    (emitter as any).cleanup = cleanup;
    
    return emitter as EventEmitter & StreamCleanup;
}
```

---

## Summary of Issues and Fixes

| Issue | Current | Problem | Fix Time | Fix Complexity |
|-------|---------|---------|----------|-----------------|
| Race condition | res.end() in multiple places | Cleanup runs too late | 30 min | Easy |
| No process kill | Not killing process | Orphaned processes | 5 min | Easy |
| No timeout | Indefinite execution | Resource leak | 1-2 hrs | Medium |
| No escalation | SIGTERM only | Zombie processes | 10 min | Easy |
| Type safety | Using 'any' type | Safety bypass | 15 min | Easy |
| Listener cleanup | No cleanup | EventEmitter leak | 20 min | Easy |

**Total estimated fix time: 4-6 hours for comprehensive fix**

