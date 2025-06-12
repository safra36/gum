<script lang="ts">
  export let type: 'card' | 'list' | 'text' | 'button' | 'avatar' | 'table' = 'card';
  export let count: number = 1;
  export let height: string = 'auto';
  export let width: string = '100%';
  export let className: string = '';
</script>

<div class="animate-pulse {className}" style="height: {height}; width: {width};">
  {#if type === 'card'}
    {#each Array(count) as _, i}
      <div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-6 mb-4">
        <div class="flex items-center space-x-4 mb-4">
          <div class="rounded-full bg-gray-300 dark:bg-gray-600 h-10 w-10"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
            <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
          <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
        </div>
        <div class="flex justify-end space-x-2 mt-4">
          <div class="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
          <div class="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
        </div>
      </div>
    {/each}
  {:else if type === 'list'}
    {#each Array(count) as _, i}
      <div class="flex items-center space-x-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="rounded-full bg-gray-300 dark:bg-gray-600 h-8 w-8"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
          <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
        <div class="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
      </div>
    {/each}
  {:else if type === 'text'}
    {#each Array(count) as _, i}
      <div class="space-y-2 mb-4">
        <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-11/12"></div>
        <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/5"></div>
      </div>
    {/each}
  {:else if type === 'button'}
    {#each Array(count) as _, i}
      <div class="h-10 bg-gray-300 dark:bg-gray-600 rounded mr-2 mb-2 inline-block" style="width: 100px;"></div>
    {/each}
  {:else if type === 'avatar'}
    {#each Array(count) as _, i}
      <div class="rounded-full bg-gray-300 dark:bg-gray-600 h-12 w-12 mr-2"></div>
    {/each}
  {:else if type === 'table'}
    <div class="space-y-3">
      <!-- Table Header -->
      <div class="grid grid-cols-4 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
        {#each Array(4) as _, i}
          <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        {/each}
      </div>
      <!-- Table Rows -->
      {#each Array(count) as _, i}
        <div class="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          {#each Array(4) as _, j}
            <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>