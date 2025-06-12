<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/services/api';

  interface ExecutionRecord {
    id: number;
    user: {
      id: number;
      username: string;
    };
    project?: {
      id: number;
      title: string;
    };
    stage?: {
      id: number;
      stageId: string;
    };
    command: string;
    workingDirectory?: string;
    status: 'success' | 'failed' | 'running' | 'cancelled';
    output?: string;
    errorOutput?: string;
    exitCode?: number;
    duration?: number;
    executedAt: string;
    finishedAt?: string;
  }

  interface ExecutionHistoryResponse {
    executions: ExecutionRecord[];
    total: number;
  }

  let executions: ExecutionRecord[] = [];
  let total = 0;
  let loading = false;
  let error = '';
  let selectedExecution: ExecutionRecord | null = null;
  let showDetailsModal = false;
  
  // Pagination and filters
  let currentPage = 1;
  let pageSize = 20;
  let statusFilter = '';
  let projectFilter = '';

  onMount(async () => {
    await loadExecutionHistory();
  });

  async function loadExecutionHistory() {
    try {
      loading = true;
      error = '';
      
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString()
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      if (projectFilter) {
        params.append('projectId', projectFilter);
      }

      const response: ExecutionHistoryResponse = await api.getExecutionHistory(params.toString());
      executions = response.executions;
      total = response.total;
    } catch (err) {
      error = 'Failed to load execution history';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function showDetails(execution: ExecutionRecord) {
    try {
      selectedExecution = await api.getExecutionById(execution.id);
      showDetailsModal = true;
    } catch (err) {
      error = 'Failed to load execution details';
      console.error(err);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'failed': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'running': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
      case 'cancelled': return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  }

  function formatDuration(duration?: number): string {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  $: totalPages = Math.ceil(total / pageSize);
  $: {
    if (statusFilter !== '' || projectFilter !== '') {
      currentPage = 1;
      loadExecutionHistory();
    }
  }
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Execution History</h2>
    <button 
      on:click={loadExecutionHistory}
      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
    >
      Refresh
    </button>
  </div>

  <!-- Filters -->
  <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
        <select 
          bind:value={statusFilter}
          class="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Page Size</label>
        <select 
          bind:value={pageSize}
          on:change={() => { currentPage = 1; loadExecutionHistory(); }}
          class="block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>
  </div>

  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
      <div class="px-4 py-5 sm:p-6">
        <div class="text-sm text-gray-600 mb-4">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} executions
        </div>
        
        {#if executions.length === 0}
          <div class="text-center py-8 text-gray-500">
            No execution history found
          </div>
        {:else}
          <div class="space-y-4">
            {#each executions as execution}
              <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2">
                      <span class="px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(execution.status)}">
                        {execution.status.toUpperCase()}
                      </span>
                      <span class="text-sm font-medium text-gray-900">
                        {execution.user.username}
                      </span>
                      {#if execution.project}
                        <span class="text-sm text-gray-600">→ {execution.project.title}</span>
                      {/if}
                      {#if execution.stage}
                        <span class="text-sm text-gray-600">→ Stage {execution.stage.stageId}</span>
                      {/if}
                    </div>
                    
                    <div class="mt-1">
                      <code class="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {execution.command.length > 100 ? execution.command.substring(0, 100) + '...' : execution.command}
                      </code>
                    </div>
                    
                    <div class="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Executed: {formatDate(execution.executedAt)}</span>
                      {#if execution.duration}
                        <span>Duration: {formatDuration(execution.duration)}</span>
                      {/if}
                      {#if execution.exitCode !== undefined}
                        <span>Exit Code: {execution.exitCode}</span>
                      {/if}
                    </div>
                  </div>
                  
                  <button 
                    on:click={() => showDetails(execution)}
                    class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between">
        <button 
          on:click={() => { currentPage--; loadExecutionHistory(); }}
          disabled={currentPage === 1}
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <span class="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        
        <button 
          on:click={() => { currentPage++; loadExecutionHistory(); }}
          disabled={currentPage === totalPages}
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    {/if}
  {/if}
</div>

<!-- Execution Details Modal -->
{#if showDetailsModal && selectedExecution}
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border dark:border-gray-600 w-4/5 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-900">Execution Details</h3>
        <button 
          on:click={() => { showDetailsModal = false; selectedExecution = null; }}
          class="text-gray-600 hover:text-gray-800"
        >
          ×
        </button>
      </div>
      
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">User</label>
            <p class="text-sm text-gray-900">{selectedExecution.user.username}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Status</label>
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusColor(selectedExecution.status)}">
              {selectedExecution.status.toUpperCase()}
            </span>
          </div>
          
          {#if selectedExecution.project}
            <div>
              <label class="block text-sm font-medium text-gray-700">Project</label>
              <p class="text-sm text-gray-900">{selectedExecution.project.title}</p>
            </div>
          {/if}
          
          {#if selectedExecution.stage}
            <div>
              <label class="block text-sm font-medium text-gray-700">Stage</label>
              <p class="text-sm text-gray-900">{selectedExecution.stage.stageId}</p>
            </div>
          {/if}
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Executed At</label>
            <p class="text-sm text-gray-900">{formatDate(selectedExecution.executedAt)}</p>
          </div>
          
          {#if selectedExecution.finishedAt}
            <div>
              <label class="block text-sm font-medium text-gray-700">Finished At</label>
              <p class="text-sm text-gray-900">{formatDate(selectedExecution.finishedAt)}</p>
            </div>
          {/if}
          
          {#if selectedExecution.duration}
            <div>
              <label class="block text-sm font-medium text-gray-700">Duration</label>
              <p class="text-sm text-gray-900">{formatDuration(selectedExecution.duration)}</p>
            </div>
          {/if}
          
          {#if selectedExecution.exitCode !== undefined}
            <div>
              <label class="block text-sm font-medium text-gray-700">Exit Code</label>
              <p class="text-sm text-gray-900">{selectedExecution.exitCode}</p>
            </div>
          {/if}
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Command</label>
          <pre class="bg-gray-100 p-3 rounded-md text-sm font-mono overflow-x-auto">{selectedExecution.command}</pre>
        </div>
        
        {#if selectedExecution.workingDirectory}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Working Directory</label>
            <p class="text-sm text-gray-900 font-mono">{selectedExecution.workingDirectory}</p>
          </div>
        {/if}
        
        {#if selectedExecution.output}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Output</label>
            <pre class="bg-gray-100 p-3 rounded-md text-sm font-mono max-h-40 overflow-y-auto">{selectedExecution.output}</pre>
          </div>
        {/if}
        
        {#if selectedExecution.errorOutput}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Error Output</label>
            <pre class="bg-red-50 p-3 rounded-md text-sm font-mono max-h-40 overflow-y-auto text-red-800">{selectedExecution.errorOutput}</pre>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}