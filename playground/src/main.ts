import { createMonaco } from './monaco.js';
import { Playground } from './playground.js';
import './style.scss';

document.addEventListener('DOMContentLoaded', async () => {
	const monaco = await createMonaco();

	const el = document.getElementById('app');
	const versionEl = document.getElementById('version');

	if (!el || !versionEl) {
		return;
	}

	const version = await import('../package.json').then(pkg => pkg.version);

	versionEl.textContent = version;

	new Playground(monaco.editor, el);
});
