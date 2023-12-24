<script>
  export let id;
  export let list;
</script>

<p {id}></p>
<ul id="hard-coded">
  {#each list as { key, text }, i}
    <li>{text}</li>
  {/each}
</ul>