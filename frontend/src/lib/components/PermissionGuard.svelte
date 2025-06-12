<script lang="ts">
  import { Lock, Shield, Eye, EyeOff } from 'lucide-svelte';
  import { permissions } from '$lib/stores/user';
  import type { UserPermissions } from '$lib/stores/user';

  export let requiredPermission: keyof UserPermissions;
  export let fallbackMessage: string = 'You do not have permission to access this feature';
  export let showIcon: boolean = true;
  export let iconSize: number = 24;
  export let variant: 'full' | 'icon-only' | 'minimal' = 'full';

  $: hasPermission = $permissions[requiredPermission];
</script>

{#if hasPermission}
  <slot />
{:else}
  {#if variant === 'full'}
    <div class="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div class="text-center">
        {#if showIcon}
          <div class="flex justify-center mb-3">
            <Lock 
              size={iconSize} 
              class="text-gray-400 dark:text-gray-500" 
            />
          </div>
        {/if}
        <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">
          Access Restricted
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {fallbackMessage}
        </p>
      </div>
    </div>
  {:else if variant === 'icon-only'}
    <div class="inline-flex items-center justify-center p-2 rounded bg-gray-100 dark:bg-gray-700">
      <div title={fallbackMessage}>
        <Lock 
          size={iconSize} 
          class="text-gray-400 dark:text-gray-500" 
        />
      </div>
    </div>
  {:else if variant === 'minimal'}
    <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
      {#if showIcon}
        <Lock size={16} class="mr-2" />
      {/if}
      <span>Restricted Access</span>
    </div>
  {/if}
{/if}

<style>
  /* Add subtle animation to permission denied state */
  .permission-denied {
    animation: permissionPulse 2s ease-in-out infinite;
  }
  
  @keyframes permissionPulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
</style>