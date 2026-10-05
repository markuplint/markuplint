<script setup lang="ts">
const props = defineProps<{ label: string }>()
</script>

<template>
	<div>
		<i :aria-label="props.label" />
		<slot />
	</div>
</template>
