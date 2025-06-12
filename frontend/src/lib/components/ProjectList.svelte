<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fade, fly } from 'svelte/transition';
    import { flip } from 'svelte/animate';
    import { Folder, FolderOpen, ChevronRight } from 'lucide-svelte';
    import type { Project } from "$lib/types";

    export let projects: Project[] = [];
    export let selectedProjectId: number | null = null;

    const dispatch = createEventDispatcher<{selectProject: Project}>();

    function selectProject(project: Project) {
        dispatch("selectProject", project);
    }
</script>

<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 max-w-md mx-auto">
    <h2 class="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center">
        <Folder class="mr-2 text-gray-600 dark:text-gray-300" size={24} />
        Projects
    </h2>
    <ul class="space-y-2">
        {#each projects as project (project.id)}
            <li 
                animate:flip={{duration: 300}}
                in:fade={{duration: 300, delay: 300}}
                out:fly={{y: 20, duration: 300}}
            >
                <button
                    class="w-full text-left p-3 rounded-md transition-all duration-200 ease-in-out flex items-center justify-between {selectedProjectId === project.id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'}"
                    on:click={() => selectProject(project)}
                >
                    <span class="flex items-center">
                        {#if selectedProjectId === project.id}
                            <FolderOpen class="mr-2 text-blue-500 dark:text-blue-400" size={20} />
                        {:else}
                            <Folder class="mr-2 text-gray-600 dark:text-gray-400" size={20} />
                        {/if}
                        {project.title}
                    </span>
                    <ChevronRight size={16} class={selectedProjectId === project.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                </button>
            </li>
        {/each}
    </ul>
    {#if projects.length === 0}
        <p class="text-gray-500 dark:text-gray-400 text-center mt-4" in:fade>No projects available.</p>
    {/if}
</div>

<style>
    /* Optional: Add custom styles here if needed */
</style>