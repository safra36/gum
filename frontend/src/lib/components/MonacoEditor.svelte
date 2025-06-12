<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
  import { browser } from '$app/environment';
  
  export let value: string = '';
  export let language: string = 'shell';
  export let theme: string = 'vs-dark';
  export let readOnly: boolean = false;
  export let height: string = '300px';
  export let width: string = '100%';
  export let minimap: boolean = false;
  export let fontSize: number = 14;
  export let wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded' = 'on';
  export let lineNumbers: 'on' | 'off' | 'relative' | 'interval' = 'on';
  export let placeholder: string = '';

  const dispatch = createEventDispatcher();
  
  let editor: any;
  let monaco: any;
  let editorContainer: HTMLDivElement;
  let isLoading = true;
  let error = '';

  async function initializeEditor() {
    if (!browser) return;
    
    try {
      // Wait for the DOM to be fully rendered
      await tick();
      
      // Wait for the editor container to be available
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max
      while ((!editorContainer || !editorContainer.isConnected) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // If still no container after waiting, throw an error with more info
      if (!editorContainer || !editorContainer.isConnected) {
        console.error('Monaco Editor Debug Info:', {
          editorContainer,
          isConnected: editorContainer?.isConnected,
          attempts,
          browser,
          isLoading,
          document: typeof document !== 'undefined',
          windowLoaded: typeof window !== 'undefined'
        });
        throw new Error(`Editor container not available or not connected to DOM after ${attempts} attempts. Check if the component is properly mounted.`);
      }
      
      console.log('Monaco Editor: Container found, proceeding with initialization');
      
      // Dynamically import Monaco Editor
      monaco = await import('monaco-editor');
      
      // Configure Monaco Editor
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
      
      // Define shell language if not already defined
      if (!monaco.languages.getLanguages().find((lang: any) => lang.id === 'shell')) {
        monaco.languages.register({ id: 'shell' });
        monaco.languages.setMonarchTokensProvider('shell', {
          tokenizer: {
            root: [
              [/#.*$/, 'comment'],
              [/".*?"/, 'string'],
              [/'.*?'/, 'string'],
              [/\$\w+/, 'variable'],
              [/\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|export|source|alias|cd|ls|grep|awk|sed|cat|echo|printf)\b/, 'keyword'],
              [/[|&;()<>]/, 'delimiter'],
              [/[a-zA-Z_]\w*/, 'identifier'],
              [/\d+/, 'number'],
            ]
          }
        });
      }

      // Wait for the DOM element to be available
      if (!editorContainer) {
        throw new Error('Editor container not available');
      }
      
      // Double-check that the element is properly mounted
      if (!editorContainer.parentElement) {
        throw new Error('Editor container not mounted in DOM');
      }

      // Create editor instance
      editor = monaco.editor.create(editorContainer, {
        value: value,
        language: language,
        theme: theme,
        readOnly: readOnly,
        minimap: { enabled: minimap },
        fontSize: fontSize,
        wordWrap: wordWrap,
        lineNumbers: lineNumbers,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        contextmenu: true,
        selectOnLineNumbers: true,
        roundedSelection: false,
        renderIndentGuides: true,
        cursorBlinking: 'blink',
        cursorSmoothCaretAnimation: 'on',
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: 'never',
          seedSearchStringFromSelection: 'always'
        },
        folding: true,
        foldingHighlight: true,
        showUnused: true,
        bracketPairColorization: {
          enabled: true
        },
        accessibilitySupport: 'auto',
        ariaLabel: 'Code Editor'
      });

      // Set placeholder if provided
      if (placeholder && !value) {
        const placeholderModel = monaco.editor.createModel(placeholder, language);
        editor.setModel(placeholderModel);
        editor.updateOptions({ readOnly: true });
        
        editor.onDidFocusEditorText(() => {
          if (editor.getValue() === placeholder) {
            editor.setValue('');
            editor.updateOptions({ readOnly: readOnly });
          }
        });
      }

      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        const newValue = editor.getValue();
        if (newValue !== value) {
          value = newValue;
          dispatch('change', { value: newValue });
        }
      });

      // Listen for focus events
      editor.onDidFocusEditorText(() => {
        dispatch('focus');
      });

      editor.onDidBlurEditorText(() => {
        dispatch('blur');
      });

      // Add keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        dispatch('save', { value: editor.getValue() });
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        editor.getAction('actions.find').run();
      });

      isLoading = false;
      dispatch('ready', { editor, monaco });
      
    } catch (err) {
      console.error('Failed to load Monaco Editor:', err);
      error = 'Failed to load code editor. Please refresh the page to try again.';
      isLoading = false;
      
      // Try to reinitialize after a delay
      setTimeout(() => {
        if (!editor && editorContainer) {
          console.log('Retrying Monaco Editor initialization...');
          isLoading = true;
          error = '';
          initializeEditor();
        }
      }, 2000);
    }
  }

  onMount(() => {
    // Small delay to ensure the component is fully rendered
    setTimeout(initializeEditor, 100);
  });


  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
  });

  // Reactive updates
  $: if (editor && value !== editor.getValue()) {
    const position = editor.getPosition();
    editor.setValue(value);
    if (position) {
      editor.setPosition(position);
    }
  }

  $: if (editor && language) {
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  }

  $: if (editor && theme) {
    monaco.editor.setTheme(theme);
  }

  $: if (editor && typeof readOnly === 'boolean') {
    editor.updateOptions({ readOnly });
  }

  // Public methods
  export function focus() {
    if (editor) {
      editor.focus();
    }
  }

  export function getValue() {
    return editor ? editor.getValue() : value;
  }

  export function setValue(newValue: string) {
    if (editor) {
      editor.setValue(newValue);
    } else {
      value = newValue;
    }
  }

  export function insertText(text: string) {
    if (editor) {
      const position = editor.getPosition();
      const range = new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      );
      editor.executeEdits('insert-text', [
        { range, text, forceMoveMarkers: true }
      ]);
    }
  }

  export function formatCode() {
    if (editor) {
      editor.getAction('editor.action.formatDocument').run();
    }
  }

  export function resize() {
    if (editor) {
      editor.layout();
    }
  }
