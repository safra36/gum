

<script lang="ts">
    
    import type { Stage } from "$lib/types";
    export let stages: Stage[] = [];

</script>

<div class="mt-4">
    <h3 class="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Stages</h3>
    <ul class="space-y-2">
        {#each stages as stage (stage.id)}
            <li class="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                <strong class="text-gray-800 dark:text-white">{stage.stageId}</strong>
                <pre class="text-sm mt-1 text-gray-700 dark:text-gray-300">{stage.script}</pre>
            </li>
        {/each}
    </ul>
</div>