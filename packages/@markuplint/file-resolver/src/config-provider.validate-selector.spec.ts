import path from 'node:path';

import { InvalidSelectorError, createSelector } from '@markuplint/selector';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ConfigProvider } from './config-provider.js';
import { getFile } from './ml-file/index.js';

vi.mock('@markuplint/selector', async importOriginal => {
	const original = await importOriginal<Record<string, unknown>>();
	return { ...original, createSelector: vi.fn() };
});

const target = getFile(path.resolve(import.meta.dirname, '..', 'test', 'fixtures', '002', 'target.html'));

function resolveWithSelector(selector: string) {
	const provider = new ConfigProvider();
	const key = provider.set({ nodeRules: [{ selector, rules: {} }] });
	return provider.resolve(target, [key]);
}

describe('validation of the selectors of nodeRules', () => {
	beforeEach(() => {
		vi.mocked(createSelector).mockReset();
	});

	test('reports an InvalidSelectorError as an error of the configuration', async () => {
		vi.mocked(createSelector).mockImplementation(() => {
			throw new InvalidSelectorError('a:', 'Invalid selector: "a:"');
		});

		const configSet = await resolveWithSelector('a:');

		expect(configSet.errs.map(error => error.name)).toStrictEqual(['ConfigParserError']);
		expect(configSet.errs[0]?.message).toContain('Invalid selector: "a:"');
	});

	test('does not swallow an error that is not a fault of the selector string', async () => {
		vi.mocked(createSelector).mockImplementation(() => {
			throw new Error('a defect of the selector engine');
		});

		await expect(resolveWithSelector('a')).rejects.toThrow('a defect of the selector engine');
	});

	test('does not swallow a fatal error', async () => {
		vi.mocked(createSelector).mockImplementation(() => {
			throw new TypeError('a defect of markuplint');
		});

		await expect(resolveWithSelector('a')).rejects.toThrow(TypeError);
	});
});
