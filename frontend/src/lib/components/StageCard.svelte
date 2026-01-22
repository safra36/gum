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
        { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-300 dark:border-blue-600", text: "text-blue-700 dark:text-blue-300", badge: "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300" },
        { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-300 dark:border-emerald-600", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300" },
        { bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-300 dark:border-indigo-600", text: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300" },
        { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-300 dark:border-purple-600", text: "text-purple-700 dark:text-purple-300", badge: "bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300" },
        { bg: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-300 dark:border-rose-600", text: "text-rose-700 dark:text-rose-300", badge: "bg-rose-100 dark:bg-rose-800 text-rose-700 dark:text-rose-300" },
        { bg: "bg-cyan-50 dark:bg-cyan-900/20", border: "border-cyan-300 dark:border-cyan-600", text: "text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300" }
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
    
    let isExpanded = true;
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
    class="transition-all duration-300 ease-in-out {colors.bg} {colors.border} border-2 rounded-lg overflow-hidden shadow-md hover:shadow-lg"
>
    <!-- Stage Header -->
    <div class="flex justify-between items-center p-4 border-b-2 {colors.border}">
        <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-lg {colors.badge} flex items-center justify-center font-bold text-lg">
                {index + 1}
            </div>
            <h3 class="text-lg font-bold {colors.text}">
                {stage.stageId}
            </h3>
        </div>
        
        <div class="flex items-center space-x-2">
            <!-- Status Indicator -->
            <div class="flex items-center space-x-2 px-3 py-1 rounded-full {statusConfig[status].bg} text-sm font-medium">
                <div class={"inline-flex " + (status === 'running' ? 'animate-spin' : '')}>
                    <svelte:component
                        this={statusConfig[status].icon}
                        size={14}
                        class={statusConfig[status].color}
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
                    <ChevronUp size={20} class="text-gray-600 dark:text-gray-400" />
                {:else}
                    <ChevronDown size={20} class="text-gray-600 dark:text-gray-400" />
                {/if}
            </button>
        </div>
    </div>
    
    <!-- Expanded Content -->
    {#if isExpanded}
        <div class="p-4 space-y-4 bg-gray-50 dark:bg-gray-900/30">
            <!-- Script Section -->
            <div class="space-y-2">
                <h4 class="font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                    <span class="w-2 h-2 rounded-full {colors.text} mr-2"></span>
                    Script
                </h4>
                
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
                    class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium flex items-center space-x-1"
                    disabled={isExecuting}
                >
                    <Copy size={16} />
                    <span>Copy</span>
                </button>
                
                <button
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors font-medium flex items-center space-x-1"
                    on:click={handleExecuteStage}
                    disabled={isExecuting || status === 'running'}
                >
                    {#if isExecuting}
                        <div class="inline-flex animate-spin">
                            <Loader2 size={16} />
                        </div>
                        <span>Executing...</span>
                    {:else}
                        <Play size={16} />
                        <span>Execute</span>
                    {/if}
                </button>
            </div>
        </div>
    {:else}
        <!-- Collapsed Preview -->
        <div class="p-4">
            <div class="flex items-start space-x-3">
                <div class="text-gray-400 dark:text-gray-500 font-mono text-sm mt-1">#</div>
                <div class="flex-1 min-w-0">
                    <pre class="text-sm font-mono text-gray-700 dark:text-gray-300 overflow-hidden whitespace-pre-wrap break-words">{stage.script.split('\n')[0] || ''}</pre>
                    {#if stage.script.split('\n').length > 1}
                        <button
                            class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mt-2"
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
    /* Smooth transitions */
    .transition-all {
        transition-property: all;
    }
</style>