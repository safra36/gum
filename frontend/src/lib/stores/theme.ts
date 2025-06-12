import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>('system');

  function setTheme(theme: Theme) {
    if (!browser) return;
    
    set(theme);
    localStorage.setItem('theme', theme);
    
    updateDocumentClass(theme);
  }

  function toggleTheme() {
    update(current => {
      const newTheme = current === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      return newTheme;
    });
  }

  function updateDocumentClass(theme: Theme) {
    if (!browser) return;

    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Apply the appropriate theme
    if (theme === 'system') {
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else {
      root.classList.add(theme);
    }
  }

  function initializeTheme() {
    if (!browser) return;

    const stored = localStorage.getItem('theme') as Theme;
    const theme = stored || 'system';
    
    set(theme);
    updateDocumentClass(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      update(current => {
        if (current === 'system') {
          updateDocumentClass('system');
        }
        return current;
      });
    });
  }

  return {
    subscribe,
    setTheme,
    toggleTheme,
    initializeTheme
  };
}

export const theme = createThemeStore();

// Auto-initialize when the module loads
if (browser) {
  theme.initializeTheme();
}