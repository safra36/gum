<script lang="ts">
  import { fly } from 'svelte/transition';
  import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';
  import { removeToast, toasts } from '$lib/stores/toast';
  import type { Toast } from '$lib/stores/toast';

  function getIcon(type: Toast['type']) {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'error':
        return XCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
      default:
        return Info;
    }
  }

  function getClasses(type: Toast['type']) {
    const base = 'flex items-start p-4 rounded-lg shadow-lg border max-w-sm w-full';
    switch (type) {
      case 'success':
        return `${base} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${base} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${base} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'info':
      default:
        return `${base} bg-blue-50 border-blue-200 text-blue-800`;
    }
  }

  function getIconClasses(type: Toast['type']) {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
      default:
        return 'text-blue-400';
    }
  }
</script>

{#if $toasts.length > 0}
  <div class="fixed top-4 right-4 z-50 space-y-2" role="region" aria-label="Notifications">
    {#each $toasts as toast (toast.id)}
      <div
        class={getClasses(toast.type)}
        role="alert"
        aria-live="polite"
        transition:fly={{ x: 300, duration: 300 }}
      >
        <div class="flex-shrink-0">
          <svelte:component this={getIcon(toast.type)} class="h-5 w-5 {getIconClasses(toast.type)}" />
        </div>
        
        <div class="ml-3 flex-1">
          <h4 class="text-sm font-medium">{toast.title}</h4>
          {#if toast.message}
            <p class="mt-1 text-sm opacity-90">{toast.message}</p>
          {/if}
        </div>
        
        {#if toast.dismissible}
          <button
            class="ml-4 flex-shrink-0 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-400"
            on:click={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            <X class="h-4 w-4 opacity-60 hover:opacity-100" />
          </button>
        {/if}
      </div>
    {/each}
  </div>
{/if}