<script lang="ts">


    import { onMount, afterUpdate } from "svelte";
    import { fade, fly } from "svelte/transition";
    import StageList from "./StageList.svelte";
    import GitLog from "./GitLog.svelte";
    import StreamingConsole from "./StreamingConsole.svelte";
    import PermissionGuard from "./PermissionGuard.svelte";
    import { executeStaging, executeProject, fetchGitLog, fetchGitBranches, switchGitBranch, revertToCommit, switchToHead, setCronJob, getCronJob, removeCronJob } from "../services/api";
    import type { Project, ExecutionResult, GitLogEntry } from "$lib/types";
    import { permissions } from '$lib/stores/user';
    import { Loader2, FolderOpen, GitBranch, Play, Edit, GitBranchIcon, Check, GitCommit, PenTool, ArrowUp, RotateCcw, Clock, Info, Trash2, Terminal, Lock } from "lucide-svelte";

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


    let showCronJobModal = false;
    let cronExpression = "";
    let isSettingCronJob = false;
    let isLoadingCronJob = false;
    let isRemovingCronJob = false;
    let cronJobError: string | null = null;
    let useStreamingExecution = false;
    let currentExecutionMode = 'normal'; // 'normal' or 'streaming'
    let streamingConsoleRef: StreamingConsole;

    $: isValidCron = validateCronExpression(cronExpression);


    onMount(async () => {
        await loadCronJob();
    });


    const cronPresets = [
        { label: "Every 15 minutes", value: "0 */15 * * * *" },
        { label: "Hourly", value: "0 0 * * * *" },
        { label: "Daily at midnight", value: "0 0 0 * * *" },
        { label: "Weekly on Sunday", value: "0 0 0 * * 0" },
        { label: "Monthly on the 1st", value: "0 0 0 1 * *" },
    ];


    interface ErrorResponse {
        message: string;
        project: string;
        success: boolean;
        results: ExecutionResult[];
    }



    function selectPreset(preset: string) {
        cronExpression = preset;
    }

    



    function clearResults() {
        executionResults = null;
        executionError = null;
        gitLog = null;
        gitLogError = null;
        gitBranches = null;
        gitBranchesError = null;
        branchSwitchError = null;
        // Reset execution state
        isExecuting = false;
        // Reset cron job state
        cronExpression = "";
        showCronJobModal = false;
        cronJobError = null;
        // Reset revert state
        isRevertingCommit = false;
        revertError = null;
    }

    $: if (project.id !== previousProjectId) {
        clearResults();
        // Reset the streaming console when project changes
        if (streamingConsoleRef && streamingConsoleRef.reset) {
            streamingConsoleRef.reset();
        }
        // Reset execution mode to normal when switching projects (hides console)
        currentExecutionMode = 'normal';
        // @ts-ignore
        previousProjectId = project.id;
    }

    $: hasStagingConfig =
        project.stagingConfig &&
        Object.keys(project.stagingConfig).length > 0;

    // Reset streaming console when switching execution modes
    $: if (currentExecutionMode === 'streaming' && streamingConsoleRef && streamingConsoleRef.reset) {
        streamingConsoleRef.reset();
    }

    async function handleExecuteStaging() {
        if (!hasStagingConfig) {
            executionError =
                "No staging configuration available for this project.";
            return;
        }

        // For streaming mode, trigger the StreamingConsole component's execution
        if (currentExecutionMode === 'streaming') {
            if (streamingConsoleRef && streamingConsoleRef.startExecution) {
                streamingConsoleRef.startExecution();
            }
            return;
        }

        // Normal execution mode
        isExecuting = true;
        executionError = null;
        executionResults = null;
        try {
            const response = await executeProject(project.id);
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


    async function loadCronJob() {
        isLoadingCronJob = true;
        cronJobError = null;
        try {
            const cronJob = await getCronJob(project.id);
            cronExpression = cronJob || "";
            project = { ...project, cronJob };  // Update the project object
        } catch (error) {
            cronJobError = "Failed to load cron job";
            console.error("Failed to load cron job:", error);
        } finally {
            isLoadingCronJob = false;
        }
    }

    async function handleSetCronJob() {
        isSettingCronJob = true;
        cronJobError = null;
        try {
            await setCronJob(project.id, cronExpression);
            // Update the project's cronJob field locally
            project = { ...project, cronJob: cronExpression };
            showCronJobModal = false;
        } catch (error: unknown) {
            if (error instanceof Error) {
                cronJobError = `Failed to set cron job: ${error.message}`;
            } else {
                cronJobError = 'Failed to set cron job: An unknown error occurred';
            }
        } finally {
            isSettingCronJob = false;
        }
    }

    async function handleRemoveCronJob() {
        isRemovingCronJob = true;
        cronJobError = null;
        try {
            await removeCronJob(project.id);
            project = { ...project, cronJob: null };
            cronExpression = "";
            showCronJobModal = false;
        } catch (error) {
            if (error instanceof Error) {
                cronJobError = `Failed to remove cron job: ${error.message}`;
            } else {
                cronJobError = 'Failed to remove cron job: An unknown error occurred';
            }
        } finally {
            isRemovingCronJob = false;
        }
    }

    function validateCronExpression(expression: string): boolean {
        // This regex allows for 6-field cron expressions (with seconds)
        const regex = /^(\*|([0-9]|[1-5][0-9])|(\*\/[0-9]+))(\s+(\*|([0-9]|[1-5][0-9])|(\*\/[0-9]+))){5}$/;
        return regex.test(expression.trim());
    }

    function generateFullScript(): string {
        if (!project.stagingConfig?.stages) {
            return "";
        }
        
        // Combine all stage scripts into one executable script
        const stages = project.stagingConfig.stages;
        const scriptParts = [`#!/bin/bash`, `# Combined script for project: ${project.title}`, ``];
        
        stages.forEach((stage, index) => {
            scriptParts.push(`echo "=== Executing Stage ${index + 1}: ${stage.stageId} ==="`);
            scriptParts.push(stage.script);
            scriptParts.push(`if [ $? -ne 0 ]; then`);
            scriptParts.push(`  echo "Stage ${stage.stageId} failed with exit code $?"`);
            scriptParts.push(`  exit 1`);
            scriptParts.push(`fi`);
            scriptParts.push(`echo "Stage ${stage.stageId} completed successfully"`);
            scriptParts.push(``);
        });
        
        scriptParts.push(`echo "All stages completed successfully"`);
        
        return scriptParts.join('\n');
    }

</script>

<div
    class="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 transition-all duration-300 ease-in-out"
    in:fade={{ duration: 300, delay: 300 }}
>
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <FolderOpen class="mr-3 text-blue-500 dark:text-blue-400" size={28} />
            {project.title}
        </h2>
        <PermissionGuard requiredPermission="canEdit">
          <button
              class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200 flex items-center"
              on:click={onEdit}
          >
              <Edit size={18} class="mr-2" />
              Edit Project
          </button>
        </PermissionGuard>
    </div>


    <PermissionGuard requiredPermission="canEdit" variant="full">
      <div
          class="mb-6 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg"
          in:fly={{ y: 20, duration: 300, delay: 400 }}
      >
          <p class="text-gray-700 dark:text-gray-300">
              <strong>Working Directory:</strong>
              {project.working_dir}
          </p>
      </div>

      {#if hasStagingConfig}
          <div
              class="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg"
              in:fly={{ y: 20, duration: 300, delay: 500 }}
          >
              <h3 class="text-xl font-semibold mb-3 text-blue-700 dark:text-blue-300">
                  Staging Configuration
              </h3>
              <p class="mb-2">
                  <strong>Route:</strong>
                  {project.stagingConfig.route}
              </p>
              <p>
                  <strong>Arguments:</strong>
                  {project.stagingConfig.args.join(", ") || "None"}
              </p>
          </div>

          <div in:fly={{ y: 20, duration: 300, delay: 600 }}>
              <StageList stages={project.stagingConfig.stages} />
          </div>

      {:else}
          <p
              class="text-yellow-600 bg-yellow-100 p-4 rounded-lg"
              in:fly={{ y: 20, duration: 300, delay: 500 }}
          >
              No staging configuration available for this project.
          </p>
      {/if}
    </PermissionGuard>

    {#if executionError}
        <div
            class="mt-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-lg"
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

    <!-- Streaming Console Section -->
    <PermissionGuard requiredPermission="canExecute">
        {#if currentExecutionMode === 'streaming'}
            <div class="mt-6" in:fly={{ y: 20, duration: 300 }}>
                <StreamingConsole 
                    bind:this={streamingConsoleRef}
                    script={generateFullScript()}
                    args={project.stagingConfig?.args || []}
                    projectId={project.id}
                    on:executionStarted={(e) => {
                        console.log('Execution started:', e.detail);
                        isExecuting = true;
                        executionError = null;
                        executionResults = null;
                    }}
                    on:executionCompleted={(e) => {
                        console.log('Execution completed:', e.detail);
                        isExecuting = false;
                    }}
                    on:executionError={(e) => {
                        console.log('Execution error:', e.detail);
                        isExecuting = false;
                        executionError = e.detail;
                    }}
                />
            </div>
        {/if}
    </PermissionGuard>

    {#if gitLogError}
        <div
            class="mt-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{gitLogError}</p>
        </div>
    {/if}

    <div class="mt-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-4" in:fly={{ y: 20, duration: 300 }}>
        <h3 class="text-lg font-semibold mb-3 flex items-center text-gray-800 dark:text-white">
            <PenTool class="mr-2 text-gray-600 dark:text-gray-300" size={20} />
            Project Toolbox
        </h3>
        
        <!-- Check if user has any toolbox permissions -->
        {#if $permissions.canExecute || $permissions.canViewGitLogs || $permissions.canSwitchBranch || $permissions.canSetCron}
            <!-- Execution Mode Toggle -->
            {#if $permissions.canExecute}
                <div class="mb-4 flex items-center space-x-4">
                    <label class="flex items-center space-x-2">
                        <input 
                            type="radio" 
                            bind:group={currentExecutionMode} 
                            value="normal"
                            class="text-blue-600 focus:ring-blue-500"
                        />
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Normal Execution</span>
                    </label>
                    <label class="flex items-center space-x-2">
                        <input 
                            type="radio" 
                            bind:group={currentExecutionMode} 
                            value="streaming"
                            class="text-blue-600 focus:ring-blue-500"
                        />
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                            <Terminal class="mr-1" size={14} />
                            Real-time Console
                        </span>
                    </label>
                </div>
            {/if}
            
            <div class="flex flex-wrap gap-3">
                {#if $permissions.canExecute}
                  <button
                      class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition-colors duration-200 flex items-center justify-center"
                      on:click={handleExecuteStaging}
                      disabled={isExecuting || !hasStagingConfig}
                  >
                      {#if isExecuting}
                          <Loader2 class="animate-spin mr-2" size={18} />
                          Executing...
                      {:else}
                          {#if currentExecutionMode === 'streaming'}
                              <Terminal class="mr-2" size={18} />
                              Execute with Console
                          {:else}
                              <Play class="mr-2" size={18} />
                              Execute Staging
                          {/if}
                      {/if}
                  </button>
                {/if}

                {#if $permissions.canViewGitLogs}
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
                {/if}

                {#if $permissions.canSwitchBranch}
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
                {/if}

                {#if $permissions.canSetCron}
                  <button
                      class="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 transition-colors duration-200 flex items-center justify-center"
                      on:click={() => showCronJobModal = true}
                  >
                      <Clock class="mr-2" size={18} />
                      Set Cron Job
                  </button>
                {/if}

                <!-- Additional tools can be added here in the future -->
            </div>
        {:else}
            <!-- Single consolidated access restricted message -->
            <div class="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div class="text-center">
                    <div class="flex justify-center mb-3">
                        <Lock size={24} class="text-gray-400 dark:text-gray-500" />
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Access Restricted
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        You do not have permission to access this feature
                    </p>
                </div>
            </div>
        {/if}
    </div>


    {#if gitLogError}
        <div
            class="mt-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{gitLogError}</p>
        </div>
    {/if}

    {#if gitBranchesError}
        <div
            class="mt-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{gitBranchesError}</p>
        </div>
    {/if}

    {#if branchSwitchError}
        <div
            class="mt-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-lg"
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
            class="mt-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 rounded-lg"
            in:fly={{ y: 20, duration: 300 }}
        >
            <p class="font-bold">Error:</p>
            <p>{revertError}</p>
        </div>
    {/if}

    {#if gitBranches}
        <div class="mt-6" in:fly={{ y: 20, duration: 300 }}>
            <h3 class="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Git Branches</h3>
            <ul class="space-y-2">
                {#each gitBranches as branch}
                    <li class="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded">
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

{#if showCronJobModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" in:fade={{ duration: 200 }}>
        <div class="bg-white rounded-lg p-6 w-full max-w-md" in:fly={{ y: 20, duration: 300 }}>
            <h2 class="text-2xl font-bold mb-4 flex items-center">
                <Clock class="mr-2 text-indigo-500" size={24} />
                {project.cronJob ? 'Update Cron Job' : 'Set Cron Job'}
            </h2>
            <p class="mb-4 text-gray-600 dark:text-gray-300">
                {#if project.cronJob}
                    Current cron job: <span class="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-white">{project.cronJob}</span>
                {:else}
                    Select a preset or enter a custom cron expression to schedule automatic project execution.
                {/if}
            </p>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Presets:</label>
                <div class="flex flex-wrap gap-2">
                    {#each cronPresets as preset}
                        <button
                            class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm hover:bg-indigo-200 transition-colors duration-200"
                            on:click={() => selectPreset(preset.value)}
                        >
                            {preset.label}
                        </button>
                    {/each}
                </div>
            </div>
            <div class="mb-4">
                <label for="cronExpression" class="block text-sm font-medium text-gray-700 mb-2">Cron Expression:</label>
                <input
                    id="cronExpression"
                    type="text"
                    bind:value={cronExpression}
                    placeholder="Enter cron expression (e.g. 0 */15 * * * *)"
                    class="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 transition-all duration-200 {isValidCron ? 'border-green-500' : 'border-red-500'}"
                />
                <p class="mt-1 text-sm text-gray-500 flex items-center">
                    <Info size={14} class="mr-1" />
                    Format: seconds minutes hours day-of-month month day-of-week
                </p>
            </div>
            {#if cronJobError}
                <p class="text-red-500 mb-4">{cronJobError}</p>
            {/if}
            <div class="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                    class="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
                    on:click={() => showCronJobModal = false}
                >
                    Cancel
                </button>
                {#if project.cronJob}
                    <button
                        class="w-full sm:w-auto px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors duration-200 flex items-center justify-center"
                        on:click={handleRemoveCronJob}
                        disabled={isRemovingCronJob || isSettingCronJob}
                    >
                        {#if isRemovingCronJob}
                            <Loader2 class="animate-spin mr-2" size={18} />
                            Removing...
                        {:else}
                            <Trash2 class="mr-2" size={18} />
                            Remove Cron Job
                        {/if}
                    </button>
                {/if}
                <button
                    class="w-full sm:w-auto px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center"
                    on:click={handleSetCronJob}
                    disabled={!isValidCron || isSettingCronJob || isRemovingCronJob}
                >
                    {#if isSettingCronJob}
                        <Loader2 class="animate-spin mr-2" size={18} />
                        Setting...
                    {:else}
                        {project.cronJob ? 'Update' : 'Set'} Cron Job
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}