<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { X } from "lucide-svelte";
    import type { LogConfig } from "$lib/types";

    export let config: LogConfig | null = null;
    export let isLoading: boolean = false;

    const dispatch = createEventDispatcher<{
        save: LogConfig;
        cancel: void;
    }>();

    let formData = {
        name: config?.name || "",
        command: config?.command || "",
        description: config?.description || "",
        enabled: config?.enabled ?? true,
        workingDir: config?.workingDir || ""
    };

    let errors: { [key: string]: string } = {};

    function validateForm(): boolean {
        errors = {};
        if (!formData.name.trim()) {
            errors.name = "Name is required";
        }
        if (!formData.command.trim()) {
            errors.command = "Command is required";
        }
        return Object.keys(errors).length === 0;
    }

    function handleSubmit() {
        if (!validateForm()) return;

        const logConfig: LogConfig = {
            id: config?.id || 0,
            name: formData.name,
            command: formData.command,
            description: formData.description,
            enabled: formData.enabled,
            workingDir: formData.workingDir,
            projectId: config?.projectId || 0
        };

        dispatch("save", logConfig);
    }

    function handleCancel() {
        dispatch("cancel");
    }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                {config ? "Edit Log Configuration" : "Create Log Configuration"}
            </h2>
            <button
                on:click={handleCancel}
                class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
                <X size={24} />
            </button>
        </div>

        <div class="p-6 space-y-6">
            <!-- Name Field -->
            <div>
                <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                </label>
                <input
                    id="name"
                    type="text"
                    bind:value={formData.name}
                    placeholder="e.g., App Logs, Database Logs"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
                {#if errors.name}
                    <p class="text-red-500 text-sm mt-1">{errors.name}</p>
                {/if}
            </div>

            <!-- Command Field -->
            <div>
                <label for="command" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Command *
                </label>
                <input
                    id="command"
                    type="text"
                    bind:value={formData.command}
                    placeholder="e.g., docker compose logs -f --tail 100"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                />
                {#if errors.command}
                    <p class="text-red-500 text-sm mt-1">{errors.command}</p>
                {/if}
                <p class="text-gray-500 dark:text-gray-400 text-xs mt-2">
                    The command to execute. Use # for variable substitution.
                </p>
            </div>

            <!-- Description Field -->
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                </label>
                <textarea
                    id="description"
                    bind:value={formData.description}
                    placeholder="Optional description of what this log configuration does"
                    rows="3"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                />
            </div>

            <!-- Working Directory Field -->
            <div>
                <label for="workingDir" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Working Directory (optional)
                </label>
                <input
                    id="workingDir"
                    type="text"
                    bind:value={formData.workingDir}
                    placeholder="Leave empty to use project directory"
                    class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                />
                <p class="text-gray-500 dark:text-gray-400 text-xs mt-2">
                    Override the project's working directory for this command.
                </p>
            </div>

            <!-- Enabled Toggle -->
            <div class="flex items-center">
                <input
                    id="enabled"
                    type="checkbox"
                    bind:checked={formData.enabled}
                    class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label for="enabled" class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable this log configuration
                </label>
            </div>
        </div>

        <!-- Form Actions -->
        <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
                on:click={handleCancel}
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
                Cancel
            </button>
            <button
                on:click={handleSubmit}
                disabled={isLoading}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {#if isLoading}
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {/if}
                {config ? "Update" : "Create"} Configuration
            </button>
        </div>
    </div>
</div>

<style>
    /* Modal overlay styles */
</style>
