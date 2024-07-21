<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { GitCommit, User, Calendar, MessageSquare, RotateCcw, ChevronRight, ChevronDown } from 'lucide-svelte';
    import type { GitLogEntry } from "$lib/types";

    export let gitLog: GitLogEntry[];
    export let onRevertCommit: (commitHash: string) => void;

    let expandedCommit: string | null = null;

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
                            class="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-1 px-3 rounded-full transition-colors duration-200 flex items-center"
                            on:click={() => onRevertCommit(commit.commit)}
                        >
                            <RotateCcw size={14} class="mr-1" />
                            Revert
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