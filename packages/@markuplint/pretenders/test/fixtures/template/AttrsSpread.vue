<script setup>
defineProps(['label'])
</script>

<template>
	<button v-bind="$attrs" :aria-label="label"><slot /></button>
</template>
