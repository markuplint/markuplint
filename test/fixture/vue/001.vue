<template>
	<div>
		<h1>TITLE</h1>
		<x-image :src="path" />
		<p>
			Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae ullam ut eum doloribus velit est
			blanditiis sequi! Aspernatur voluptatum illum, velit incidunt, fugit mollitia in accusantium eius dolor
			beatae suscipit?
		</p>
	</div>
</template>

<script>
import XImage from './x-image.vue';

export default {
	components: {
		XImage,
	},
};
</script>


