<template>
	<ul>
		<li v-for="item in items">{{ item }}</li>
		<slot />
	</ul>
</template>
