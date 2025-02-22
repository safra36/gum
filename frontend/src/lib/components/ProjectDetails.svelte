<script lang="ts">

import { onMount, afterUpdate } from "svelte";
    import { fade, fly } from "svelte/transition";
    import StageList from "./StageList.svelte";
    import GitLog from "./GitLog.svelte";
    import { executeStaging, fetchGitLog, fetchGitBranches, switchGitBranch, revertToCommit, switchToHead } from "../services/api";
    import type { Project, ExecutionResult, GitLogEntry } from "$lib/types";
    import { Loader2, FolderOpen, GitBranch, Play, Edit, GitBranchIcon, Check, GitCommit, PenTool, ArrowUp, RotateCcw } from "lucide-svelte";

    export let project: Project;
    export let onEdit: () => void;

    let executionResults: ExecutionResult[] | null = null;
    let gitLog: GitLogEntry[] | null = null;
    let gitBranches: string[] | null = null;
    let activeBranch: string | null = null;
    let isExecuting = false;
    let executionError: string | null = null;
    let isLoadingGitLog = false;
    let isLoadingGitBranches = false;
    let isSwitchingBranch = false;
    let gitLogError: string | null = null;
    let gitBranchesError: string | null = null;
    let branchSwitchError: string | null = null;
    let previousProjectId: number | null = null;
    let isRevertingCommit = false;
    let revertError: string | null = null;

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
        gitBranches = null;
        gitBranchesError = null;
        branchSwitchError = null;
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
        gitBranches = null; // Clear branches when loading log
        gitBranchesError = null;
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

    async function loadGitBranches() {
        isLoadingGitBranches = true;
        gitBranchesError = null;
        gitBranches = null;
        activeBranch = null;
        gitLog = null; // Clear log when loading branches
        gitLogError = null;
        try {
            const branchData = await fetchGitBranches(project.id);
            gitBranches = branchData.branches;
            activeBranch = branchData.currentBranch;
        } catch (error) {
            console.error("Failed to fetch git branches:", error);
            gitBranchesError = "Failed to load git branches. Please try again.";
        } finally {
            isLoadingGitBranches = false;
        }
    }

    async function handleBranchSwitch(branch: string) {
        isSwitchingBranch = true;
        branchSwitchError = null;
        try {
            await switchGitBranch(project.id, branch);
            activeBranch = branch;
            await loadGitBranches(); // Refresh the branch list
        } catch (error) {
            console.error("Failed to switch branch:", error);
            branchSwitchError = `Failed to switch to branch ${branch}. Please try again.`;
        } finally {
            isSwitchingBranch = false;
        }
    }

    async function handleRevertToCommit(commitHash: string) {
        isRevertingCommit = true;
        revertError = null;
        try {
            await revertToCommit(project.id, commitHash);
            await loadGitBranches(); // Refresh the branch list and active branch
        } catch (error) {
            console.error("Failed to revert to commit:", error);
            revertError = `Failed to revert to commit ${commitHash}. Please try again.`;
        } finally {
            isRevertingCommit = false;
        }
    }

    async function handleSwitchToHead(branch: string) {
        isSwitchingBranch = true;
        branchSwitchError = null;
        try {
            await switchToHead(project.id, branch);
            activeBranch = branch;
            await loadGitBranches(); // Refresh the branch list
        } catch (error) {
            console.error("Failed to switch to branch head:", error);
            branchSwitchError = `Failed to switch to head of branch ${branch}. Please try again.`;
        } finally {
            isSwitchingBranch = false;
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


    {#if gitLogError}
        <div
            class="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{gitLogError}</p>
        </div>
    {/if}

    <div class="mt-6 bg-gray-100 rounded-lg p-4" in:fly={{ y: 20, duration: 300 }}>
        <h3 class="text-lg font-semibold mb-3 flex items-center">
            <PenTool class="mr-2 text-gray-600" size={20} />
            Project Toolbox
        </h3>
        <div class="flex flex-wrap gap-3">
            <button
                class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition-colors duration-200 flex items-center justify-center"
                on:click={handleExecuteStaging}
                disabled={isExecuting || !hasStagingConfig}
            >
                {#if isExecuting}
                    <Loader2 class="animate-spin mr-2" size={18} />
                    Executing...
                {:else}
                    <Play class="mr-2" size={18} />
                    Execute Staging
                {/if}
            </button>

            <button
                class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-green-300 transition-colors duration-200 flex items-center justify-center"
                on:click={loadGitLog}
                disabled={isLoadingGitLog || isLoadingGitBranches}
            >
                {#if isLoadingGitLog}
                    <Loader2 class="animate-spin mr-2" size={18} />
                    Loading...
                {:else}
                    <GitCommit class="mr-2" size={18} />
                    Load Git Log
                {/if}
            </button>

            <button
                class="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:bg-purple-300 transition-colors duration-200 flex items-center justify-center"
                on:click={loadGitBranches}
                disabled={isLoadingGitBranches || isLoadingGitLog}
            >
                {#if isLoadingGitBranches}
                    <Loader2 class="animate-spin mr-2" size={18} />
                    Loading...
                {:else}
                    <GitBranch class="mr-2" size={18} />
                    Load Branches
                {/if}
            </button>

            <!-- Additional tools can be added here in the future -->
        </div>
    </div>


    {#if gitLogError}
        <div
            class="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{gitLogError}</p>
        </div>
    {/if}

    {#if gitBranchesError}
        <div
            class="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{gitBranchesError}</p>
        </div>
    {/if}

    {#if branchSwitchError}
        <div
            class="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{branchSwitchError}</p>
        </div>
    {/if}

    {#if gitLog}
        <GitLog {gitLog} onRevertCommit={handleRevertToCommit} />
    {/if}

    {#if revertError}
        <div
            class="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{revertError}</p>
        </div>
    {/if}

    {#if gitBranches}
        <div class="mt-6" in:fly={{ y: 20, duration: 300 }}>
            <h3 class="text-xl font-semibold mb-2">Git Branches</h3>
            <ul class="space-y-2">
                {#each gitBranches as branch}
                    <li class="flex items-center justify-between bg-gray-100 p-2 rounded">
                        <span class="font-mono flex items-center">
                            {#if branch === activeBranch}
                                <Check size={16} class="text-green-500 mr-2" />
                            {/if}
                            {branch}
                        </span>
                        <div class="flex space-x-2">
                            {#if branch !== activeBranch}
                                <button
                                    class="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-1 px-3 rounded-full transition-colors duration-200 flex items-center"
                                    on:click={() => handleBranchSwitch(branch)}
                                    disabled={isSwitchingBranch}
                                >
                                    {#if isSwitchingBranch}
                                        <Loader2 class="animate-spin mr-1" size={14} />
                                        Switching...
                                    {:else}
                                        <GitBranchIcon size={14} class="mr-1" />
                                        Switch
                                    {/if}
                                </button>
                            {/if}
                            <button
                                class="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-1 px-3 rounded-full transition-colors duration-200 flex items-center"
                                on:click={() => handleSwitchToHead(branch)}
                                disabled={isSwitchingBranch}
                            >
                                {#if isSwitchingBranch}
                                    <Loader2 class="animate-spin mr-1" size={14} />
                                    Switching...
                                {:else}
                                    <ArrowUp size={14} class="mr-1" />
                                    To Head
                                {/if}
                            </button>
                        </div>
                    </li>
                {/each}
            </ul>
        </div>
    {/if}

</div>
