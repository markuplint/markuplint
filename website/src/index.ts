import './style/home.scss';

// @ts-ignore
import MLPlaygroundHome from './ml-playground-home';
// @ts-ignore
import MLPlaygroundSettings from './ml-playground-settings';

new MLPlaygroundHome({
	target: document.querySelector('#playground-home'),
});

new MLPlaygroundSettings({
	target: document.querySelector('#playground-settings'),
});
