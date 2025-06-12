<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-svelte';

  export let status: 'success' | 'error' | 'warning' | 'pending' | 'loading' | 'idle' = 'idle';
  export let message: string = '';
  export let showPulse: boolean = true;
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let autoRefresh: boolean = false;
  export let refreshInterval: number = 5000; // 5 seconds

  let refreshTimer: number | null = null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24
  };

  function getStatusIcon(currentStatus: typeof status) {
    switch (currentStatus) {
      case 'success':
        return CheckCircle;
      case 'error':
        return XCircle;
      case 'warning':
        return AlertTriangle;
      case 'pending':
        return Clock;
      case 'loading':
        return Loader2;
      default:
        return Clock;
    }
  }

  function getStatusColor(currentStatus: typeof status) {
    switch (currentStatus) {
      case 'success':
        return 'text-green-500 dark:text-green-400';
      case 'error':
        return 'text-red-500 dark:text-red-400';
      case 'warning':
        return 'text-yellow-500 dark:text-yellow-400';
      case 'pending':
        return 'text-blue-500 dark:text-blue-400';
      case 'loading':
        return 'text-gray-500 dark:text-gray-400';
      default:
        return 'text-gray-400 dark:text-gray-500';
    }
  }

  function getBackgroundColor(currentStatus: typeof status) {
    switch (currentStatus) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/20';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'pending':
        return 'bg-blue-100 dark:bg-blue-900/20';
      case 'loading':
        return 'bg-gray-100 dark:bg-gray-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800';
    }
  }

  function shouldPulse(currentStatus: typeof status) {
    return showPulse && (currentStatus === 'loading' || currentStatus === 'pending');
  }

  function refresh() {
    // Dispatch refresh event for parent to handle
    const event = new CustomEvent('refresh');
    document.dispatchEvent(event);
  }

  onMount(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimer = setInterval(refresh, refreshInterval);
    }
  });

  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
  });

  // Update timer when props change
  $: if (autoRefresh && refreshInterval > 0) {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refresh, refreshInterval);
  } else if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
</script>

<div class="inline-flex items-center space-x-2">
  <!-- Status Icon -->
  <div 
    class="inline-flex items-center justify-center {sizeClasses[size]} rounded-full {getBackgroundColor(status)} {shouldPulse(status) ? 'animate-pulse' : ''}"
    role="img"
    aria-label={`Status: ${status}${message ? ` - ${message}` : ''}`}
  >
    <svelte:component 
      this={getStatusIcon(status)} 
      size={iconSize[size]} 
      class="{getStatusColor(status)} {status === 'loading' ? 'animate-spin' : ''}"
    />
  </div>

  <!-- Status Message -->
  {#if message}
    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
      {message}
    </span>
  {/if}

  <!-- Live Indicator -->
  {#if autoRefresh}
    <div class="inline-flex items-center space-x-1">
      <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span class="text-xs text-gray-500 dark:text-gray-400">Live</span>
    </div>
  {/if}
</div>