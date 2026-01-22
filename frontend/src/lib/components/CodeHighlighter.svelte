<script lang="ts">
    import { onMount } from "svelte";
    import { Copy, Check } from "lucide-svelte";
    
    export let code: string = "";
    export let language: string = "bash";
    export let showLineNumbers: boolean = true;
    export let isExpanded: boolean = false;
    
    let highlightedCode: string = "";
    let copied: boolean = false;
    let copyTimeout: ReturnType<typeof setTimeout>;
    
    // Color scheme for bash/shell syntax highlighting
    const colorScheme = {
        keyword: "text-blue-600 dark:text-blue-400",
        string: "text-green-600 dark:text-green-400",
        comment: "text-gray-500 dark:text-gray-400",
        variable: "text-purple-600 dark:text-purple-400",
        function: "text-yellow-600 dark:text-yellow-400",
        number: "text-orange-600 dark:text-orange-400",
        command: "text-cyan-600 dark:text-cyan-400",
        error: "text-red-600 dark:text-red-400"
    };
    
    // Bash/shell syntax patterns
    const syntaxPatterns = [
        // Comments
        { pattern: /#.*$/gm, class: colorScheme.comment },
        
        // Strings (single and double quotes)
        { pattern: /'(?:\\.|[^'\\])*'/g, class: colorScheme.string },
        { pattern: /"(?:\\.|[^"\\])*"/g, class: colorScheme.string },
        
        // Keywords
        { pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|echo|export|source|exit|set|unset|shift|break|continue|true|false)\b/g, class: colorScheme.keyword },
        
        // Variables
        { pattern: /\$\w+/g, class: colorScheme.variable },
        { pattern: /\$\{[^}]+\}/g, class: colorScheme.variable },
        
        // Functions
        { pattern: /\w+\s*\(\)\s*\{/g, class: colorScheme.function },
        
        // Numbers
        { pattern: /\b\d+\b/g, class: colorScheme.number },
        
        // Common commands (first word of line)
        { pattern: /^\s*(cd|ls|mkdir|rm|cp|mv|cat|grep|find|sed|awk|chmod|chown|sudo|apt|yum|npm|yarn|docker|git|echo|printf|test|\w+)/gm, class: colorScheme.command }
    ];
    
    function highlightSyntax(rawCode: string): string {
        if (!rawCode) return "";
        
        let html = escapeHtml(rawCode);
        
        // Apply syntax patterns
        syntaxPatterns.forEach(({ pattern, class: className }) => {
            html = html.replace(pattern, (match) => {
                return `<span class="${className}">${escapeHtml(match)}</span>`;
            });
        });
        
        // Add line numbers
        if (showLineNumbers) {
            const lines = html.split('\n');
            html = lines.map((line, index) => {
                const lineNumber = index + 1;
                return `<div class="flex">
                    <span class="w-8 text-right pr-3 select-none text-gray-400 dark:text-gray-500">${lineNumber}</span>
                    <span class="flex-1">${line}</span>
                </div>`;
            }).join('');
        }
        
        return html;
    }
    
    function escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
    
    // Update highlighted code when input changes
    $: {
        highlightedCode = highlightSyntax(code);
    }
    
    // Clean up timeout on unmount
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
        
        <div class="p-3 font-mono text-sm overflow-x-auto">
            {#if isExpanded || code.split('\n').length <= 10}
                {@html highlightedCode}
            {:else}
                {@html highlightedCode.split('\n').slice(0, 10).join('\n')}
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

<style>
    /* Ensure proper monospace font */
    :global(body) {
        --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
    }
    
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