

<script lang="ts">
    
    import type { Stage } from "$lib/types";
    export let stages: Stage[] = [];

</script>

<div class="mt-4">
    <h3 class="text-xl font-semibold mb-2">Stages</h3>
    <ul class="space-y-2">
        {#each stages as stage (stage.id)}
            <li class="bg-gray-100 p-2 rounded">
                <strong>{stage.stageId}</strong>
                <pre class="text-sm mt-1">{stage.script}</pre>
            </li>
        {/each}
    </ul>
</div>