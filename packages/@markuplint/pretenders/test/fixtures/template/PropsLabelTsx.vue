<script setup lang="tsx">
const render = () => <ul>{[1].map(i => <li key={i}>{i}</li>)}</ul>

defineProps(['label', 'size'])
</script>

<template>
	<button :aria-label="label" :data-size="size ?? 'm'"><slot /></button>
</template>
