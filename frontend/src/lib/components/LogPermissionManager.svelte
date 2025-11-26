<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { X, Plus, Trash2 } from "lucide-svelte";
    import { addToast } from "$lib/stores/toast";
    import type { LogConfig, LogPermissionType } from "$lib/types";
    import { getLogPermissions, setLogPermission } from "$lib/services/api";

    export let projectId: number;
    export let logConfigs: LogConfig[] = [];

    const dispatch = createEventDispatcher<{ close: void }>();

    interface User {
        id: number;
        username: string;
    }

    interface PermissionRow {
        userId: number;
        username: string;
        logConfigId?: number;
        logConfigName?: string;
        permissions: LogPermissionType[];
    }

    let users: User[] = [];
    let permissions: PermissionRow[] = [];
    let isLoading = false;

    const availablePermissions: { value: LogPermissionType; label: string }[] = [
        { value: "view_logs", label: "View Logs" },
        { value: "configure_logs", label: "Configure Logs" },
        { value: "manage_log_permissions", label: "Manage Permissions" }
    ];

    onMount(async () => {
        await loadPermissions();
    });

    async function loadPermissions() {
        isLoading = true;
        try {
            const result = await getLogPermissions(projectId);
            permissions = result.permissions.map((p: any) => ({
                userId: p.userId,
                username: p.user?.username || `User ${p.userId}`,
                logConfigId: p.logConfigId,
                logConfigName: p.logConfig?.name || "Project Default",
                permissions: p.permissions
            }));
        } catch (error) {
            addToast(`Failed to load permissions: ${error}`, "error");
        } finally {
            isLoading = false;
        }
    }

    function togglePermission(
        rowIndex: number,
        permission: LogPermissionType,
        isChecked: boolean
    ) {
        const row = permissions[rowIndex];
        if (isChecked) {
            if (!row.permissions.includes(permission)) {
                row.permissions = [...row.permissions, permission];
            }
        } else {
            row.permissions = row.permissions.filter((p) => p !== permission);
        }
        permissions = permissions;
    }

    async function savePermission(rowIndex: number) {
        const row = permissions[rowIndex];
        try {
            await setLogPermission(
                projectId,
                row.userId,
                row.logConfigId || null,
                row.permissions
            );
            addToast("Permission updated successfully", "success");
        } catch (error) {
            addToast(`Failed to save permission: ${error}`, "error");
            await loadPermissions();
        }
    }

    function deletePermission(rowIndex: number) {
        if (confirm("Are you sure you want to revoke these permissions?")) {
            const row = permissions[rowIndex];
            permissions = permissions.filter((_, i) => i !== rowIndex);
            // In a real app, you'd call an API to delete the permission
        }
    }

    function handleClose() {
        dispatch("close");
    }
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl mx-4 my-8">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Manage Log Permissions</h2>
            <button
                on:click={handleClose}
                class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
                <X size={24} />
            </button>
        </div>

        <!-- Content -->
        <div class="p-6">
            <div class="mb-6">
                <p class="text-gray-600 dark:text-gray-400 mb-4">
                    Manage who can view and configure log streams for this project.
                </p>
            </div>

            {#if isLoading}
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="text-gray-600 dark:text-gray-400 mt-2">Loading permissions...</p>
                </div>
            {:else if permissions.length === 0}
                <div class="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p class="text-gray-600 dark:text-gray-400">No permissions configured yet.</p>
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th class="px-4 py-3 text-left">User</th>
                                <th class="px-4 py-3 text-left">Target</th>
                                {#each availablePermissions as perm}
                                    <th class="px-4 py-3 text-center text-xs">{perm.label}</th>
                                {/each}
                                <th class="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each permissions as row, rowIndex (rowIndex)}
                                <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        {row.username}
                                    </td>
                                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                                        {row.logConfigName}
                                    </td>
                                    {#each availablePermissions as perm}
                                        <td class="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={row.permissions.includes(perm.value)}
                                                on:change={(e) =>
                                                    togglePermission(rowIndex, perm.value, e.currentTarget.checked)}
                                                class="w-4 h-4 rounded border-gray-300"
                                            />
                                        </td>
                                    {/each}
                                    <td class="px-4 py-3 text-center">
                                        <div class="flex items-center justify-center gap-2">
                                            <button
                                                on:click={() => savePermission(rowIndex)}
                                                class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                on:click={() => deletePermission(rowIndex)}
                                                class="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
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

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
                on:click={handleClose}
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
                Close
            </button>
        </div>
    </div>
</div>

<style>
    /* Modal styles */
</style>
