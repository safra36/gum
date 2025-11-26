<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { X, Plus, Trash2, Check } from "lucide-svelte";
    import { addToast } from "$lib/stores/toast";
    import type { LogConfig, LogPermissionType } from "$lib/types";
    import { getLogPermissions, setLogPermission, getUsers } from "$lib/services/api";

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
    let isSavingNewPermission = false;

    // Form state for adding new permissions
    let selectedUserId: number | null = null;
    let selectedLogConfigId: number | null = null;
    let selectedPermissions: LogPermissionType[] = [];

    const availablePermissions: { value: LogPermissionType; label: string }[] = [
        { value: "view_logs", label: "View Logs" },
        { value: "configure_logs", label: "Configure Logs" },
        { value: "manage_log_permissions", label: "Manage Permissions" }
    ];

    onMount(async () => {
        await loadUsers();
        await loadPermissions();
    });

    async function loadUsers() {
        try {
            const result = await getUsers();
            users = result;
        } catch (error) {
            console.error("Failed to load users:", error);
        }
    }

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

    function toggleNewPermission(permission: LogPermissionType) {
        const index = selectedPermissions.indexOf(permission);
        if (index > -1) {
            selectedPermissions = selectedPermissions.filter((p) => p !== permission);
        } else {
            selectedPermissions = [...selectedPermissions, permission];
        }
    }

    async function addNewPermission() {
        if (!selectedUserId || selectedPermissions.length === 0) {
            addToast("Please select a user and at least one permission", "warning");
            return;
        }

        isSavingNewPermission = true;
        try {
            await setLogPermission(
                projectId,
                selectedUserId,
                selectedLogConfigId || null,
                selectedPermissions
            );
            addToast("Permission added successfully", "success");
            // Reset form
            selectedUserId = null;
            selectedLogConfigId = null;
            selectedPermissions = [];
            // Reload permissions
            await loadPermissions();
        } catch (error) {
            addToast(`Failed to add permission: ${error}`, "error");
        } finally {
            isSavingNewPermission = false;
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

            <!-- Add New Permission Form -->
            <div class="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Plus size={20} />
                    Grant New Permission
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <!-- User Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            User
                        </label>
                        <select
                            bind:value={selectedUserId}
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={null}>-- Select a user --</option>
                            {#each users as user}
                                <option value={user.id}>{user.username}</option>
                            {/each}
                        </select>
                    </div>

                    <!-- Log Config Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Log Config (or Project Default)
                        </label>
                        <select
                            bind:value={selectedLogConfigId}
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={null}>Project Default</option>
                            {#each logConfigs as config}
                                <option value={config.id}>{config.name}</option>
                            {/each}
                        </select>
                    </div>

                    <!-- Permissions Selection -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Permissions
                        </label>
                        <div class="space-y-2">
                            {#each availablePermissions as perm}
                                <label class="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedPermissions.includes(perm.value)}
                                        on:change={() => toggleNewPermission(perm.value)}
                                        class="mr-2 w-4 h-4 rounded border-gray-300"
                                    />
                                    <span class="text-gray-700 dark:text-gray-300">{perm.label}</span>
                                </label>
                            {/each}
                        </div>
                    </div>
                </div>

                <button
                    on:click={addNewPermission}
                    disabled={isSavingNewPermission || !selectedUserId || selectedPermissions.length === 0}
                    class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    Grant Permission
                </button>
            </div>

            {#if isLoading}
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="text-gray-600 dark:text-gray-400 mt-2">Loading permissions...</p>
                </div>
            {:else if permissions.length === 0}
                <div class="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p class="text-gray-600 dark:text-gray-400">No permissions configured yet.</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Use the form above to grant your first permission!</p>
                </div>
            {:else}
                <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Current Permissions</h4>
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
