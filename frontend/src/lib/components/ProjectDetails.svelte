<script lang="ts">
    import { onMount, afterUpdate } from "svelte";
    import { fade, fly } from "svelte/transition";
    import StageList from "./StageList.svelte";
    import GitLog from "./GitLog.svelte";
    import { executeStaging, fetchGitLog } from "../services/api";
    import type { Project, ExecutionResult, GitLogEntry } from "$lib/types";
    import { Loader2, FolderOpen, GitBranch, Play, Edit } from "lucide-svelte";

    export let project: Project;
    export let onEdit: () => void;

    let executionResults: ExecutionResult[] | null = null;
    let gitLog: GitLogEntry[] | null = null;
    let isExecuting = false;
    let executionError: string | null = null;
    let isLoadingGitLog = false;
    let gitLogError: string | null = null;
    let previousProjectId: number | null = null;

    interface ErrorResponse {
        message: string;
        project: string;
        success: boolean;
        results: ExecutionResult[];
    }

    function clearResults() {
        executionResults = null;
        executionError = null;
        gitLog = null;
        gitLogError = null;
    }

    $: if (project.id !== previousProjectId) {
        clearResults();
        // @ts-ignore
        previousProjectId = project.id;
    }

    $: hasStagingConfig =
        project.stagingConfigs &&
        Object.keys(project.stagingConfigs).length > 0;

    async function handleExecuteStaging() {
        if (!hasStagingConfig) {
            executionError =
                "No staging configuration available for this project.";
            return;
        }

        isExecuting = true;
        executionError = null;
        executionResults = null;
        try {
            const response = await executeStaging(project.stagingConfigs.route);
            executionResults = response.results;
            if (!response.success) {
                executionError = `Execution completed with errors. Project: ${response.project}`;
            }
        } catch (error: unknown) {
            console.error("Failed to execute staging:", error);
            if (error instanceof Error) {
                const errorAny = error as any;
                if (
                    errorAny.response &&
                    typeof errorAny.response.json === "function"
                ) {
                    try {
                        const errorData: ErrorResponse =
                            await errorAny.response.json();
                        executionResults = errorData.results;
                        executionError = `Execution failed. ${errorData.message}`;
                    } catch (jsonError) {
                        executionError =
                            "Failed to parse error response. Please try again.";
                    }
                } else {
                    executionError = `Failed to execute staging: ${error.message}`;
                }
            } else {
                executionError = "An unknown error occurred. Please try again.";
            }
        } finally {
            isExecuting = false;
        }
    }

    async function loadGitLog() {
        isLoadingGitLog = true;
        gitLogError = null;
        gitLog = null;
        try {
            // @ts-ignore
            gitLog = await fetchGitLog(project.id);
        } catch (error) {
            console.error("Failed to fetch git log:", error);
            gitLogError = "Failed to load git log. Please try again.";
        } finally {
            isLoadingGitLog = false;
        }
    }
</script>

<div
    class="bg-white shadow-lg rounded-lg p-6 transition-all duration-300 ease-in-out"
    in:fade={{ duration: 300, delay: 300 }}
>
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold text-gray-800 flex items-center">
            <FolderOpen class="mr-3 text-blue-500" size={28} />
            {project.title}
        </h2>
        <button
            class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 flex items-center"
            on:click={onEdit}
        >
            <Edit size={18} class="mr-2" />
            Edit Project
        </button>
    </div>


    <div
        class="mb-6 bg-gray-100 p-4 rounded-lg"
        in:fly={{ y: 20, duration: 300, delay: 400 }}
    >
        <p class="text-gray-700">
            <strong>Working Directory:</strong>
            {project.working_dir}
        </p>
    </div>

    {#if hasStagingConfig}
        <div
            class="mb-6 bg-blue-50 p-4 rounded-lg"
            in:fly={{ y: 20, duration: 300, delay: 500 }}
        >
            <h3 class="text-xl font-semibold mb-3 text-blue-700">
                Staging Configuration
            </h3>
            <p class="mb-2">
                <strong>Route:</strong>
                {project.stagingConfigs.route}
            </p>
            <p>
                <strong>Arguments:</strong>
                {project.stagingConfigs.args.join(", ") || "None"}
            </p>
        </div>

        <div in:fly={{ y: 20, duration: 300, delay: 600 }}>
            <StageList stages={project.stagingConfigs.stages} />
        </div>

        <button
            class="bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 mt-6 disabled:bg-blue-300 transition-colors duration-200 flex items-center justify-center w-full md:w-auto"
            on:click={handleExecuteStaging}
            disabled={isExecuting}
        >
            {#if isExecuting}
                <Loader2 class="animate-spin mr-2" size={20} />
                Executing Staging...
            {:else}
                <Play class="mr-2" size={20} />
                Execute Staging
            {/if}
        </button>
    {:else}
        <p
            class="text-yellow-600 bg-yellow-100 p-4 rounded-lg"
            in:fly={{ y: 20, duration: 300, delay: 500 }}
        >
            No staging configuration available for this project.
        </p>
    {/if}

    {#if executionError}
        <div
            class="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{executionError}</p>
        </div>
    {/if}

    {#if executionResults}
        <div class="mt-6" in:fly={{ y: 20, duration: 300 }}>
            <h3 class="text-2xl font-semibold mb-4 text-gray-800">
                Execution Results
            </h3>
            {#each executionResults as result}
                <div
                    class="mb-4 p-4 {result.exitCode === 0
                        ? 'bg-green-100 border-green-400'
                        : 'bg-red-100 border-red-400'} rounded-lg border"
                >
                    <p class="font-bold text-lg mb-2">
                        Stage: {result.stageId}
                    </p>
                    <p class="mb-2">
                        Exit Code: <span
                            class={result.exitCode === 0
                                ? "text-green-700"
                                : "text-red-700"}
                            >{result.exitCode !== null
                                ? result.exitCode
                                : "N/A"}</span
                        >
                    </p>
                    {#if result.stdout}
                        <p class="font-semibold mt-3">Standard Output:</p>
                        <pre
                            class="bg-white p-3 rounded-lg mt-1 overflow-x-auto">{result.stdout}</pre>
                    {/if}
                    {#if result.stderr}
                        <p class="font-semibold mt-3">Standard Error:</p>
                        <pre
                            class="bg-white p-3 rounded-lg mt-1 overflow-x-auto">{result.stderr}</pre>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    <button
        class="bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 mt-6 disabled:bg-green-300 transition-colors duration-200 flex items-center justify-center w-full md:w-auto"
        on:click={loadGitLog}
        disabled={isLoadingGitLog}
    >
        {#if isLoadingGitLog}
            <Loader2 class="animate-spin mr-2" size={20} />
            Loading Git Log...
        {:else}
            <GitBranch class="mr-2" size={20} />
            Load Git Log
        {/if}
    </button>

    {#if gitLogError}
        <div
            class="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{gitLogError}</p>
        </div>
    {/if}

    {#if gitLog}
        <div class="mt-6" in:fly={{ y: 20, duration: 300 }}>
            <GitLog {gitLog} />
        </div>
    {/if}
</div>
