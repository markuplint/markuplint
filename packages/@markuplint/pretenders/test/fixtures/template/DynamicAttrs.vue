<template>
	<button class="btn" :type="kind" :tabindex="selected ? 0 : -1" @click="go" v-bind="$attrs" :key="id" v-show="visible">x</button>
</template>
