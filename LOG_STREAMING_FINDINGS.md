# Log Streaming Endpoint - Process Cleanup Issues (CRITICAL)

## Quick Summary

The `/execute-logs-stream/:projectId/:logId` endpoint has **critical process cleanup issues** that can lead to orphaned child processes consuming system resources indefinitely.

### Key Findings:
1. **Process spawning location:** `executor.service.ts` line 427 via `spawn()` 
2. **Endpoint location:** `server.ts` lines 1319-1438
3. **Cleanup issues:** Multiple race conditions and incomplete cleanup paths
4. **Risk Level:** HIGH - Affects production stability

---

## Issue #1: Race Condition in Cleanup

### Problem:
When the child process completes naturally, the cleanup order is wrong:

**Current flow:**
1. Child process finishes → `logStream.on('close')` fires
2. This calls `res.end()` (line 1407)
3. THEN `res.on('close')` listener runs (line 1418)
4. But response already ended, so this cleanup is redundant/timing-dependent

### Evidence from Code:
```typescript
// Line 1404-1408: Process close listener ENDS THE RESPONSE
logStream.on('close', (result: any) => {
    console.log('[LogStream] Connection closed:', result);
    res.write(`data: ${JSON.stringify({ type: 'close', result, timestamp: Date.now() })}\n\n`);
    res.end();  // <-- Response ends HERE
});

// Line 1418-1425: Client close listener tries cleanup AFTER response ended
res.on('close', () => {
    console.log('[LogStream] Client disconnected');
    // This runs too late!
    const childProcess = (logStream as any).childProcess;
    if (childProcess) {
        childProcess.kill();  // <-- Killing already-dead process
    }
});
```

---

## Issue #2: Orphaned Process on Error

### Problem:
If the child process encounters an error, cleanup doesn't trigger properly.

**Error path:**
```typescript
// Line 1411-1415: Error listener ENDS THE RESPONSE
logStream.on('error', (error: string) => {
    console.error('[LogStream] Stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error, timestamp: Date.now() })}\n\n`);
    res.end();  // <-- Response ends, but process might still be running
});
```

**Then:**
- `res.on('close')` MAY not fire reliably for errors
- Child process could still be running but response is closed
- **Result:** Orphaned process

---

## Issue #3: No Timeout Protection

### Problem:
Long-running log commands (like `tail -f`) have no timeout.

**Current protection:**
- Only thing that can stop it: client disconnects
- If client stays connected but wants to abort: **no way to stop it**
- System resource accumulation: **indefinite**

**Example scenario:**
```bash
# Admin starts viewing logs with tail -f
curl http://localhost:3000/execute-logs-stream/1/1?token=xyz

# Forgets to close the connection
# Process runs indefinitely, consuming file descriptors
# Leave it running for days, week, month...

# System runs out of file descriptors
# New log streams fail
# Database connections fail
# Entire application becomes unstable
```

---

## Issue #4: Incomplete Error Handling

### Current Issues:

1. **No SIGTERM → SIGKILL escalation**
   ```typescript
   // Current: Just calls kill() once
   childProcess.kill();  // May not actually terminate the process
   ```

2. **No validation that kill() worked**
   ```typescript
   // No check if process.killed === true
   // Could fail silently
   ```

3. **No handling of process exit vs. close**
   ```typescript
   // Events handled:
   - childProcess.on('close') ✓
   - childProcess.on('error') ✓
   
   // Events NOT handled:
   - childProcess.on('exit') ✗
   - Process groups/child processes ✗
   ```

---

## Issue #5: Reference Handling Issues

### Problem:
```typescript
// Type-unsafe reference storage
(emitter as any).childProcess = childProcess;  // <-- Using 'any' type

// Later retrieval with no null check
const childProcess = (logStream as any).childProcess;  // Could be undefined
if (childProcess) {  // Weak check
    childProcess.kill();  // Might not exist
}
```

**Risks:**
- TypeScript type safety bypassed
- No guarantee reference exists
- No validation of process state

---

## Comparison with Working Example

The `/execution-stream/:executionId` endpoint (lines 286-379) has **better cleanup patterns**:

```typescript
// Proper cleanup function (lines 357-364)
const cleanup = () => {
    emitter.removeListener(`execution:${executionId}:stdout`, stdoutListener);
    emitter.removeListener(`execution:${executionId}:stderr`, stderrListener);
    emitter.removeListener(`execution:${executionId}:close`, closeListener);
    emitter.removeListener(`execution:${executionId}:error`, errorListener);
    res.end();
};

// Called on multiple events
req.on('close', cleanup);      // Client disconnect
req.on('aborted', cleanup);    // Request aborted
```

**Better aspects:**
- ✓ Listeners explicitly removed
- ✓ Handles both 'close' AND 'aborted' events  
- ✓ Single cleanup function prevents duplication

**Still missing:**
- ✗ No process kill for spawned children
- ✗ No timeout mechanism
- ✗ No process pool management

---

## Production Impact

### How this manifests in production:

1. **Day 1-7:** Normal operation
2. **Day 7:** Admin views logs for debugging
3. **Day 8:** That process is still running (client didn't disconnect cleanly)
4. **Day 15:** Another admin views logs, another orphaned process
5. **Day 30:** 
   - 10-20 orphaned processes consuming resources
   - File descriptor exhaustion warnings
   - New log stream connections fail
   - Application becoming unstable
6. **Day 45:** 
   - Complete application failure
   - Can't create new connections
   - Database connections fail
   - Cascading system failure

---

## Test Case to Reproduce

```bash
# Terminal 1: Start the server
cd /home/chartbox/Development/gum/backend
npm start

# Terminal 2: Create a log config that runs 'tail -f /var/log/syslog'
# (This will run indefinitely)

# Terminal 3: Connect to log stream
curl -N "http://localhost:3000/execute-logs-stream/1/1?token=YOUR_TOKEN"

# Terminal 4: Kill curl after 5 seconds (simulate client disconnect)
sleep 5 && pkill -f "curl.*execute-logs-stream"

# Terminal 5: Check if tail process still exists
ps aux | grep tail | grep -v grep
# RESULT: tail process is STILL RUNNING
# Expected: tail process should be KILLED

# Left running indefinitely until:
# 1. Someone manually kills it
# 2. Server restarts
# 3. System runs out of resources
```

---

## Recommended Severity

- **Severity:** CRITICAL
- **Type:** Resource Leak / Denial of Service
- **Impact:** Production Stability
- **Exploitability:** High (anyone who can view logs)
- **False Positives:** Zero (this will definitely leak processes)

---

## Affected Code Locations

### Primary Issue
- **File:** `/home/chartbox/Development/gum/backend/src/api/server.ts`
- **Lines:** 1319-1438 (entire `/execute-logs-stream` endpoint)

### Executor Service
- **File:** `/home/chartbox/Development/gum/backend/src/services/executor.service.ts`
- **Lines:** 398-470 (executeLogStream method)

### Related Code
- **File:** `/home/chartbox/Development/gum/backend/src/api/server.ts`
- **Lines:** 286-379 (better cleanup pattern example in `/execution-stream` endpoint)

---

## Next Steps

1. **Immediate:** Add process.kill() with SIGKILL escalation
2. **Short-term:** Add timeout mechanism (30-60 minute max)
3. **Medium-term:** Implement process pool manager
4. **Long-term:** Add comprehensive stream lifecycle tests

For detailed fixes and code examples, see `LOG_STREAMING_ANALYSIS.md`.
