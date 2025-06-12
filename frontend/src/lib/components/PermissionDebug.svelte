<script lang="ts">
  import { user, permissions, isAuthenticated } from '$lib/stores/user';
  import { authToken } from '../../stores';
  
  $: console.log('Permission Debug:', {
    user: $user,
    permissions: $permissions,
    isAuthenticated: $isAuthenticated,
    authToken: $authToken ? 'present' : 'missing'
  });
</script>

<div class="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600 p-4 rounded-lg">
  <h3 class="font-bold text-yellow-800 dark:text-yellow-200 mb-2">Permission Debug Info</h3>
  
  <div class="space-y-2 text-sm">
    <div>
      <strong>User:</strong> 
      {#if $user}
        {$user.username} ({$user.role})
      {:else}
        Not loaded
      {/if}
    </div>
    
    <div>
      <strong>Auth Token:</strong> 
      {$authToken ? 'Present' : 'Missing'}
    </div>
    
    <div>
      <strong>Is Authenticated:</strong> 
      {$isAuthenticated ? 'Yes' : 'No'}
    </div>
    
    <div class="grid grid-cols-2 gap-2 mt-3">
      <div><strong>canEdit:</strong> {$permissions.canEdit ? '✅' : '❌'}</div>
      <div><strong>canExecute:</strong> {$permissions.canExecute ? '✅' : '❌'}</div>
      <div><strong>canViewLogs:</strong> {$permissions.canViewLogs ? '✅' : '❌'}</div>
      <div><strong>canCreateProject:</strong> {$permissions.canCreateProject ? '✅' : '❌'}</div>
      <div><strong>canSetCron:</strong> {$permissions.canSetCron ? '✅' : '❌'}</div>
      <div><strong>canViewGitLogs:</strong> {$permissions.canViewGitLogs ? '✅' : '❌'}</div>
    </div>
  </div>
</div>