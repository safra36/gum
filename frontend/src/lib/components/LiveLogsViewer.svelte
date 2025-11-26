<script lang="ts">
    import { onDestroy } from "svelte";
    import { X, Pause, Play, Download, Copy } from "lucide-svelte";
    import { addToast } from "$lib/stores/toast";
    import type { LogConfig } from "$lib/types";
    import { streamLogs } from "$lib/services/api";

    export let logConfig: LogConfig;
    export let projectId: number;

    let eventSource: EventSource | null = null;
    let logs: Array<{ type: "stdout" | "stderr"; data: string; timestamp: number }> = [];
    let isPaused = false;
    let isConnected = false;
    let isLoading = true;
    let scrollContainer: HTMLDivElement;

    function connectToLogs() {
        isLoading = true;
        isConnected = false;
        logs = [];

        try {
            eventSource = streamLogs(projectId, logConfig.id);

            eventSource.addEventListener("message", (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === "connected") {
                        isConnected = true;
                        isLoading = false;
                        addToast("Connected to log stream", "success");
                    } else if (data.type === "stdout") {
                        if (!isPaused) {
                            logs = [...logs, { type: "stdout", data: data.data, timestamp: data.timestamp }];
                            scrollToBottom();
                        }
                    } else if (data.type === "stderr") {
                        if (!isPaused) {
                            logs = [...logs, { type: "stderr", data: data.data, timestamp: data.timestamp }];
                            scrollToBottom();
                        }
                    } else if (data.type === "close") {
                        isConnected = false;
                        addToast(`Log streaming completed with exit code: ${data.result?.code || 'unknown'}`, "info");
                        if (eventSource) {
                            eventSource.close();
                        }
                    } else if (data.type === "error") {
                        isConnected = false;
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
                if (eventSource?.readyState === EventSource.CLOSED) {
                    addToast("Connection closed", "info");
                }
            };
        } catch (error) {
            addToast(`Failed to connect to logs: ${error}`, "error");
            isLoading = false;
        }
    }

    function scrollToBottom() {
        if (scrollContainer) {
            setTimeout(() => {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }, 0);
        }
    }

    function togglePause() {
        isPaused = !isPaused;
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

    onDestroy(() => {
        if (eventSource) {
            eventSource.close();
        }
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
            <a href="#close" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={24} />
            </a>
        </div>

        <!-- Status Bar -->
        <div class="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                    <div
                        class="w-2 h-2 rounded-full {isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}"
                    />
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isConnected ? "Connected" : isLoading ? "Connecting..." : "Disconnected"}
                    </span>
                </div>
                <span class="text-sm text-gray-600 dark:text-gray-400">{logs.length} lines</span>
            </div>

            <div class="flex items-center gap-2">
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
                    title="Copy"
                >
                    <Copy size={18} class="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                    on:click={downloadLogs}
                    class="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Download"
                >
                    <Download size={18} class="text-gray-600 dark:text-gray-400" />
                </button>
            </div>
        </div>

        <!-- Logs Container -->
        <div
            bind:this={scrollContainer}
            class="flex-1 overflow-y-auto p-4 bg-gray-900 font-mono text-sm text-gray-100"
        >
            {#if isLoading}
                <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                        <p class="text-gray-400">Connecting to log stream...</p>
                    </div>
                </div>
            {:else if logs.length === 0}
                <div class="flex items-center justify-center h-full">
                    <p class="text-gray-500">No logs received yet...</p>
                </div>
            {:else}
                <div class="space-y-0">
                    {#each logs as log (log.timestamp)}
                        <div class="hover:bg-gray-800 px-2 py-0.5">
                            <span class={log.type === "stderr" ? "text-red-400" : "text-green-400"}>
                                {log.data}
                            </span>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <p class="text-xs text-gray-600 dark:text-gray-400">
                {#if isPaused}
                    <span class="font-medium">Paused</span> - Click play to resume receiving logs
                {:else if isConnected}
                    Streaming live logs... ({logs.length} lines received)
                {:else}
                    Connection closed
                {/if}
            </p>
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
