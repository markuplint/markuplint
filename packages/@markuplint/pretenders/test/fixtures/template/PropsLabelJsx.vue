<script setup lang="jsx">
const render = () => <><a href="#">{[1].map(i => <b key={i}>{i}</b>)}</a></>

defineProps(['label', 'size'])
</script>

<template>
	<button :aria-label="label" :data-size="size ?? 'm'"><slot /></button>
</template>
