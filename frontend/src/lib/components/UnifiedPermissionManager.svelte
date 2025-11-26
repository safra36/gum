<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { X, Plus, Trash2, Check, Lock } from "lucide-svelte";
    import { addToast } from "$lib/stores/toast";
    import { user } from "$lib/stores/user";
    import type { LogConfig } from "$lib/types";
    import { getLogPermissions, setLogPermission, getUsers } from "$lib/services/api";

    export let projectId: number;
    export let logConfigs: LogConfig[] = [];
    export let userHasManagePermission: boolean = false;

    const dispatch = createEventDispatcher<{ close: void }>();

    interface User {
        id: number;
        username: string;
    }

    interface PermissionRow {
        userId: number;
        username: string;
        target: string;
        targetType: "project" | "log";
        logConfigId?: number;
        viewLogs: boolean;
        configureLogs: boolean;
        deleteLogs: boolean;
        managePermissions: boolean;
    }

    let users: User[] = [];
    let permissions: PermissionRow[] = [];
    let isLoading = false;
    let isSavingNewPermission = false;

    let selectedUserId: number | null = null;
    let selectedTarget: string = "project";
    let viewLogsChecked = false;
    let configureLogsChecked = false;
    let deleteLogsChecked = false;
    let managePermissionsChecked = false;

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
            const allPermissions = result.permissions || [];

            const permMap: { [key: string]: PermissionRow } = {};

            allPermissions.forEach((p: any) => {
                if (!p.user) return;

                const permissionsSet = new Set(p.permissions || []);
                const isLogPermission = Array.from(permissionsSet).some((perm: any) =>
                    ['view_logs', 'configure_logs', 'delete_logs', 'manage_log_permissions'].includes(perm)
                );

                if (!isLogPermission && !p.logConfigId) return;

                const key = `${p.userId}_${p.logConfigId || 'project'}`;
                if (!permMap[key]) {
                    permMap[key] = {
                        userId: p.userId,
                        username: p.user.username,
                        target: p.logConfigId ? (p.logConfig?.name || `Log Config ${p.logConfigId}`) : "Project Default",
                        targetType: p.logConfigId ? "log" : "project",
                        logConfigId: p.logConfigId,
                        viewLogs: permissionsSet.has('view_logs'),
                        configureLogs: permissionsSet.has('configure_logs'),
                        deleteLogs: permissionsSet.has('delete_logs'),
                        managePermissions: permissionsSet.has('manage_log_permissions')
                    };
                }
            });

            permissions = Object.values(permMap);
        } catch (error) {
            addToast(`Failed to load permissions: ${error}`, "error");
        } finally {
            isLoading = false;
        }
    }

    async function addNewPermission() {
        if (!selectedUserId || (!viewLogsChecked && !configureLogsChecked && !deleteLogsChecked && !managePermissionsChecked)) {
            addToast("Please select a user and at least one permission", "warning");
            return;
        }

        const permissionsToGrant: string[] = [];
        if (viewLogsChecked) permissionsToGrant.push('view_logs');
        if (configureLogsChecked) permissionsToGrant.push('configure_logs');
        if (deleteLogsChecked) permissionsToGrant.push('delete_logs');
        if (managePermissionsChecked) permissionsToGrant.push('manage_log_permissions');

        isSavingNewPermission = true;
        try {
            const logConfigId = selectedTarget === 'project' ? null : parseInt(selectedTarget);
            await setLogPermission(
                projectId,
                selectedUserId,
                logConfigId,
                permissionsToGrant as any
            );
            addToast("Permission granted successfully", "success");
            selectedUserId = null;
            selectedTarget = "project";
            viewLogsChecked = false;
            configureLogsChecked = false;
            deleteLogsChecked = false;
            managePermissionsChecked = false;
            await loadPermissions();
        } catch (error) {
            addToast(`Failed to add permission: ${error}`, "error");
        } finally {
            isSavingNewPermission = false;
        }
    }

    function togglePermission(row: PermissionRow, permType: string, value: boolean) {
        switch (permType) {
            case 'view_logs':
                row.viewLogs = value;
                break;
            case 'configure_logs':
                row.configureLogs = value;
                break;
            case 'delete_logs':
                row.deleteLogs = value;
                break;
            case 'manage_log_permissions':
                row.managePermissions = value;
                break;
        }
        permissions = permissions;
    }

    async function savePermission(row: PermissionRow) {
        const permissionsToGrant: string[] = [];
        if (row.viewLogs) permissionsToGrant.push('view_logs');
        if (row.configureLogs) permissionsToGrant.push('configure_logs');
        if (row.deleteLogs) permissionsToGrant.push('delete_logs');
        if (row.managePermissions) permissionsToGrant.push('manage_log_permissions');

        try {
            await setLogPermission(
                projectId,
                row.userId,
                row.logConfigId || null,
                permissionsToGrant as any
            );
            addToast("Permission updated successfully", "success");
        } catch (error) {
            addToast(`Failed to save permission: ${error}`, "error");
            await loadPermissions();
        }
    }

    function handleClose() {
        dispatch("close");
    }
