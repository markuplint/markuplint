<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
	<div>
		<span :title="label"><slot /></span>
	</div>
</template>
