<script setup>
defineProps(['label', 'size'])
</script>

<template>
	<button :aria-label="label" :data-size="size ?? 'm'"><slot /></button>
</template>