</script>

{#if !userHasManagePermission}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Manage Permissions</h2>
                <button
                    on:click={handleClose}
                    class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    <X size={24} />
                </button>
            </div>

            <div class="p-6">
                <div class="flex items-center justify-center py-12">
                    <div class="text-center">
                        <Lock size={48} class="mx-auto text-red-500 mb-4" />
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h3>
                        <p class="text-gray-600 dark:text-gray-400">
                            You don't have permission to manage permissions for this project.
                        </p>
                    </div>
                </div>
            </div>

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
{:else}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl mx-4 my-8">
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Manage Permissions</h2>
                <button
                    on:click={handleClose}
                    class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    <X size={24} />
                </button>
            </div>

            <div class="p-6">
                <div class="mb-6">
                    <p class="text-gray-600 dark:text-gray-400 mb-4">
                        Manage log permissions for all users in this project.
                    </p>
                </div>

                <div class="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Plus size={20} />
                        Grant New Permission
                    </h3>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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

                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Target
                            </label>
                            <select
                                bind:value={selectedTarget}
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="project">Project Default</option>
                                {#each logConfigs as config}
                                    <option value={config.id.toString()}>{config.name}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Permissions
                            </label>
                            <div class="space-y-2">
                                <label class="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        bind:checked={viewLogsChecked}
                                        class="mr-2 w-4 h-4 rounded border-gray-300"
                                    />
                                    <span class="text-gray-700 dark:text-gray-300">View Logs</span>
                                </label>
                                <label class="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        bind:checked={configureLogsChecked}
                                        class="mr-2 w-4 h-4 rounded border-gray-300"
                                    />
                                    <span class="text-gray-700 dark:text-gray-300">Configure Logs</span>
                                </label>
                                <label class="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        bind:checked={deleteLogsChecked}
                                        class="mr-2 w-4 h-4 rounded border-gray-300"
                                    />
                                    <span class="text-gray-700 dark:text-gray-300">Delete Logs</span>
                                </label>
                                <label class="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        bind:checked={managePermissionsChecked}
                                        class="mr-2 w-4 h-4 rounded border-gray-300"
                                    />
                                    <span class="text-gray-700 dark:text-gray-300">Manage Permissions</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <button
                        on:click={addNewPermission}
                        disabled={isSavingNewPermission || !selectedUserId}
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
                    </div>
                {:else}
                    <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Current Permissions</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th class="px-4 py-3 text-left">User</th>
                                    <th class="px-4 py-3 text-left">Target</th>
                                    <th class="px-4 py-3 text-center">View Logs</th>
                                    <th class="px-4 py-3 text-center">Configure</th>
                                    <th class="px-4 py-3 text-center">Delete</th>
                                    <th class="px-4 py-3 text-center">Manage</th>
                                    <th class="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each permissions as row, idx (idx)}
                                    <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {row.username}
                                        </td>
                                        <td class="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                                            {row.target}
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={row.viewLogs}
                                                on:change={(e) => togglePermission(row, 'view_logs', e.currentTarget.checked)}
                                                class="w-4 h-4 rounded border-gray-300"
                                            />
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={row.configureLogs}
                                                on:change={(e) => togglePermission(row, 'configure_logs', e.currentTarget.checked)}
                                                class="w-4 h-4 rounded border-gray-300"
                                            />
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={row.deleteLogs}
                                                on:change={(e) => togglePermission(row, 'delete_logs', e.currentTarget.checked)}
                                                class="w-4 h-4 rounded border-gray-300"
                                            />
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={row.managePermissions}
                                                on:change={(e) => togglePermission(row, 'manage_log_permissions', e.currentTarget.checked)}
                                                class="w-4 h-4 rounded border-gray-300"
                                            />
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <button
                                                on:click={() => savePermission(row)}
                                                class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                                            >
                                                Save
                                            </button>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>

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
{/if}

<style>
    /* Modal styles */
</style>
