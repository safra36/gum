<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Search, Filter, X, SortAsc, SortDesc } from 'lucide-svelte';

  export let searchQuery = '';
  export let sortBy = 'name';
  export let sortOrder = 'asc';
  export let placeholder = 'Search...';
  export let sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'created', label: 'Created Date' },
    { value: 'updated', label: 'Updated Date' }
  ];
  export let resultCount = 0;
  export let totalCount = 0;

  const dispatch = createEventDispatcher();
  
  let showFilters = false;
  let searchInput: HTMLInputElement;

  function handleSearch() {
    dispatch('search', { query: searchQuery });
  }

  function handleSort(newSortBy: string) {
    if (sortBy === newSortBy) {
      // Toggle sort order if same field
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = newSortBy;
      sortOrder = 'asc';
    }
    dispatch('sort', { sortBy, sortOrder });
    showFilters = false;
  }

  function clearSearch() {
    searchQuery = '';
    handleSearch();
    searchInput?.focus();
  }

  function toggleFilters() {
    showFilters = !showFilters;
  }

  function closeFilters() {
    showFilters = false;
  }

  // Close filters when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    if (showFilters && !target.closest('.filter-dropdown')) {
      closeFilters();
    }
  }

  // Focus search input with Ctrl/Cmd + K
  function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      searchInput?.focus();
    }
  }
</script>

<svelte:window on:click={handleClickOutside} on:keydown={handleKeydown} />

<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
  <!-- Search Input -->
  <div class="relative flex-1 max-w-md">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search class="h-4 w-4 text-gray-400 dark:text-gray-500" />
    </div>
    <input
      bind:this={searchInput}
      type="text"
      bind:value={searchQuery}
      on:input={handleSearch}
      class="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      {placeholder}
      aria-label="Search"
    />
    {#if searchQuery}
      <button
        on:click={clearSearch}
        class="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 dark:hover:text-gray-300 text-gray-400 dark:text-gray-500 transition-colors"
        aria-label="Clear search"
      >
        <X class="h-4 w-4" />
      </button>
    {/if}
    
    <!-- Keyboard shortcut hint -->
    <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
      {#if !searchQuery}
        <kbd class="hidden sm:inline-flex items-center border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
          ⌘K
        </kbd>
      {/if}
    </div>
  </div>

  <!-- Results Count and Filters -->
  <div class="flex items-center space-x-4">
    <!-- Results Count -->
    {#if totalCount > 0}
      <div class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {#if searchQuery}
          {resultCount} of {totalCount} results
        {:else}
          {totalCount} items
        {/if}
      </div>
    {/if}

    <!-- Sort/Filter Dropdown -->
    <div class="relative filter-dropdown">
      <button
        on:click={toggleFilters}
        class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        aria-label="Sort and filter options"
        aria-expanded={showFilters}
        aria-haspopup="true"
      >
        <Filter class="w-4 h-4 mr-2" />
        <span class="hidden sm:inline">Sort</span>
        {#if sortOrder === 'desc'}
          <SortDesc class="w-4 h-4 ml-2" />
        {:else}
          <SortAsc class="w-4 h-4 ml-2" />
        {/if}
      </button>

      {#if showFilters}
        <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-20">
          <div class="py-1" role="menu">
            <!-- Sort By Section -->
            <div class="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-600">
              Sort By
            </div>
            {#each sortOptions as option}
              <button
                on:click={() => handleSort(option.value)}
                class="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 {sortBy === option.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}"
                role="menuitem"
              >
                <span>{option.label}</span>
                {#if sortBy === option.value}
                  {#if sortOrder === 'desc'}
                    <SortDesc class="w-4 h-4" />
                  {:else}
                    <SortAsc class="w-4 h-4" />
                  {/if}
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  kbd {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
</style>