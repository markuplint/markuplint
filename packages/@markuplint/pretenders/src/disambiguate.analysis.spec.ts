import type * as ImportResolver from './import-resolver/index.js';
import type { Pretender } from '@markuplint/ml-config';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { disambiguatePretenders } from './disambiguate.js';
import { analyzeImports } from './import-resolver/index.js';

// The output does not tell whether the import analysis ran, so its calls are what is observed:
// a file that names none of the scanned components must cost none (the fast path).
vi.mock('./import-resolver/index.js', async importOriginal => {
	const actual = await importOriginal<typeof ImportResolver>();
	return { ...actual, analyzeImports: vi.fn(actual.analyzeImports) };
});

describe('disambiguatePretenders: when the import analysis runs', () => {
	const run = (selector: string, sourceCode: string) => {
		const pretenders: Pretender[] = [{ selector, as: 'div', filePath: '/project/ui/Component.tsx:1:14' }];
		return disambiguatePretenders(pretenders, { filePath: '/project/page.tsx', sourceCode });
	};

	beforeEach(() => {
		vi.mocked(analyzeImports).mockClear();
	});

	test.each([
		['Button', 'a longer identifier', 'export const P = () => <ButtonGroup />;'],
		['Button', 'a word of lower case text', 'export const P = () => <p>a button</p>;'],
		['Button', 'the end of another name', 'export const P = () => <IconButton />;'],
		['my-button', 'a longer kebab-case name', 'export const P = () => <my-button-x />;'],
	])('does not analyze a file that names the selector %s only as %s', async (selector, _, sourceCode) => {
		await run(selector, sourceCode);

		expect(analyzeImports).not.toHaveBeenCalled();
	});

	test.each([
		['Button', 'export const P = () => <Button />;'],
		['Button', "import { Button } from 'ui-lib';"],
		['Button$', 'export const P = () => <Button$ />;'],
		['my-button', 'export const P = () => <my-button />;'],
		['my-button', "import MyButton from 'ui-lib';"],
	])('analyzes a file that names the selector %s as a whole identifier', async (selector, sourceCode) => {
		await run(selector, sourceCode);

		expect(analyzeImports).toHaveBeenCalledTimes(1);
	});
});
