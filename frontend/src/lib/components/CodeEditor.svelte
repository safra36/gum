<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { Copy, Download, Maximize2, Minimize2 } from 'lucide-svelte';
  
  export let value: string = '';
  export let placeholder: string = '#!/bin/bash\necho "Hello World"';
  export let height: string = '300px';
  export let readOnly: boolean = false;
  export let showLineNumbers: boolean = true;
  export let fontSize: number = 14;
  export let tabSize: number = 2;

  const dispatch = createEventDispatcher();
  
  let textarea: HTMLTextAreaElement;
  let lineNumbersElement: HTMLElement;
  let containerElement: HTMLElement;
  let isFullscreen = false;
  let lineHeight = 1.4;
  
  // Calculate line numbers
  $: lines = value.split('\n');
  $: lineNumbers = Array.from({ length: lines.length }, (_, i) => i + 1);
  
  // Syntax highlighting patterns for shell scripts
  const syntaxPatterns = [
    { pattern: /#.*$/gm, className: 'comment' }, // Comments
    { pattern: /"([^"\\\\]|\\\\.)*"/g, className: 'string' }, // Double quoted strings
    { pattern: /'([^'\\\\]|\\\\.)*'/g, className: 'string' }, // Single quoted strings
    { pattern: /\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?/g, className: 'variable' }, // Variables
    { pattern: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|export|source|alias|cd|ls|grep|awk|sed|cat|echo|printf|mkdir|rm|cp|mv|chmod|chown|sudo|apt|yum|npm|yarn|git|docker|kubectl)\b/g, className: 'keyword' }, // Keywords
    { pattern: /[|&;()<>]/g, className: 'operator' }, // Operators
    { pattern: /\b\d+\b/g, className: 'number' }, // Numbers
  ];

  function handleInput() {
    try {
      if (!textarea) return;
      // Always use the clean textarea value (no HTML)
      value = textarea.value;
      dispatch('change', { value: textarea.value });
      updateLineNumbers();
    } catch (error) {
      console.error('Input handler error:', error);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      insertTab();
    } else if (event.key === 'Enter') {
      // Auto-indent on new line
      const cursorPos = textarea.selectionStart;
      const beforeCursor = value.substring(0, cursorPos);
      const currentLine = beforeCursor.split('\n').pop() || '';
      const indent = currentLine.match(/^\s*/)?.[0] || '';
      
      // Insert newline with same indentation
      setTimeout(() => {
        const newPos = cursorPos + 1 + indent.length;
        value = value.substring(0, cursorPos + 1) + indent + value.substring(cursorPos + 1);
        textarea.value = value;
        textarea.setSelectionRange(newPos, newPos);
        handleInput();
      }, 0);
    } else if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      dispatch('save', { value });
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      // Focus on browser's find
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
    }
  }

  function insertTab() {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const spaces = ' '.repeat(tabSize);
    
    value = value.substring(0, start) + spaces + value.substring(end);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tabSize, start + tabSize);
      handleInput();
    }, 0);
  }

  function updateLineNumbers() {
    try {
      if (!showLineNumbers || !lineNumbersElement || !textarea) return;
      
      // Sync scroll position
      lineNumbersElement.scrollTop = textarea.scrollTop;
    } catch (error) {
      console.error('Update line numbers error:', error);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(value).then(() => {
      dispatch('copy');
    });
  }

  function downloadFile() {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script.sh';
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    if (isFullscreen) {
      containerElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function handleScroll() {
    updateLineNumbers();
  }

  onMount(() => {
    updateLineNumbers();
    
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      isFullscreen = !!document.fullscreenElement;
    });
  });

  function applySyntaxHighlighting(text: string): string {
    try {
      if (!text || typeof text !== 'string') return '';
      
      // Escape HTML entities first to prevent XSS
      let highlighted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      // Simple regex-based highlighting to avoid complex parsing
      highlighted = highlighted
        // Comments
        .replace(/#.*$/gm, '<span class="syntax-comment">$&</span>')
        // Strings
        .replace(/"([^"\\]|\\.)*"/g, '<span class="syntax-string">$&</span>')
        .replace(/'([^'\\]|\\.)*'/g, '<span class="syntax-string">$&</span>')
        // Variables
        .replace(/\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?/g, '<span class="syntax-variable">$&</span>')
        // Keywords
        .replace(/\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|export|source|alias|cd|ls|grep|awk|sed|cat|echo|printf|mkdir|rm|cp|mv|chmod|chown|sudo|apt|yum|npm|yarn|git|docker|kubectl)\b/g, '<span class="syntax-keyword">$&</span>')
        // Numbers
        .replace(/\b\d+\b/g, '<span class="syntax-number">$&</span>')
        // Operators
        .replace(/[|&;()<>]/g, '<span class="syntax-operator">$&</span>');
      
      return highlighted;
    } catch (error) {
      console.error('Syntax highlighting error:', error);
      return text || '';
    }
  }

  onDestroy(() => {
    if (isFullscreen) {
      document.exitFullscreen?.();
    }
  });

  // Reactive updates
  $: if (textarea && value !== textarea.value) {
    textarea.value = value;
    updateLineNumbers();
  }
</script>

<div 
  bind:this={containerElement}
  class="code-editor-container {isFullscreen ? 'fullscreen' : ''}"
  style="height: {height}; font-size: {fontSize}px;"
