import { afterEach, describe, expect, test, vi } from 'vitest';

import { clearPretenderCaches } from './index.js';
import { getLoadedComponentNameRule, loadComponentNameRule, getScanner } from './scanner-loader.js';

const state = vi.hoisted(() => ({
	installed: false,
	scanner: { scanComponent: () => null },
}));

function notFound(name: string) {
	return Object.assign(
		new Error(`Cannot find package '${name}' imported from /project/node_modules/@markuplint/pretenders/lib/a.js`),
		{ code: 'ERR_MODULE_NOT_FOUND' },
	);
}

/**
 * The Astro parser is installed while the process runs: until `state.installed` is set it is missing, as
 * Node reports a package that is not installed. Vitest wraps an error thrown by a mock factory in its own,
 * which has no `code`, so the export throws it instead.
 */
vi.mock('@markuplint/astro-parser/component-scanner', () => ({
	get componentScanner() {
		if (!state.installed) {
			throw notFound('@markuplint/astro-parser');
		}
		return state.scanner;
	},
}));

vi.mock('@markuplint/astro-parser', () => ({
	get parser() {
		if (!state.installed) {
			throw notFound('@markuplint/astro-parser');
		}
		return { isComponentName: () => true };
	},
}));

afterEach(() => {
	vi.restoreAllMocks();
});

describe('a parser that is installed while the process runs', () => {
	test('is found by getScanner once the caches of pretenders are cleared', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(await getScanner('.astro')).toBeNull();

		state.installed = true;
		clearPretenderCaches();

		expect(await getScanner('.astro')).toBe(state.scanner);
	});

	test('gives its rule for a component name once the caches of pretenders are cleared', async () => {
		state.installed = false;
		clearPretenderCaches();
		await loadComponentNameRule('.astro');
		expect(getLoadedComponentNameRule('.astro')).toBeUndefined();

		state.installed = true;
		clearPretenderCaches();
		await loadComponentNameRule('.astro');

		expect(getLoadedComponentNameRule('.astro')).toBeTypeOf('function');
	});
});
