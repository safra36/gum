<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Plus, Trash2, Play, Save, FolderOpen, Code } from 'lucide-svelte';
  import SimpleEditor from './SimpleEditor.svelte';
  import PermissionGuard from './PermissionGuard.svelte';
  import { toast } from '$lib/stores/toast';
  import { permissions } from '$lib/stores/user';
  import type { Project } from '$lib/types';
  import { api } from '$lib/services/api';

  export let project: Project | null = null;
  export let isEditing = false;

  const dispatch = createEventDispatcher();

  let formData = {
    title: '',
    working_dir: '',
    stagingConfig: {
      route: '',
      args: [''],
      stages: [{ script: '', stageId: 'stage-1' }]
    },
    cronJob: ''
  };

  let loading = false;
  let errors: Record<string, string> = {};
  let activeTab = 'general';
  let selectedStageIndex = 0;

  // Ensure selectedStageIndex is always valid
  $: if (formData.stagingConfig.stages.length > 0) {
    if (selectedStageIndex >= formData.stagingConfig.stages.length) {
      selectedStageIndex = formData.stagingConfig.stages.length - 1;
    }
    if (selectedStageIndex < 0) {
      selectedStageIndex = 0;
    }
  }

  // Create a derived current stage for better reactivity
  $: currentStage = formData.stagingConfig.stages[selectedStageIndex] || { script: '', stageId: '' };

  // Ensure users without edit permissions stay on general tab
  $: if (!$permissions.canEdit && activeTab === 'stages') {
    activeTab = 'general';
  }


  // Function to decode HTML entities and strip HTML tags
  function decodeScript(script: string): string {
    if (!script) return '';
    
    // Skip if it doesn't contain HTML tags
    if (!script.includes('<') && !script.includes('&')) return script;
    
    // Create a temporary element to decode HTML entities
    const temp = document.createElement('div');
    temp.innerHTML = script;
    
    // Get the text content (this strips HTML tags and decodes entities)
    const decoded = temp.textContent || temp.innerText || '';
    
    return decoded;
  }

  // Initialize form data
  $: if (project && isEditing) {
    formData = {
      title: project.title || '',
      working_dir: project.working_dir || '',
      stagingConfig: {
        route: project.stagingConfig?.route || '',
        args: project.stagingConfig?.args || [''],
        stages: project.stagingConfig?.stages?.map(stage => ({
          script: decodeScript(stage.script || ''),
          stageId: stage.stageId || `stage-${Date.now()}`
        })) || [{ script: '', stageId: 'stage-1' }]
      },
      cronJob: project.cronJob || ''
    };
  }

  function validateForm() {
    errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Project title is required';
    }
    
    if (!formData.working_dir.trim()) {
      errors.working_dir = 'Working directory is required';
    }
    
    if (!formData.stagingConfig.route.trim()) {
      errors.route = 'Route is required';
    } else if (!formData.stagingConfig.route.startsWith('/')) {
      errors.route = 'Route must start with /';
    }

    if (formData.stagingConfig.stages.length === 0) {
      errors.stages = 'At least one stage is required';
    } else {
      formData.stagingConfig.stages.forEach((stage, index) => {
        if (!stage.script.trim()) {
          errors[`stage-${index}`] = 'Stage script cannot be empty';
        }
        if (!stage.stageId.trim()) {
          errors[`stageId-${index}`] = 'Stage ID cannot be empty';
        }
      });
    }

    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) {
      toast('Please fix the validation errors', 'error');
      return;
    }

    loading = true;
    
    try {
      // Filter out empty args
      const cleanedArgs = formData.stagingConfig.args.filter(arg => arg.trim() !== '');
      
      const projectData = {
        title: formData.title,
        working_dir: formData.working_dir,
        cronJob: formData.cronJob,
        stagingConfig: {
          ...formData.stagingConfig,
          args: cleanedArgs.length > 0 ? cleanedArgs : ['']
        }
      };

      let result;
      if (isEditing && project) {
        result = await api.updateProject(project.id, projectData);
        dispatch('projectUpdated', result);
        toast('Project updated successfully', 'success');
      } else {
        result = await api.createProject(projectData);
        dispatch('projectCreated', result.project);
        toast('Project created successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast(`Failed to ${isEditing ? 'update' : 'create'} project`, 'error');
    } finally {
      loading = false;
    }
  }

  function addStage() {
    const newStage = { script: '', stageId: `stage-${Date.now()}` };
    formData.stagingConfig.stages = [...formData.stagingConfig.stages, newStage];
    selectedStageIndex = formData.stagingConfig.stages.length - 1;
    // Force reactivity update
    formData = { ...formData };
  }

  function removeStage(index: number) {
    if (formData.stagingConfig.stages.length <= 1) {
      toast('Cannot remove the last stage', 'warning');
      return;
    }
    
    formData.stagingConfig.stages = formData.stagingConfig.stages.filter((_, i) => i !== index);
    if (selectedStageIndex >= formData.stagingConfig.stages.length) {
      selectedStageIndex = formData.stagingConfig.stages.length - 1;
    }
    // Force reactivity update
    formData = { ...formData };
  }

  function addArg() {
    formData.stagingConfig.args = [...formData.stagingConfig.args, ''];
  }

  function removeArg(index: number) {
    if (formData.stagingConfig.args.length <= 1) return;
    formData.stagingConfig.args = formData.stagingConfig.args.filter((_, i) => i !== index);
  }

  function handleScriptChange(event: CustomEvent) {
    const newScript = event.detail.value;
    if (formData.stagingConfig.stages[selectedStageIndex]) {
      formData.stagingConfig.stages[selectedStageIndex].script = newScript;
      // Force reactivity update
      formData = { ...formData };
    }
  }

  async function testScript(stageIndex: number) {
    const stage = formData.stagingConfig.stages[stageIndex];
    if (!stage.script.trim()) {
      toast('Script is empty', 'warning');
      return;
    }
    
    // This would need backend support for script testing
    toast('Script testing would be implemented here', 'info');
  }

  function formatScript() {
    // Basic shell script formatting
    const stage = formData.stagingConfig.stages[selectedStageIndex];
    if (stage && stage.script) {
      // Simple formatting - add proper line breaks
      stage.script = stage.script
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    }
  }
</script>

<div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
  <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
      {isEditing ? 'Edit Project' : 'Create New Project'}
    </h2>
  </div>

  <!-- Tab Navigation -->
  <div class="border-b border-gray-200 dark:border-gray-700">
    <nav class="flex space-x-8 px-6" aria-label="Form sections">
      <button
        class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'general' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
        on:click={() => activeTab = 'general'}
        aria-pressed={activeTab === 'general'}
      >
        <FolderOpen class="inline mr-2" size={16} />
        General
      </button>
      {#if $permissions.canEdit}
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'stages' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
          on:click={() => activeTab = 'stages'}
          aria-pressed={activeTab === 'stages'}
        >
          <Code class="inline mr-2" size={16} />
          Stages
        </button>
      {:else}
        <div class="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
          <Code class="inline mr-2" size={16} />
          Stages
          <PermissionGuard requiredPermission="canEdit" variant="icon-only" iconSize={12} showIcon={true} />
        </div>
      {/if}
    </nav>
  </div>

  <form on:submit|preventDefault={handleSubmit} class="p-6 space-y-6">
    {#if activeTab === 'general'}
      <!-- General Settings -->
      <div class="grid grid-cols-1 gap-6">
        <div>
          <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Title *
          </label>
          <input
            type="text"
            id="title"
            bind:value={formData.title}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="My Deployment Project"
            required
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {#if errors.title}
            <p id="title-error" class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.title}
            </p>
          {/if}
        </div>

        <PermissionGuard 
          requiredPermission="canEdit" 
          fallbackMessage="You need edit permissions to view or modify the working directory"
        >
          <div>
            <label for="working_dir" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Working Directory *
            </label>
            <input
              type="text"
              id="working_dir"
              bind:value={formData.working_dir}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="/path/to/project"
              required
              aria-describedby={errors.working_dir ? 'working-dir-error' : undefined}
            />
            {#if errors.working_dir}
              <p id="working-dir-error" class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.working_dir}
              </p>
            {/if}
          </div>
        </PermissionGuard>

        <PermissionGuard 
          requiredPermission="canEdit" 
          fallbackMessage="You need edit permissions to view or modify the API route"
        >
          <div>
            <label for="route" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Route *
            </label>
            <input
              type="text"
              id="route"
              bind:value={formData.stagingConfig.route}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="/deploy/my-project"
              required
              aria-describedby={errors.route ? 'route-error' : undefined}
            />
            {#if errors.route}
              <p id="route-error" class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.route}
              </p>
            {/if}
          </div>
        </PermissionGuard>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Script Arguments
          </label>
          <div class="space-y-2">
            {#each formData.stagingConfig.args as arg, index}
              <div class="flex gap-2">
                <input
                  type="text"
                  bind:value={formData.stagingConfig.args[index]}
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Argument value"
                />
                {#if formData.stagingConfig.args.length > 1}
                  <button
                    type="button"
                    on:click={() => removeArg(index)}
                    class="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    aria-label="Remove argument"
                  >
                    <Trash2 size={16} />
                  </button>
                {/if}
              </div>
            {/each}
            <button
              type="button"
              on:click={addArg}
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Plus size={16} class="mr-1" />
              Add Argument
            </button>
          </div>
        </div>

        <PermissionGuard 
          requiredPermission="canSetCron" 
          fallbackMessage="You need cron management permissions to set automated schedules"
        >
          <div>
            <label for="cronJob" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cron Schedule (Optional)
            </label>
            <input
              type="text"
              id="cronJob"
              bind:value={formData.cronJob}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="0 0 * * * (every day at midnight)"
            />
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Use cron syntax: minute hour day month weekday
            </p>
          </div>
        </PermissionGuard>
      </div>
    {:else if activeTab === 'stages'}
      <!-- Stages Configuration -->
      <PermissionGuard 
        requiredPermission="canEdit" 
        fallbackMessage="You need edit permissions to view or modify deployment stages and scripts"
      >
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Stage List -->
        <div class="lg:col-span-1">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Stages</h3>
            <button
              type="button"
              on:click={addStage}
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Plus size={16} class="mr-1" />
              Add Stage
            </button>
          </div>
          
          <div class="space-y-2">
            {#each formData.stagingConfig.stages as stage, index}
              <div
                class="p-3 border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer transition-colors {selectedStageIndex === index ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}"
                on:click={() => selectedStageIndex = index}
                on:keydown={(e) => e.key === 'Enter' && (selectedStageIndex = index)}
                role="button"
                tabindex="0"
                aria-pressed={selectedStageIndex === index}
              >
                <div class="flex justify-between items-center">
                  <div>
                    <h4 class="font-medium text-gray-900 dark:text-white">{stage.stageId}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {stage.script ? `${stage.script.substring(0, 30)}...` : 'No script'}
                    </p>
                  </div>
                  <div class="flex space-x-1">
                    <button
                      type="button"
                      on:click|stopPropagation={() => testScript(index)}
                      class="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      aria-label="Test script"
                    >
                      <Play size={16} />
                    </button>
                    {#if formData.stagingConfig.stages.length > 1}
                      <button
                        type="button"
                        on:click|stopPropagation={() => removeStage(index)}
                        class="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Remove stage"
                      >
                        <Trash2 size={16} />
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Stage Editor -->
        <div class="lg:col-span-2">
          {#if formData.stagingConfig.stages[selectedStageIndex]}
            <div class="space-y-4">
              <div>
                <label for="stageId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stage ID *
                </label>
                <input
                  type="text"
                  id="stageId"
                  value={currentStage.stageId}
                  on:input={(e) => {
                    if (formData.stagingConfig.stages[selectedStageIndex]) {
                      formData.stagingConfig.stages[selectedStageIndex].stageId = e.currentTarget.value;
                      formData = { ...formData };
                    }
                  }}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="stage-1"
                  required
                />
              </div>

              <div>
                <div class="flex justify-between items-center mb-2">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Script *
                  </label>
                  <button
                    type="button"
                    on:click={formatScript}
                    class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Format
                  </button>
                </div>
                
                {#key selectedStageIndex}
                  <SimpleEditor
                    value={currentStage.script}
                    height="400px"
                    placeholder="#!/bin/bash
echo 'Starting deployment...'
# Your deployment script here

# 📦 Variable Usage:
# Set a variable: #DEFINE BUILD_ID=12345
# Use in next stages: echo 'Build ID: #BUILD_ID'"
                    on:change={handleScriptChange}
                  />
                {/key}
                
                {#if errors[`stage-${selectedStageIndex}`]}
                  <p class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    {errors[`stage-${selectedStageIndex}`]}
                  </p>
                {/if}
                
                <!-- Variable Usage Help -->
                <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <h4 class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                    🔗 Variable Passing Between Stages
                  </h4>
                  <div class="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <p><strong>Set a variable:</strong> <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">#DEFINE BUILD_ID=12345</code></p>
                    <p><strong>Use in next stages:</strong> <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">echo "Build ID: #BUILD_ID"</code></p>
                    <p class="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Variables are automatically substituted before execution and passed to subsequent stages.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
      </PermissionGuard>
    {/if}

    <!-- Form Actions -->
    <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        on:click={() => dispatch('cancel')}
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        disabled={loading}
      >
        Cancel
      </button>
      {#if (isEditing && $permissions.canEdit) || (!isEditing && $permissions.canCreateProject)}
        <button
          type="submit"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={loading}
        >
          {#if loading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          {:else}
            <Save size={16} class="mr-2" />
          {/if}
          {isEditing ? 'Update' : 'Create'} Project
        </button>
      {:else}
        <div class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800">
          <Save size={16} class="mr-2" />
          {isEditing ? 'Update' : 'Create'} Project
          <span class="ml-2 text-xs">(No Permission)</span>
        </div>
      {/if}
    </div>
  </form>
</div>