<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import 'quill/dist/quill.snow.css';

  let { content = $bindable(''), placeholder = 'Start writing...', onContentChange = (val: string) => {} } = $props();

  let editorContainer: HTMLElement;
  let quillInstance: any = null;
  let isUpdatingInternal = false;

  onMount(async () => {
    const { default: Quill } = await import('quill');
    
    quillInstance = new Quill(editorContainer, {
      theme: 'snow',
      placeholder: placeholder,
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'blockquote', 'code-block'],
          ['clean']
        ]
      }
    });

    if (content) {
      quillInstance.root.innerHTML = content;
    }

    quillInstance.on('text-change', () => {
      isUpdatingInternal = true;
      content = quillInstance!.root.innerHTML;
      onContentChange(content);
      isUpdatingInternal = false;
    });
  });

  onDestroy(() => {
    quillInstance = null;
  });

  $effect(() => {
    if (quillInstance && content !== quillInstance.root.innerHTML && !isUpdatingInternal) {
      // Avoid overwriting if user is actively typing, but allow programmatic updates
      const currentSelection = quillInstance.getSelection();
      quillInstance.root.innerHTML = content || '';
      if (currentSelection) {
         quillInstance.setSelection(currentSelection);
      }
    }
  });
</script>

<div class="quill-wrapper">
  <div bind:this={editorContainer}></div>
</div>

<style>
  /* Airy Theme Overrides for Quill */
  .quill-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :global(.ql-toolbar.ql-snow) {
    border: none !important;
    border-bottom: 1px solid #f1f5f9 !important;
    padding: 12px 16px !important;
    font-family: inherit !important;
    background: transparent !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 10 !important;
    border-radius: 1.5rem 1.5rem 0 0 !important;
  }
  :global(.dark) :global(.ql-toolbar.ql-snow) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  }
  :global(.dark) :global(.ql-stroke) { stroke: #a3a3a3 !important; }
  :global(.dark) :global(.ql-fill) { fill: #a3a3a3 !important; }
  :global(.dark) :global(.ql-picker) { color: #a3a3a3 !important; }
  
  :global(.ql-container.ql-snow) {
    border: none !important;
    font-family: inherit !important;
    font-size: 1.05rem !important;
    flex: 1;
    overflow-y: auto;
  }

  :global(.ql-editor) {
    padding: 4rem 3rem !important;
    min-height: 500px;
    color: #000 !important;
    line-height: 1.7 !important;
  }
  :global(.dark) :global(.ql-editor) { color: #fff !important; }

  :global(.ql-editor.ql-blank::before) {
    font-style: normal !important;
    color: #94a3b8 !important;
    font-weight: 500 !important;
  }
  :global(.dark) :global(.ql-editor.ql-blank::before) { color: #52525b !important; }

  :global(.ql-editor h1) { font-size: 2.5rem !important; font-weight: 800 !important; color: #000 !important; margin-bottom: 1rem !important; }
  :global(.ql-editor h2) { font-size: 1.875rem !important; font-weight: 700 !important; color: #000 !important; margin-bottom: 0.75rem !important; margin-top: 1.5rem !important; }
  :global(.ql-editor h3) { font-size: 1.5rem !important; font-weight: 700 !important; color: #000 !important; margin-bottom: 0.5rem !important; margin-top: 1.25rem !important; }
  
  :global(.dark) :global(.ql-editor h1), :global(.dark) :global(.ql-editor h2), :global(.dark) :global(.ql-editor h3) { color: #fff !important; }
  
  :global(.ql-editor p) { margin-bottom: 1rem !important; }
  
  :global(.ql-editor a) { color: #000 !important; text-decoration: underline !important; font-weight: 600 !important; }
  :global(.dark) :global(.ql-editor a) { color: #fff !important; }
  
  :global(.ql-editor blockquote) {
    border-left: 4px solid #000 !important;
    padding-left: 1rem !important;
    color: #52525b !important;
    font-style: italic !important;
    background: #f4f4f5 !important;
    border-radius: 0 0.5rem 0.5rem 0 !important;
    padding: 1rem !important;
  }
  :global(.dark) :global(.ql-editor blockquote) {
    border-left: 4px solid #fff !important;
    color: #a1a1aa !important;
    background: #27272a !important;
  }
</style>
