import { afterEach, describe, expect, test, vi } from 'vitest';

import { isComponentBinding } from './import-resolver/index.js';
import { getLoadedComponentNameRule, loadComponentNameRule } from './scanner-loader.js';

/**
 * The JSX parser is made to be missing, as Node reports a package that is not installed: the code
 * `ERR_MODULE_NOT_FOUND`, and a message that names the package, without which `importParser` takes the
 * error for a fault of an installed parser and warns. Vitest wraps an error thrown by a mock factory in
 * its own, which has no `code`, so the export throws it instead.
 */
vi.mock('@markuplint/jsx-parser', () => ({
	get parser() {
		throw Object.assign(
			new Error(
				"Cannot find package '@markuplint/jsx-parser' imported from /project/node_modules/@markuplint/pretenders/lib/scanner-loader.js",
			),
			{
				code: 'ERR_MODULE_NOT_FOUND',
			},
		);
	},
}));

afterEach(() => {
	vi.restoreAllMocks();
});

describe('loadComponentNameRule of an extension whose parser package is not installed', () => {
	test('has no rule, judges a name by the form most languages share, and warns of nothing', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await loadComponentNameRule('.tsx');

		expect(getLoadedComponentNameRule('.tsx')).toBeUndefined();
		// `_Layout` is a component to the JSX parser, but not to `isComponentName` of `@markuplint/parser-utils`
		const layout = { localName: '_Layout', importedName: 'default', source: './Layout', type: 'default' } as const;
		expect(isComponentBinding(layout, 'page.tsx')).toBe(false);
		expect(isComponentBinding({ ...layout, localName: 'Layout' }, 'page.tsx')).toBe(true);
		expect(isComponentBinding({ ...layout, localName: 'layout' }, 'page.tsx')).toBe(false);
		expect(warn).not.toHaveBeenCalled();
	});
});
