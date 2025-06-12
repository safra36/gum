<script lang="ts">
  import { Sun, Moon, Monitor } from 'lucide-svelte';
  import { theme } from '$lib/stores/theme';
  import type { Theme } from '$lib/stores/theme';

  let showDropdown = false;

  function setTheme(newTheme: Theme) {
    theme.setTheme(newTheme);
    showDropdown = false;
  }

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  function closeDropdown() {
    showDropdown = false;
  }

  function getThemeIcon(currentTheme: Theme) {
    switch (currentTheme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
      default:
        return Monitor;
    }
  }

  function getThemeLabel(currentTheme: Theme) {
    switch (currentTheme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
      default:
        return 'System';
    }
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    if (showDropdown && !target.closest('.theme-toggle')) {
      closeDropdown();
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="relative theme-toggle">
  <button
    on:click={toggleDropdown}
    class="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
    aria-label="Toggle theme"
    aria-expanded={showDropdown}
    aria-haspopup="true"
  >
    <svelte:component this={getThemeIcon($theme)} size={18} />
    <span class="text-sm font-medium hidden sm:block">{getThemeLabel($theme)}</span>
    <svg 
      class="w-4 h-4 transition-transform {showDropdown ? 'rotate-180' : ''}" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if showDropdown}
    <div 
      class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-50"
      role="menu"
      aria-orientation="vertical"
    >
      <div class="py-1">
        <button
          on:click={() => setTheme('light')}
          class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 {$theme === 'light' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}"
          role="menuitem"
        >
          <Sun size={16} class="mr-3" />
          Light
          {#if $theme === 'light'}
            <svg class="ml-auto w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          {/if}
        </button>
        
        <button
          on:click={() => setTheme('dark')}
          class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 {$theme === 'dark' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}"
          role="menuitem"
        >
          <Moon size={16} class="mr-3" />
          Dark
          {#if $theme === 'dark'}
            <svg class="ml-auto w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          {/if}
        </button>
        
        <button
          on:click={() => setTheme('system')}
          class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 {$theme === 'system' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}"
          role="menuitem"
        >
          <Monitor size={16} class="mr-3" />
          System
          {#if $theme === 'system'}
            <svg class="ml-auto w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>