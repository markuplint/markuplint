<template>
	<details>
		<summary v-if="title">{{ title }}</summary>
		<summary v-else>Default</summary>
		<slot />
	</details>
</template>
