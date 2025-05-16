import { describe, test, expect } from 'vitest';

import { getPreset } from './get-preset.js';

describe('getPreset', () => {
	test('Find recommended preset', async () => {
		const config = await getPreset('recommended');
		expect(config).toStrictEqual({
			extends: [
				'markuplint:code-styles',
				'markuplint:html-standard',
				'markuplint:a11y',
				'markuplint:performance',
				'markuplint:security',
				'markuplint:rdfa',
			],
		});
	});

	test('Catch an error', async () => {
		await expect(getPreset('no-exists')).rejects.toThrowError('Preset markuplint:no-exists is not found');
	});
});
