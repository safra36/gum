<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import { Eye, Edit2, Trash2, Plus } from "lucide-svelte";
    import type { LogConfig } from "$lib/types";

    export let logConfigs: LogConfig[] = [];
    export let isLoading: boolean = false;

    const dispatch = createEventDispatcher<{
        viewLogs: LogConfig;
        editConfig: LogConfig;
        deleteConfig: LogConfig;
        createNew: void;
    }>();

    function handleViewLogs(config: LogConfig) {
        dispatch("viewLogs", config);
    }

    function handleEditConfig(config: LogConfig) {
        dispatch("editConfig", config);
    }

    function handleDeleteConfig(config: LogConfig) {
        if (confirm(`Are you sure you want to delete log config "${config.name}"?`)) {
            dispatch("deleteConfig", config);
        }
    }

    function handleCreateNew() {
        dispatch("createNew");
    }
</script>

<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
    <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Log Configurations</h2>
        <button
            on:click={handleCreateNew}
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
            <Plus size={18} />
            Add Log Config
        </button>
    </div>

    {#if isLoading}
        <div class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p class="text-gray-600 dark:text-gray-400 mt-2">Loading configurations...</p>
        </div>
    {:else if logConfigs.length === 0}
        <p class="text-gray-500 dark:text-gray-400 text-center py-8">
            No log configurations yet. Create one to get started!
        </p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th class="px-4 py-3">Name</th>
                        <th class="px-4 py-3">Command</th>
                        <th class="px-4 py-3">Status</th>
                        <th class="px-4 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each logConfigs as config (config.id)}
                        <tr
                            in:fade={{duration: 300}}
                            class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{config.name}</td>
                            <td class="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs truncate">{config.command}</td>
                            <td class="px-4 py-3">
                                <span
                                    class="inline-flex px-3 py-1 rounded-full text-xs font-medium {config.enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}"
                                >
                                    {config.enabled ? "Enabled" : "Disabled"}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2">
                                    <button
                                        on:click={() => handleViewLogs(config)}
                                        class="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                                        title="View Logs"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        on:click={() => handleEditConfig(config)}
                                        class="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        on:click={() => handleDeleteConfig(config)}
                                        class="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    /* Responsive table scrolling */
    @media (max-width: 768px) {
        table {
            display: block;
            overflow-x: auto;
        }
    }
</style>
