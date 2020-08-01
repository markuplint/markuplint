<template>
	<div>
		<slot />
		<template v-if="any">
			<a href="path/to">Link</a>
		</template>
		<template v-else>
			<span>Text</span>
		</template>
		<template></template>
		<img :src="src" :align="align" />
		<button>
			<template>
				<slot />
				<a href="path/to">Deny Link</a>
			</template>
		</button>
		<ul>
			<li v-for="item of list" :key="item.id"></li>
		</ul>
		<div :data-variant="variant">
			<a v-if="href" :href="href" :target="target">{{ text }}</a>
			<button v-else :type="type" @click="event" v-on:custom:event="event">{{ text }}</button>
		</div>
	</div>
</template>

<script>
import XImage from './x-image.vue';

export default {
	components: {
		XImage,
	},
	methods: {
		any() {
			return undefined;
		},
	},
};
</script>