</script>

<div class="monaco-editor-wrapper" style="height: {height}; width: {width};">
  {#if isLoading}
    <div class="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md">
      <div class="flex flex-col items-center space-y-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="text-sm text-gray-600 dark:text-gray-400">Loading editor...</span>
      </div>
    </div>
  {:else if error}
    <div class="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-md">
      <div class="text-center">
        <p class="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
        <p class="text-red-600 dark:text-red-500 text-xs mt-1">Please refresh the page to try again</p>
      </div>
    </div>
  {:else}
    <div 
      bind:this={editorContainer} 
      class="monaco-editor-container h-full w-full border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden"
      role="textbox"
      aria-label="Code Editor"
      tabindex="0"
    ></div>
  {/if}
</div>

<style>
  .monaco-editor-wrapper {
    position: relative;
  }

  .monaco-editor-container {
    position: relative;
  }

  /* Custom scrollbar for Monaco Editor */
  :global(.monaco-editor .monaco-scrollable-element > .scrollbar) {
    background: rgba(0, 0, 0, 0.1);
  }

  :global(.monaco-editor .monaco-scrollable-element > .scrollbar > .slider) {
    background: rgba(0, 0, 0, 0.4);
  }

  :global(.monaco-editor .monaco-scrollable-element > .scrollbar > .slider:hover) {
    background: rgba(0, 0, 0, 0.6);
  }

  /* Dark mode scrollbar */
  :global(.dark .monaco-editor .monaco-scrollable-element > .scrollbar) {
    background: rgba(255, 255, 255, 0.1);
  }

  :global(.dark .monaco-editor .monaco-scrollable-element > .scrollbar > .slider) {
    background: rgba(255, 255, 255, 0.4);
  }

  :global(.dark .monaco-editor .monaco-scrollable-element > .scrollbar > .slider:hover) {
    background: rgba(255, 255, 255, 0.6);
  }
</style>