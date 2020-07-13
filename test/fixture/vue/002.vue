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
