<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { Play, Check, AlertTriangle, SkipForward, Loader2, ChevronDown, ChevronUp, Copy } from "lucide-svelte";
    import CodeHighlighter from "./CodeHighlighter.svelte";
    import type { Stage } from "$lib/types";
    
    export let stage: Stage;
    export let index: number;
    export let status: "pending" | "running" | "success" | "failed" | "skipped" = "pending";
    export let isExecuting: boolean = false;
    export let onExecute: () => void;
    
    // Color scheme for different stages
    const stageColors = [
        { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-700", text: "text-blue-700 dark:text-blue-300" },
        { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-700", text: "text-emerald-700 dark:text-emerald-300" },
        { bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-700", text: "text-indigo-700 dark:text-indigo-300" },
        { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-700", text: "text-purple-700 dark:text-purple-300" },
        { bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-700", text: "text-rose-700 dark:text-rose-300" },
        { bg: "bg-cyan-50 dark:bg-cyan-900/20", border: "border-cyan-200 dark:border-cyan-700", text: "text-cyan-700 dark:text-cyan-300" }
    ];
    
    // Get color for current stage index
    const colorIndex = index % stageColors.length;
    const colors = stageColors[colorIndex];
    
    // Status indicators
    const statusConfig = {
        pending: { icon: ChevronDown, color: "text-gray-400 dark:text-gray-500", text: "Ready", bg: "bg-gray-100 dark:bg-gray-700" },
        running: { icon: Loader2, color: "text-blue-500 dark:text-blue-400", text: "Running", bg: "bg-blue-100 dark:bg-blue-900/30" },
        success: { icon: Check, color: "text-emerald-500 dark:text-emerald-400", text: "Success", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
        failed: { icon: AlertTriangle, color: "text-red-500 dark:text-red-400", text: "Failed", bg: "bg-red-100 dark:bg-red-900/30" },
        skipped: { icon: SkipForward, color: "text-amber-500 dark:text-amber-400", text: "Skipped", bg: "bg-amber-100 dark:bg-amber-900/30" }
    };
    
    let isExpanded = false;
    let showFullScript = false;
    
    function toggleExpand() {
        isExpanded = !isExpanded;
    }
    
    function handleExecuteStage() {
        if (onExecute) {
            onExecute();
        }
    }
</script>

<div
    class="transition-all duration-300 ease-in-out {colors.bg} {colors.border} border rounded-xl overflow-hidden shadow-sm hover:shadow-md"
    in:fly={{ y: 20, duration: 300, delay: index * 100 }}
>
    <!-- Stage Header -->
    <div class="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full {colors.bg} {colors.text} flex items-center justify-center font-bold text-sm border border-gray-200 dark:border-gray-700">
                {index + 1}
            </div>
            <h3 class="text-lg font-semibold {colors.text}">
                {stage.stageId}
            </h3>
        </div>
        
        <div class="flex items-center space-x-2">
            <!-- Status Indicator -->
            <div class="flex items-center space-x-2 px-3 py-1 rounded-full {statusConfig[status].bg} text-sm font-medium">
                <div class={"inline-block " + statusConfig[status].color + (status === 'running' ? ' animate-spin' : '')}>
                    <svelte:component
                        this={statusConfig[status].icon}
                        size={14}
                    />
                </div>
                <span class={statusConfig[status].color}>{statusConfig[status].text}</span>
            </div>
            
            <!-- Expand/Collapse Button -->
            <button
                class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                on:click={toggleExpand}
                title={isExpanded ? "Collapse" : "Expand"}
            >
                {#if isExpanded}
                    <ChevronUp size={18} class="text-gray-600 dark:text-gray-400" />
                {:else}
                    <ChevronDown size={18} class="text-gray-600 dark:text-gray-400" />
                {/if}
            </button>
        </div>
    </div>
    
    <!-- Expanded Content -->
    {#if isExpanded}
        <div class="p-4 space-y-4">
            <!-- Script Section -->
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <h4 class="font-medium text-gray-700 dark:text-gray-300 flex items-center">
                        <span class="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 mr-2 mt-1"></span>
                        Script
                    </h4>
                </div>
                
                <CodeHighlighter
                    code={stage.script}
                    language="bash"
                    showLineNumbers={true}
                    isExpanded={showFullScript}
                />
            </div>
            
            <!-- Action Buttons -->
            <div class="flex justify-end space-x-2 pt-2">
                <button
                    class="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center"
                    disabled={isExecuting}
                >
                    <Copy size={14} class="mr-1" />
                    Copy Script
                </button>
                
                <button
                    class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition-colors text-sm font-medium flex items-center"
                    on:click={handleExecuteStage}
                    disabled={isExecuting || status === 'running'}
                >
                    {#if isExecuting}
                        <Loader2 size={14} class="mr-1 animate-spin" />
                        Executing...
                    {:else}
                        <Play size={14} class="mr-1" />
                        Execute Stage
                    {/if}
                </button>
            </div>
        </div>
    {/if}
    
    <!-- Collapsed Preview -->
    {#if !isExpanded}
        <div class="p-4">
            <div class="flex items-start space-x-3">
                <div class="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center mt-1">
                    <span class="text-gray-600 dark:text-gray-400 font-mono text-xs">#</span>
                </div>
                <div class="flex-1">
                    <pre class="text-sm font-mono text-gray-700 dark:text-gray-300 overflow-hidden whitespace-pre-wrap">{stage.script.split('\n')[0] || ''}</pre>
                    {#if stage.script.split('\n').length > 1}
                        <button
                            class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mt-1"
                            on:click={toggleExpand}
                        >
                            +{stage.script.split('\n').length - 1} more lines
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Custom animations for status indicators */
    .animate-pulse-slow {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    
    /* Ensure smooth transitions */
    .transition-all {
        transition-property: all;
    }
    
    /* Custom scrollbar for stage cards */
    pre {
        scrollbar-width: thin;
        scrollbar-color: #9ca3af #f3f4f6;
    }
    
    pre::-webkit-scrollbar {
        height: 6px;
    }
    
    pre::-webkit-scrollbar-track {
        background: #f3f4f6;
    }
    
    pre::-webkit-scrollbar-thumb {
        background: #9ca3af;
        border-radius: 3px;
    }
</style>