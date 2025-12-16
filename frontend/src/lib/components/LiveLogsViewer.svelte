<script lang="ts">
    import { onDestroy, createEventDispatcher, tick } from "svelte";
    import { X, Pause, Play, Download, Copy, Zap } from "lucide-svelte";
    import { toast as addToast } from "$lib/stores/toast";
    import type { LogConfig } from "$lib/types";
    import { streamLogs } from "$lib/services/api";

    export let logConfig: LogConfig;
    export let projectId: number;

    const dispatch = createEventDispatcher();

    let eventSource: EventSource | null = null;
    let logs: Array<{ type: "stdout" | "stderr"; data: string; timestamp: number }> = [];
    let logQueue: Array<{ type: "stdout" | "stderr"; data: string; timestamp: number }> = [];
    let isPaused = false;
    let isConnected = false;
    let isLoading = true;
    let errorMessage: string | null = null;
    let scrollContainer: HTMLDivElement;
    let batchProcessorInterval: number | null = null;
    let queuedCount = 0;
    let totalReceived = 0;
    let autoScroll = true;

    const LOG_BATCH_SIZE = 50; // Process 50 logs at a time
    const LOG_INTERVAL = 10; // Every 10ms

    function processBatch() {
        if (logQueue.length === 0 || isPaused) return;

        // Dynamically adjust batch size based on queue length
        // If there's a large queue, process more aggressively
        let batchSize = LOG_BATCH_SIZE;
        if (logQueue.length > 500) {
            batchSize = Math.min(200, Math.floor(logQueue.length / 3));
        } else if (logQueue.length > 100) {
            batchSize = Math.min(100, Math.floor(logQueue.length / 2));
        }

        const batch = logQueue.splice(0, batchSize);
        logs = [...logs, ...batch];
        queuedCount = logQueue.length;

        // Auto-scroll to bottom if enabled
        if (autoScroll && scrollContainer) {
            tick().then(() => {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            });
        }
    }

    function handleContainerScroll() {
        if (!scrollContainer) return;
        // Disable auto-scroll if user scrolls up
        const isAtBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 10;
        autoScroll = isAtBottom;
    }

    function startBatchProcessor() {
        if (batchProcessorInterval === null) {
            batchProcessorInterval = window.setInterval(processBatch, LOG_INTERVAL);
        }
    }

    function stopBatchProcessor() {
        if (batchProcessorInterval !== null) {
            clearInterval(batchProcessorInterval);
            batchProcessorInterval = null;
        }
    }

    function connectToLogs() {
        isLoading = true;
        isConnected = false;
        errorMessage = null;
        logs = [];
        logQueue = [];
        queuedCount = 0;
        totalReceived = 0;
        startBatchProcessor();

        try {
            eventSource = streamLogs(projectId, logConfig.id);

            eventSource.addEventListener("message", (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === "connected") {
                        isConnected = true;
                        isLoading = false;
                        errorMessage = null;
                        addToast("Connected to log stream", "success");
                    } else if (data.type === "stdout") {
                        totalReceived++;
                        logQueue.push({ type: "stdout", data: data.data, timestamp: data.timestamp });
                        queuedCount = logQueue.length;
                    } else if (data.type === "stderr") {
                        totalReceived++;
                        logQueue.push({ type: "stderr", data: data.data, timestamp: data.timestamp });
                        queuedCount = logQueue.length;
                    } else if (data.type === "close") {
                        isConnected = false;
                        // Process remaining logs
                        if (logQueue.length > 0) {
                            logs = [...logs, ...logQueue];
                            logQueue = [];
                            queuedCount = 0;
                        }
                        stopBatchProcessor();
                        addToast(`Log streaming completed with exit code: ${data.result?.code || 'unknown'}`, "info");
                        if (eventSource) {
                            eventSource.close();
                        }
                    } else if (data.type === "error") {
                        isConnected = false;
                        isLoading = false;
                        errorMessage = data.error;
                        stopBatchProcessor();
                        addToast(`Error: ${data.error}`, "error");
                        if (eventSource) {
                            eventSource.close();
                        }
                    }
                } catch (parseError) {
                    console.error('Failed to parse SSE event:', parseError, event.data);
                }
            });

            eventSource.onerror = () => {
                isConnected = false;
                isLoading = false;
                stopBatchProcessor();
                if (eventSource?.readyState === EventSource.CLOSED) {
                    errorMessage = "Connection closed by server. You may not have permission to view these logs.";
                    addToast(errorMessage, "error");
                }
            };
        } catch (error) {
            isLoading = false;
            stopBatchProcessor();
            errorMessage = `Failed to connect to logs: ${error}`;
            addToast(errorMessage, "error");
        }
    }

    function togglePause() {
        isPaused = !isPaused;
        if (!isPaused) {
            startBatchProcessor();
        }
    }

    function copyLogs() {
        const text = logs.map((l) => l.data).join("\n");
        navigator.clipboard.writeText(text).then(() => {
            addToast("Logs copied to clipboard", "success");
        });
    }

    function downloadLogs() {
        const text = logs.map((l) => l.data).join("\n");
        const element = document.createElement("a");
        element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
        element.setAttribute("download", `${logConfig.name}-${new Date().toISOString()}.log`);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        addToast("Logs downloaded", "success");
    }

    function closeViewer() {
        // Close the EventSource connection
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        stopBatchProcessor();
        // Dispatch close event to parent component
        dispatch("close");
    }

    onDestroy(() => {
        // Ensure cleanup on component destruction
        if (eventSource) {
            console.log("Closing EventSource connection on component destroy");
            eventSource.close();
            eventSource = null;
        }
        stopBatchProcessor();
    });

    // Connect on mount
    setTimeout(() => {
        connectToLogs();
    }, 100);
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full h-5/6 max-w-4xl mx-4 flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{logConfig.name}</h2>
                <p class="text-gray-600 dark:text-gray-400 text-sm mt-1 font-mono">{logConfig.command}</p>
            </div>
            <button
                on:click={closeViewer}
                class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                title="Close"
            >
                <X size={24} />
            </button>
        </div>

        <!-- Status Bar -->
        <div class="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 flex items-center justify-between">
            <div class="flex items-center gap-6">
                <div class="flex items-center gap-2">
                    <div
                        class="w-3 h-3 rounded-full {isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}"
                    />
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {isConnected ? "● Live" : isLoading ? "⏳ Connecting" : "● Disconnected"}
                    </span>
                </div>

                <div class="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 pl-4">
                    <div class="flex items-center gap-1">
                        <span class="font-semibold text-gray-700 dark:text-gray-300">{logs.length}</span>
                        <span>displayed</span>
                    </div>
                    {#if queuedCount > 0}
                        <div class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Zap size={14} />
                            <span>{queuedCount} queued</span>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="flex items-center gap-1">
                <button
                    on:click={togglePause}
                    class="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title={isPaused ? "Resume" : "Pause"}
                >
                    {#if isPaused}
                        <Play size={18} class="text-blue-600 dark:text-blue-400" />
                    {:else}
                        <Pause size={18} class="text-blue-600 dark:text-blue-400" />
                    {/if}
                </button>
                <button
                    on:click={copyLogs}
                    class="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Copy logs"
                >
                    <Copy size={18} class="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                    on:click={downloadLogs}
                    class="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Download logs"
                >
                    <Download size={18} class="text-gray-600 dark:text-gray-400" />
                </button>
            </div>
        </div>

        <!-- Logs Container -->
        <div
            bind:this={scrollContainer}
            on:scroll={handleContainerScroll}
            class="flex-1 overflow-y-auto bg-gray-900 font-mono text-xs leading-relaxed"
        >
            {#if errorMessage}
                <div class="flex items-center justify-center h-full">
                    <div class="text-center px-6">
                        <div class="text-red-400 text-2xl mb-4">⚠️</div>
                        <p class="text-red-300 text-sm mb-2">Error connecting to logs</p>
                        <p class="text-red-200/70 text-xs">{errorMessage}</p>
                    </div>
                </div>
            {:else if isLoading}
                <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                        <p class="text-gray-400 text-sm">Connecting to log stream...</p>
                    </div>
                </div>
            {:else if logs.length === 0 && !isConnected}
                <div class="flex items-center justify-center h-full">
                    <p class="text-gray-500">No logs received...</p>
                </div>
            {:else}
                <div class="p-3">
                    {#each logs as log, index (log.timestamp)}
                        <div
                            class="hover:bg-gray-800 px-3 py-1 transition-colors {log.type === 'stderr' ? 'text-red-300' : 'text-green-300'}"
                            title={`Line ${index + 1}`}
                        >
                            <span class="select-all">{log.data}</span>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30">
            <div class="flex items-center justify-between">
                <p class="text-xs text-gray-600 dark:text-gray-400">
                    {#if isPaused}
                        <span class="font-medium text-amber-600 dark:text-amber-400">⏸ Paused</span>
                        <span class="ml-2">— Click play to resume receiving logs</span>
                    {:else if isConnected}
                        <span class="font-medium text-green-600 dark:text-green-400">● Streaming</span>
                        <span class="ml-2 text-gray-600 dark:text-gray-400">—</span>
                        <span class="ml-2">{logs.length} displayed / {totalReceived} total</span>
                        {#if queuedCount > 0}
                            <span class="ml-3 text-amber-600 dark:text-amber-400">⚡ {queuedCount} in queue</span>
                        {/if}
                    {:else}
                        <span class="font-medium text-gray-500">● Connection closed</span>
                    {/if}
                </p>
            </div>
        </div>
    </div>
</div>

<style>
    /* Ensure proper scrolling behavior */
    ::-webkit-scrollbar {
        width: 8px;
    }

    ::-webkit-scrollbar-track {
        background: #1f2937;
    }

    ::-webkit-scrollbar-thumb {
        background: #4b5563;
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
    }
</style>
