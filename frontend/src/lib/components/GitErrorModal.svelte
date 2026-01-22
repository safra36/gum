<script lang="ts">
    import { AlertTriangle, Info, GitBranch, GitPullRequest, Copy, X } from "lucide-svelte";
    
    export let show: boolean = false;
    export let errorTitle: string = "Git Operation Failed";
    export let errorMessage: string = "";
    export let onClose: () => void;
    export let onRetry: () => void;
    
    let showDetails: boolean = false;
    let showCopySuccess: boolean = false;
    
    function toggleDetails() {
        showDetails = !showDetails;
    }
    
    async function copyErrorToClipboard() {
        try {
            await navigator.clipboard.writeText(errorMessage);
            showCopySuccess = true;
            setTimeout(() => showCopySuccess = false, 2000);
        } catch (err) {
            console.error('Failed to copy error:', err);
        }
    }
    
    function parseGitError(message: string): { summary: string, suggestions: string[] } {
        const suggestions: string[] = [];
        
        // Extract common Git error patterns and suggestions
        if (message.includes("failed to push some refs") && message.includes("Updates were rejected")) {
            suggestions.push("Your local branch is behind the remote. Try pulling the latest changes first.");
        }
        
        if (message.includes("hint: Updates were rejected")) {
            suggestions.push("git pull --rebase");
        }
        
        if (message.includes("hint: not have locally")) {
            suggestions.push("git fetch origin");
        }
        
        // Create a summary
        const summary = message.split('\n')[0] || "Git operation failed";
        
        return { summary, suggestions };
    }
    
    const { summary, suggestions } = parseGitError(errorMessage);
</script>

{#if show}
    <div class="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" on:click={onClose}>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl border border-gray-200 dark:border-gray-700" on:click|stopPropagation>
            <!-- Modal Header -->
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center">
                    <AlertTriangle class="text-red-500 dark:text-red-400 mr-3" size={24} />
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{errorTitle}</h2>
                </div>
                <button 
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    on:click={onClose}
                    aria-label="Close modal"
                >
                    <X size={24} />
                </button>
            </div>
            
            <!-- Error Summary -->
            <div class="mb-6">
                <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 rounded-lg">
                    <p class="text-red-700 dark:text-red-300 font-medium">{summary}</p>
                </div>
            </div>
            
            <!-- Suggestions Section -->
            {#if suggestions.length > 0}
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                        <Info class="mr-2 text-blue-500 dark:text-blue-400" size={20} />
                        Suggested Solutions
                    </h3>
                    <div class="space-y-3">
                        {#each suggestions as suggestion, i}
                            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 rounded-lg flex items-center justify-between">
                                <div class="flex items-center">
                                    <GitBranch class="mr-3 text-blue-500 dark:text-blue-400" size={18} />
                                    <code class="font-mono text-blue-700 dark:text-blue-300 text-sm">{suggestion}</code>
                                </div>
                                <button 
                                    class="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                                    on:click={() => copyErrorToClipboard()}
                                    title="Copy command"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
            
            <!-- Detailed Error Section (Collapsible) -->
            <div class="mb-6">
                <button 
                    class="w-full flex items-center justify-between text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    on:click={toggleDetails}
                >
                    <span class="flex items-center">
                        <Info class="mr-2 text-gray-500 dark:text-gray-400" size={20} />
                        <span class="font-medium">Technical Details</span>
                    </span>
                    <span class="transform transition-transform duration-200">
                        {#if showDetails}
                            ▲
                        {:else}
                            ▼
                        {/if}
                    </span>
                </button>
                
                {#if showDetails}
                    <div class="mt-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 relative">
                        <pre class="text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">{errorMessage}</pre>
                        <button 
                            class="absolute top-2 right-2 bg-white dark:bg-gray-600 p-1 rounded-md shadow-sm"
                            on:click={copyErrorToClipboard}
                            title="Copy error details"
                        >
                            {#if showCopySuccess}
                                <span class="text-green-500 text-xs">Copied!</span>
                            {:else}
                                <Copy size={16} class="text-gray-600 dark:text-gray-300" />
                            {/if}
                        </button>
                    </div>
                {/if}
            </div>
            
            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-3 justify-end">
                <button 
                    class="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200 font-medium"
                    on:click={onClose}
                >
                    Close
                </button>
                <button 
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center justify-center"
                    on:click={() => { onRetry(); onClose(); }}
                >
                    <GitPullRequest class="mr-2" size={18} />
                    Try Again
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Custom scrollbar for error details */
    pre::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    
    pre::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }
    
    pre::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 10px;
    }
    
    pre::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
    }
    
    /* Dark mode scrollbar */
    .dark pre::-webkit-scrollbar-track {
        background: #374151;
    }
    
    .dark pre::-webkit-scrollbar-thumb {
        background: #4b5563;
    }
    
    .dark pre::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
    }
</style>