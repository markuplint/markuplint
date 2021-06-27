import './style/home.scss';

// @ts-ignore
import MLPlaygroundHome from './ml-playground-home.svelte';

new MLPlaygroundHome({
	target: document.querySelector('#playground-home'),
});
