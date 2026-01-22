<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { Play, RefreshCw, LayoutGrid, List } from "lucide-svelte";
    import StageCard from "./StageCard.svelte";
    import type { Stage } from "$lib/types";
    
    export let stages: Stage[] = [];
    export let onExecuteAll: () => void = () => {};
    export let isExecutingAll: boolean = false;
    
    // Enhanced stage with status tracking
    interface EnhancedStage extends Stage {
        status: "pending" | "running" | "success" | "failed" | "skipped";
        isExecuting: boolean;
    }
    
    let enhancedStages: EnhancedStage[] = [];
    let viewMode: "grid" | "list" = "grid";
    let showControls: boolean = true;
    
    // Initialize enhanced stages
    $: {
        enhancedStages = stages.map((stage, index) => ({
            ...stage,
            status: "pending" as const,
            isExecuting: false
        }));
    }
    
    function executeStage(index: number) {
        enhancedStages = enhancedStages.map((stage, i) => {
            if (i === index) {
                return { ...stage, status: "running", isExecuting: true };
            }
            return stage;
        });
        
        // Simulate execution (in real app, this would call API)
        setTimeout(() => {
            enhancedStages = enhancedStages.map((stage, i) => {
                if (i === index) {
                    // Random success/failure for demo
                    const success = Math.random() > 0.2;
                    return { 
                        ...stage, 
                        status: success ? "success" : "failed", 
                        isExecuting: false 
                    };
                }
                return stage;
            });
        }, 2000);
    }
    
    function executeAllStages() {
        if (onExecuteAll) {
            onExecuteAll();
        }
        
        // Update all stages to running
        enhancedStages = enhancedStages.map(stage => ({
            ...stage,
            status: "running",
            isExecuting: true
        }));
        
        // Simulate sequential execution
        enhancedStages.forEach((_, index) => {
            setTimeout(() => {
                enhancedStages = enhancedStages.map((stage, i) => {
                    if (i === index) {
                        const success = Math.random() > 0.1;
                        return { 
                            ...stage, 
                            status: success ? "success" : "failed", 
                            isExecuting: false 
                        };
                    }
                    return stage;
                });
            }, (index + 1) * 1500);
        });
    }
    
    function toggleViewMode() {
        viewMode = viewMode === "grid" ? "list" : "grid";
    }
    
    function resetAllStatuses() {
        enhancedStages = enhancedStages.map(stage => ({
            ...stage,
            status: "pending",
            isExecuting: false
        }));
    }
</script>

<div class="mt-4">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
            <LayoutGrid class="mr-2 text-blue-500 dark:text-blue-400" size={24} />
            Stages ({stages.length})
        </h3>
        
        {#if showControls && stages.length > 0}
            <div class="flex items-center space-x-2 flex-wrap gap-2">
                <!-- View Mode Toggle -->
                <button
                    class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    on:click={toggleViewMode}
                    title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
                >
                    {#if viewMode === "grid"}
                        <List size={18} class="text-gray-600 dark:text-gray-400" />
                    {:else}
                        <LayoutGrid size={18} class="text-gray-600 dark:text-gray-400" />
                    {/if}
                </button>
                
                <!-- Execute All Button -->
                <button
                    class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 flex items-center disabled:bg-blue-300"
                    on:click={executeAllStages}
                    disabled={isExecutingAll || enhancedStages.some(s => s.isExecuting)}
                >
                    {#if isExecutingAll}
                        <RefreshCw size={18} class="mr-2 animate-spin" />
                        Executing All...
                    {:else}
                        <Play size={18} class="mr-2" />
                        Execute All Stages
                    {/if}
                </button>
                
                <!-- Reset Statuses Button -->
                <button
                    class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-lg transition-colors duration-200 flex items-center"
                    on:click={resetAllStatuses}
                    disabled={enhancedStages.every(s => s.status === "pending")}
                >
                    <RefreshCw size={18} class="mr-2" />
                    Reset Statuses
                </button>
            </div>
        {/if}
    </div>
    
    {#if stages.length === 0}
        <div class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
            <p class="text-gray-500 dark:text-gray-400">No stages defined for this project.</p>
        </div>
    {:else}
        <!-- Horizontal View -->
        {#if viewMode === "grid"}
            <div
                class="flex flex-nowrap overflow-x-auto gap-4 pb-4"
                in:fade={{ duration: 300 }}
            >
                {#each enhancedStages as stage, index}
                    <div class="flex-shrink-0 w-96" in:fly={{ y: 20, duration: 300, delay: index * 50 }}>
                        <StageCard
                            {stage}
                            index={index}
                            status={stage.status}
                            isExecuting={stage.isExecuting}
                            onExecute={() => executeStage(index)}
                        />
                    </div>
                {/each}
            </div>
        {:else}
            <!-- List View -->
            <div class="space-y-4" in:fade={{ duration: 300 }}>
                {#each enhancedStages as stage, index}
                    <div class="transition-all duration-200 hover:scale-[1.01]" in:fly={{ y: 10, duration: 300, delay: index * 50 }}>
                        <StageCard
                            {stage}
                            index={index}
                            status={stage.status}
                            isExecuting={stage.isExecuting}
                            onExecute={() => executeStage(index)}
                        />
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<style>
    /* Custom animations */
    .animate-spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    /* Responsive grid adjustments */
    @media (max-width: 768px) {
        .grid.md\:grid-cols-2 {
            grid-template-columns: 1fr;
        }
    }
    
    /* Smooth transitions */
    .transition-all {
        transition-property: all;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Hover effects */
    .hover\:scale-\[1\.01\]:hover {
        transform: scale(1.01);
    }
</style>