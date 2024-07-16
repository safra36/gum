<script>
    export let gitLog;
</script>

<div class="mt-4">
    <h3 class="text-xl font-semibold mb-2">Git Log</h3>
    <ul class="space-y-2">
        {#each gitLog as commit}
            <li class="bg-gray-100 p-2 rounded">
                <strong>Commit:</strong>
                {commit.commit.substring(0, 7)}<br />
                <strong>Author:</strong>
                {commit.author}<br />
                <strong>Date:</strong>
                {commit.date}<br />
                <strong>Message:</strong>
                {commit.message}
            </li>
        {/each}
    </ul>
</div>
