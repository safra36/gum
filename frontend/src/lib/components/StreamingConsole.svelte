<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Play, Square, Terminal, Copy, Download, Trash2 } from 'lucide-svelte';
  import { toast } from '$lib/stores/toast';
  import { api } from '$lib/services/api';

  export let script: string = '';
  export let args: string[] = [];
  export let projectId: number | undefined = undefined;
  export let stageId: number | undefined = undefined;
  export let autoStart: boolean = false;

  const dispatch = createEventDispatcher();

  let isExecuting = false;
  let executionId: string | null = null;
  let eventSource: EventSource | null = null;
  let consoleOutput: Array<{
    id: string;
    type: 'stdout' | 'stderr' | 'info' | 'error';
    content: string;
    timestamp: number;
  }> = [];
  let entryCounter = 0;
  let consoleElement: HTMLElement;
  let autoScroll = true;

  onMount(() => {
    if (autoStart && script.trim()) {
      startExecution();
    }
  });

  onDestroy(() => {
    stopExecution();
  });

  async function startExecution() {
    if (isExecuting || !script.trim()) return;

    try {
      isExecuting = true;
      consoleOutput = [];
      entryCounter = 0;
      
      addConsoleOutput('info', `Starting execution...`, Date.now());
      
      // Start the execution and get execution ID
      executionId = await api.executeStreamingScript(script, args, projectId, stageId);
      
      addConsoleOutput('info', `Execution ID: ${executionId}`, Date.now());
      
      // Connect to SSE stream
      connectToStream(executionId);
      
      dispatch('executionStarted', { executionId });
    } catch (error) {
      console.error('Failed to start execution:', error);
      addConsoleOutput('error', `Failed to start execution: ${error.message}`, Date.now());
      isExecuting = false;
      toast('Failed to start execution', 'error');
    }
  }

  function connectToStream(execId: string) {
    if (eventSource) {
      eventSource.close();
    }

    try {
      eventSource = api.createExecutionStream(execId);

      eventSource.onopen = () => {
        addConsoleOutput('info', 'Connected to execution stream', Date.now());
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleStreamMessage(data);
        } catch (error) {
          console.error('Failed to parse stream message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Stream error:', error);
        addConsoleOutput('error', 'Connection to execution stream lost', Date.now());
        
        // Attempt to reconnect after a short delay
        setTimeout(() => {
          if (isExecuting && executionId) {
            addConsoleOutput('info', 'Attempting to reconnect...', Date.now());
            connectToStream(executionId);
          }
        }, 2000);
      };
    } catch (error) {
      console.error('Failed to connect to stream:', error);
      addConsoleOutput('error', `Failed to connect to stream: ${error.message}`, Date.now());
    }
  }

  function handleStreamMessage(data: any) {
    switch (data.type) {
      case 'connected':
        addConsoleOutput('info', 'Stream connected successfully', data.timestamp);
        break;
      case 'stdout':
        addConsoleOutput('stdout', data.data, data.timestamp);
        break;
      case 'stderr':
        addConsoleOutput('stderr', data.data, data.timestamp);
        break;
      case 'close':
        addConsoleOutput('info', `Execution completed with exit code: ${data.result.exitCode}`, data.timestamp);
        isExecuting = false;
        dispatch('executionCompleted', data.result);
        stopExecution();
        break;
      case 'error':
        addConsoleOutput('error', `Execution error: ${data.error}`, data.timestamp);
        isExecuting = false;
        dispatch('executionError', data.error);
        stopExecution();
        break;
      case 'ping':
        // Ignore keepalive pings
        break;
      default:
        console.log('Unknown stream message type:', data.type);
    }
  }

  function addConsoleOutput(type: 'stdout' | 'stderr' | 'info' | 'error', content: string, timestamp: number) {
    const id = `${timestamp}_${++entryCounter}`;
    consoleOutput = [...consoleOutput, { id, type, content, timestamp }];
    
    if (autoScroll) {
      setTimeout(() => {
        if (consoleElement) {
          consoleElement.scrollTop = consoleElement.scrollHeight;
        }
      }, 10);
    }
  }

  function stopExecution() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    isExecuting = false;
    executionId = null;
  }

  function clearConsole() {
    consoleOutput = [];
    entryCounter = 0;
  }

  function copyOutput() {
    const output = consoleOutput
      .map(entry => `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.content}`)
      .join('\n');
    
    navigator.clipboard.writeText(output).then(() => {
      toast('Console output copied to clipboard', 'success');
    }).catch(() => {
      toast('Failed to copy to clipboard', 'error');
    });
  }

  function downloadOutput() {
    const output = consoleOutput
      .map(entry => `[${new Date(entry.timestamp).toISOString()}] [${entry.type.toUpperCase()}] ${entry.content}`)
      .join('\n');
    
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-log-${executionId || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getOutputClass(type: string): string {
    switch (type) {
      case 'stdout':
        return 'text-gray-900 dark:text-gray-100';
      case 'stderr':
        return 'text-red-600 dark:text-red-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      case 'error':
        return 'text-red-700 dark:text-red-300 font-semibold';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  function handleScroll() {
    if (consoleElement) {
      const { scrollTop, scrollHeight, clientHeight } = consoleElement;
      autoScroll = scrollTop + clientHeight >= scrollHeight - 10;
    }
  }
</script>

<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
  <!-- Header -->
  <div class="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <Terminal class="text-gray-600 dark:text-gray-400" size={20} />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Execution Console
        </h3>
        {#if executionId}
          <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">
            ID: {executionId}
          </span>
        {/if}
      </div>
      
      <div class="flex items-center space-x-2">
        <!-- Auto-scroll toggle -->
        <label class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            bind:checked={autoScroll}
            class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span>Auto-scroll</span>
        </label>
        
        <!-- Action buttons -->
        <button
          on:click={copyOutput}
          class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          title="Copy output"
          disabled={consoleOutput.length === 0}
        >
          <Copy size={16} />
        </button>
        
        <button
          on:click={downloadOutput}
          class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          title="Download output"
          disabled={consoleOutput.length === 0}
        >
          <Download size={16} />
        </button>
        
        <button
          on:click={clearConsole}
          class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          title="Clear console"
          disabled={consoleOutput.length === 0}
        >
          <Trash2 size={16} />
        </button>
        
        <div class="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
        
        {#if isExecuting}
          <button
            on:click={stopExecution}
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <Square size={16} class="mr-2" />
            Stop
          </button>
        {:else}
          <button
            on:click={startExecution}
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!script.trim()}
          >
            <Play size={16} class="mr-2" />
            Execute
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Console output -->
  <div
    bind:this={consoleElement}
    on:scroll={handleScroll}
    class="h-96 overflow-y-auto bg-black dark:bg-gray-900 text-green-400 dark:text-green-300 font-mono text-sm p-4 space-y-1"
  >
    {#if consoleOutput.length === 0}
      <div class="text-gray-500 dark:text-gray-400 italic">
        Console output will appear here...
      </div>
    {:else}
      {#each consoleOutput as entry (entry.id)}
        <div class="flex">
          <span class="text-gray-500 dark:text-gray-400 text-xs mr-3 flex-shrink-0 w-20">
            {formatTimestamp(entry.timestamp)}
          </span>
          <pre class={`whitespace-pre-wrap break-words flex-1 ${getOutputClass(entry.type)}`}>{entry.content}</pre>
        </div>
      {/each}
    {/if}
    
    {#if isExecuting}
      <div class="flex items-center space-x-2 text-yellow-400 dark:text-yellow-300">
        <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
        <span class="text-xs">Executing...</span>
      </div>
    {/if}
  </div>
</div>