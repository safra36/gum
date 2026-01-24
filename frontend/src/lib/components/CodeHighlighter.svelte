<script lang="ts">
    import { onMount } from "svelte";
    import { Copy, Check } from "lucide-svelte";
    
    export let code: string = "";
    export let language: string = "bash";
    export let showLineNumbers: boolean = true;
    export let isExpanded: boolean = false;
    
    let copied: boolean = false;
    let copyTimeout: ReturnType<typeof setTimeout>;
    
    // Function to decode HTML entities
    function decodeHtmlEntities(text: string): string {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }
    
    function copyToClipboard() {
        navigator.clipboard.writeText(code).then(() => {
            copied = true;
            copyTimeout = setTimeout(() => {
                copied = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }
    
    onMount(() => {
        return () => {
            if (copyTimeout) clearTimeout(copyTimeout);
        };
    });
</script>

<div class="relative">
    <div class="bg-gray-900 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-700 dark:border-gray-600">
        <div class="flex justify-between items-center p-2 bg-gray-800 dark:bg-gray-700 border-b border-gray-700 dark:border-gray-600">
            <div class="flex items-center space-x-2">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                <span class="text-sm font-mono text-gray-300 dark:text-gray-200">{language.toUpperCase()}</span>
            </div>
            <button
                class="p-1 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                on:click={copyToClipboard}
                title="Copy to clipboard"
            >
                {#if copied}
                    <Check size={16} class="text-green-400" />
                {:else}
                    <Copy size={16} class="text-gray-400 dark:text-gray-300" />
                {/if}
            </button>
        </div>
        
        <div class="p-3 font-mono text-sm overflow-x-auto bg-gray-950 text-gray-100 max-h-96">
            <div class="whitespace-pre">
                {#if isExpanded || code.split('\n').length <= 10}
                    {#each code.split('\n') as line, lineNum}
                        <div class="flex">
                            <span class="w-8 text-right pr-3 select-none text-gray-500">{lineNum + 1}</span>
                            <span class="flex-1">{@html decodeHtmlEntities(line)}</span>
                        </div>
                    {/each}
                {:else}
                    {#each code.split('\n').slice(0, 10) as line, lineNum}
                        <div class="flex">
                            <span class="w-8 text-right pr-3 select-none text-gray-500">{lineNum + 1}</span>
                            <span class="flex-1">{@html decodeHtmlEntities(line)}</span>
                        </div>
                    {/each}
                    <div class="mt-2 text-center">
                        <button
                            class="text-blue-400 hover:text-blue-300 text-sm font-medium"
                            on:click={() => isExpanded = true}
                        >
                            Show more ({code.split('\n').length - 10} lines hidden)
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    /* Custom scrollbar for code blocks */
    div[class*="overflow-x-auto"] {
        scrollbar-width: thin;
        scrollbar-color: #4b5563 #1f2937;
    }
    
    div[class*="overflow-x-auto"]::-webkit-scrollbar {
        height: 8px;
    }
    
    div[class*="overflow-x-auto"]::-webkit-scrollbar-track {
        background: #1f2937;
    }
    
    div[class*="overflow-x-auto"]::-webkit-scrollbar-thumb {
        background: #4b5563;
        border-radius: 4px;
    }
    
    div[class*="overflow-x-auto"]::-webkit-scrollbar-thumb:hover {
        background: #6b7280;
    }
</style>