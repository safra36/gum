<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { GitCommit, User, Calendar, MessageSquare, RotateCcw, ChevronRight, ChevronDown, Lock } from 'lucide-svelte';
    import type { GitLogEntry } from "$lib/types";
    import { permissions } from '$lib/stores/user';

    export let gitLog: GitLogEntry[];
    export let onRevertCommit: (commitHash: string) => void;

    let expandedCommit: string | null = null;
    let showPermissionError = false;
    let permissionErrorTimeout: NodeJS.Timeout;

    function toggleExpand(commitHash: string) {
        if (expandedCommit === commitHash) {
            expandedCommit = null;
        } else {
            expandedCommit = commitHash;
        }
    }

    function formatDate(dateString: string) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    function handleRevertClick(commitHash: string) {
        if (!$permissions.canRevertCommit) {
            showPermissionError = true;
            clearTimeout(permissionErrorTimeout);
            permissionErrorTimeout = setTimeout(() => {
                showPermissionError = false;
            }, 3000);
            return;
        }
        onRevertCommit(commitHash);
    }
</script>

<div class="mt-6 bg-white shadow-lg rounded-lg overflow-hidden" in:fade={{ duration: 300 }}>
    <h3 class="text-xl font-semibold p-4 bg-gray-100 flex items-center">
        <GitCommit class="mr-2 text-blue-500" size={24} />
        Git Log
    </h3>
    <ul class="divide-y divide-gray-200">
        {#each gitLog as commit, index (commit.commit)}
            <li 
                class="p-4 hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                in:fly={{ y: 20, duration: 300, delay: index * 50 }}
            >
                <div class="flex justify-between items-start">
                    <div class="flex-grow">
                        <button 
                            class="flex items-center text-lg font-semibold text-blue-600 hover:text-blue-800 transition-colors duration-150 ease-in-out"
                            on:click={() => toggleExpand(commit.commit)}
                        >
                            {#if expandedCommit === commit.commit}
                                <ChevronDown size={20} class="mr-1" />
                            {:else}
                                <ChevronRight size={20} class="mr-1" />
                            {/if}
                            {commit.message}
                        </button>
                        <div class="mt-2 text-sm text-gray-600 flex items-center">
                            <User size={14} class="mr-1" />
                            <span class="mr-4">{commit.author}</span>
                            <Calendar size={14} class="mr-1" />
                            <span>{formatDate(commit.date)}</span>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <span class="text-sm font-mono bg-gray-200 rounded px-2 py-1 mr-2">
                            {commit.commit.substring(0, 7)}
                        </span>
                        <button
                            class="text-sm font-bold py-1 px-3 rounded-full transition-colors duration-200 flex items-center {$permissions.canRevertCommit 
                                ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}"
                            on:click={() => handleRevertClick(commit.commit)}
                            disabled={!$permissions.canRevertCommit}
                            title={$permissions.canRevertCommit ? 'Revert to this commit' : 'Permission denied: Cannot revert commits'}
                        >
                            {#if $permissions.canRevertCommit}
                                <RotateCcw size={14} class="mr-1" />
                                Revert
                            {:else}
                                <Lock size={14} class="mr-1" />
                                Revert
                            {/if}
                        </button>
                    </div>
                </div>
                {#if expandedCommit === commit.commit}
                    <div 
                        class="mt-4 bg-gray-100 p-4 rounded-lg"
                        in:fly={{ y: -20, duration: 300 }}
                        out:fly={{ y: -20, duration: 300 }}
                    >
                        <div class="flex items-start mb-2">
                            <MessageSquare size={16} class="mr-2 mt-1 flex-shrink-0 text-gray-500" />
                            <p class="text-gray-700">{commit.message}</p>
                        </div>
                        <div class="text-sm text-gray-600">
                            <p><strong>Full Hash:</strong> {commit.commit}</p>
                            <p><strong>Author:</strong> {commit.author}</p>
                            <p><strong>Date:</strong> {formatDate(commit.date)}</p>
                        </div>
                    </div>
                {/if}
            </li>
        {/each}
    </ul>
</div>

{#if showPermissionError}
    <div 
        class="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50"
        in:fly={{ x: 300, duration: 300 }}
        out:fly={{ x: 300, duration: 300 }}
    >
        <div class="flex items-center">
            <Lock size={16} class="mr-2" />
            <span class="font-medium">Permission Denied</span>
        </div>
        <p class="text-sm mt-1">You don't have permission to revert commits.</p>
    </div>
{/if}