>
  <!-- Toolbar -->
  <div class="toolbar bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 px-3 py-2 flex justify-between items-center">
    <div class="flex items-center space-x-2">
      <span class="text-xs text-gray-600 dark:text-gray-400">Shell Script Editor</span>
      {#if !readOnly}
        <span class="text-xs text-gray-500 dark:text-gray-500">• Tab for indent • Ctrl+S to save</span>
      {/if}
    </div>
    
    <div class="flex items-center space-x-1">
      <button
        type="button"
        on:click={copyToClipboard}
        class="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded"
        title="Copy to clipboard"
      >
        <Copy size={16} />
      </button>
      
      <button
        type="button"
        on:click={downloadFile}
        class="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded"
        title="Download as file"
      >
        <Download size={16} />
      </button>
      
      <button
        type="button"
        on:click={toggleFullscreen}
        class="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {#if isFullscreen}
          <Minimize2 size={16} />
        {:else}
          <Maximize2 size={16} />
        {/if}
      </button>
    </div>
  </div>

  <!-- Editor -->
  <div class="editor-content flex flex-1 overflow-hidden">
    <!-- Line Numbers -->
    {#if showLineNumbers}
      <div 
        bind:this={lineNumbersElement}
        class="line-numbers bg-gray-50 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 px-2 py-3 text-right select-none overflow-hidden"
        style="line-height: {lineHeight}; font-size: {fontSize}px;"
      >
        {#each lineNumbers as lineNum}
          <div class="text-gray-500 dark:text-gray-400 text-sm font-mono whitespace-nowrap">
            {lineNum}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Text Area -->
    <div class="textarea-wrapper flex-1 relative">
      <textarea
        bind:this={textarea}
        bind:value={value}
        on:input={handleInput}
        on:keydown={handleKeyDown}
        on:scroll={handleScroll}
        {placeholder}
        readonly={readOnly}
        class="textarea-input w-full h-full resize-none border-0 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono p-3"
        style="line-height: {lineHeight}; font-size: {fontSize}px; tab-size: {tabSize};"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
      ></textarea>

      <!-- Syntax highlighting overlay -->
      <div 
        class="syntax-overlay absolute inset-0 pointer-events-none p-3 font-mono whitespace-pre-wrap overflow-hidden"
        style="line-height: {lineHeight}; font-size: {fontSize}px; tab-size: {tabSize};"
        aria-hidden="true"
      >
        {@html applySyntaxHighlighting(value)}
      </div>
    </div>
  </div>

  <!-- Status bar -->
  <div class="status-bar bg-gray-50 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 px-3 py-1 text-xs text-gray-600 dark:text-gray-400">
    Lines: {lines.length} | Characters: {value.length}
  </div>
</div>

<style>
  .code-editor-container {
    display: flex;
    flex-direction: column;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    overflow: hidden;
    background: white;
  }
  
  .code-editor-container.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    height: 100vh !important;
    border-radius: 0;
  }
  
  :global(.dark) .code-editor-container {
    border-color: #4b5563;
    background: #111827;
  }
  
  .editor-content {
    position: relative;
    min-height: 200px;
  }
  
  .line-numbers {
    min-width: 3rem;
    user-select: none;
  }
  
  .textarea-wrapper {
    position: relative;
  }
  
  .textarea-input {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
    background: transparent !important;
    color: transparent;
    caret-color: #374151;
  }
  
  :global(.dark) .textarea-input {
    caret-color: #d1d5db;
  }
  
  .syntax-overlay {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
    color: #374151;
    z-index: 1;
  }
  
  :global(.dark) .syntax-overlay {
    color: #d1d5db;
  }
  
  /* Syntax highlighting */
  :global(.syntax-comment) {
    color: #6b7280;
    font-style: italic;
  }
  
  :global(.syntax-string) {
    color: #059669;
  }
  
  :global(.syntax-variable) {
    color: #dc2626;
    font-weight: 600;
  }
  
  :global(.syntax-keyword) {
    color: #7c3aed;
    font-weight: 600;
  }
  
  :global(.syntax-operator) {
    color: #ea580c;
    font-weight: 600;
  }
  
  :global(.syntax-number) {
    color: #0891b2;
  }
  
  /* Dark mode syntax highlighting */
  :global(.dark .syntax-comment) {
    color: #9ca3af;
  }
  
  :global(.dark .syntax-string) {
    color: #10b981;
  }
  
  :global(.dark .syntax-variable) {
    color: #f87171;
  }
  
  :global(.dark .syntax-keyword) {
    color: #a78bfa;
  }
  
  :global(.dark .syntax-operator) {
    color: #fb923c;
  }
  
  :global(.dark .syntax-number) {
    color: #22d3ee;
  }
  
  /* Scrollbar styling */
  .textarea-input::-webkit-scrollbar,
  .line-numbers::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .textarea-input::-webkit-scrollbar-track,
  .line-numbers::-webkit-scrollbar-track {
    background: #f3f4f6;
  }
  
  :global(.dark) .textarea-input::-webkit-scrollbar-track,
  :global(.dark) .line-numbers::-webkit-scrollbar-track {
    background: #374151;
  }
  
  .textarea-input::-webkit-scrollbar-thumb,
  .line-numbers::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 4px;
  }
  
  .textarea-input::-webkit-scrollbar-thumb:hover,
  .line-numbers::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
</style>