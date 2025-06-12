<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let value: string = '';
  export let placeholder: string = '#!/bin/bash\necho "Hello World"';
  export let height: string = '400px';
  export let readOnly: boolean = false;

  const dispatch = createEventDispatcher();
  
  let textarea: HTMLTextAreaElement;
  let highlightElement: HTMLElement;
  
  // Shell script keywords and patterns for highlighting
  const keywords = [
    'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 
    'case', 'esac', 'function', 'return', 'exit', 'export', 'source', 
    'alias', 'cd', 'ls', 'grep', 'awk', 'sed', 'cat', 'echo', 'printf',
    'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'sudo', 'apt', 'yum',
    'npm', 'yarn', 'git', 'docker', 'kubectl', 'node', 'python', 'pip'
  ];
  
  function highlightSyntax(text: string): string {
    if (!text) return '';
    
    let highlighted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Comments (# to end of line)
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
    
    // Strings (double and single quotes)
    highlighted = highlighted.replace(/"([^"\\]|\\.)*"/g, '<span class="string">$&</span>');
    highlighted = highlighted.replace(/'([^'\\]|\\.)*'/g, '<span class="string">$&</span>');
    
    // Variables ($VAR or ${VAR})
    highlighted = highlighted.replace(/\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?/g, '<span class="variable">$&</span>');
    
    // Keywords
    const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    highlighted = highlighted.replace(keywordPattern, '<span class="keyword">$&</span>');
    
    // Numbers
    highlighted = highlighted.replace(/\b\d+\b/g, '<span class="number">$&</span>');
    
    // Operators and symbols (only specific shell operators)
    highlighted = highlighted.replace(/[|&;()]/g, '<span class="operator">$&</span>');
    highlighted = highlighted.replace(/\s+(&gt;|&lt;)\s+/g, ' <span class="operator">$1</span> ');
    
    return highlighted;
  }
  
  function handleInput() {
    if (!textarea) return;
    value = textarea.value;
    updateHighlight();
    dispatch('change', { value });
  }
  
  function updateHighlight() {
    if (highlightElement && textarea) {
      // Use the actual value, not the textarea value to avoid placeholder interference
      const textToHighlight = value || '';
      highlightElement.innerHTML = highlightSyntax(textToHighlight) + '\n';
      highlightElement.scrollTop = textarea.scrollTop;
      highlightElement.scrollLeft = textarea.scrollLeft;
    }
  }
  
  function handleScroll() {
    if (highlightElement && textarea) {
      highlightElement.scrollTop = textarea.scrollTop;
      highlightElement.scrollLeft = textarea.scrollLeft;
    }
  }
  
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      value = value.substring(0, start) + '  ' + value.substring(end);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        handleInput();
      }, 0);
    }
  }
  
  // Reactive statement to sync textarea with external value changes
  $: if (textarea && textarea.value !== (value || '')) {
    textarea.value = value || '';
  }
  
  // Reactive statement to update highlighting whenever value changes
  $: if (highlightElement) {
    updateHighlight();
  }
</script>

<div class="simple-editor" style="height: {height};">
  <div class="editor-container">
    <!-- Syntax highlighting overlay -->
    <pre 
      bind:this={highlightElement}
      class="highlight-layer"
      aria-hidden="true"
    ></pre>
    
    <!-- Text input -->
    <textarea
      bind:this={textarea}
      bind:value={value}
      on:input={handleInput}
      on:scroll={handleScroll}
      on:keydown={handleKeyDown}
      {placeholder}
      readonly={readOnly}
      class="text-layer"
      spellcheck="false"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
    ></textarea>
  </div>
</div>

<style>
  .simple-editor {
    position: relative;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  }
  
  :global(.dark) .simple-editor {
    border-color: #4b5563;
    background: #1f2937;
  }
  
  .editor-container {
    position: relative;
    height: 100%;
  }
  
  .highlight-layer,
  .text-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 12px;
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    font-family: inherit;
    white-space: pre-wrap;
    word-wrap: break-word;
    border: none;
    outline: none;
    resize: none;
    overflow: auto;
    box-sizing: border-box;
  }
  
  .highlight-layer {
    color: transparent;
    pointer-events: none;
    z-index: 1;
  }
  
  .text-layer {
    background: transparent;
    color: #374151;
    z-index: 2;
    caret-color: #374151;
  }
  
  :global(.dark) .text-layer {
    color: #d1d5db;
    caret-color: #d1d5db;
  }
  
  /* Make text transparent but keep caret visible */
  .text-layer {
    color: transparent;
  }
  
  .text-layer::selection {
    background: rgba(59, 130, 246, 0.3);
  }
  
  /* Set highlight layer to have proper text colors for light mode */
  .highlight-layer {
    color: #374151;
  }
  
  :global(.dark) .highlight-layer {
    color: #d1d5db;
  }
  
  /* Syntax highlighting colors */
  :global(.simple-editor .keyword) {
    color: #7c3aed;
    font-weight: 600;
  }
  
  :global(.simple-editor .string) {
    color: #059669;
  }
  
  :global(.simple-editor .comment) {
    color: #6b7280;
    font-style: italic;
  }
  
  :global(.simple-editor .variable) {
    color: #dc2626;
    font-weight: 600;
  }
  
  :global(.simple-editor .number) {
    color: #0891b2;
  }
  
  :global(.simple-editor .operator) {
    color: #ea580c;
    font-weight: 600;
  }
  
  /* Dark mode syntax highlighting */
  :global(.dark .simple-editor .keyword) {
    color: #a78bfa;
  }
  
  :global(.dark .simple-editor .string) {
    color: #10b981;
  }
  
  :global(.dark .simple-editor .comment) {
    color: #9ca3af;
  }
  
  :global(.dark .simple-editor .variable) {
    color: #f87171;
  }
  
  :global(.dark .simple-editor .number) {
    color: #22d3ee;
  }
  
  :global(.dark .simple-editor .operator) {
    color: #fb923c;
  }
  
  /* Scrollbar styling */
  .text-layer::-webkit-scrollbar,
  .highlight-layer::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .text-layer::-webkit-scrollbar-track,
  .highlight-layer::-webkit-scrollbar-track {
    background: #f3f4f6;
  }
  
  :global(.dark) .text-layer::-webkit-scrollbar-track,
  :global(.dark) .highlight-layer::-webkit-scrollbar-track {
    background: #374151;
  }
  
  .text-layer::-webkit-scrollbar-thumb,
  .highlight-layer::-webkit-scrollbar-thumb {
    background: #9ca3af;
    border-radius: 4px;
  }
  
  .text-layer::-webkit-scrollbar-thumb:hover,
  .highlight-layer::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
</style>