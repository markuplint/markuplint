import { ConfigLoadError } from '@markuplint/shared';
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
				'markuplint:compat',
			],
		});
	});

	test('Catch an error', async () => {
		await expect(getPreset('no-exists')).rejects.toThrowError('Preset markuplint:no-exists is not found');
	});

	test('A missing preset is a ConfigLoadError that names the referrer', async () => {
		const promise = getPreset('no-exists', '/path/to/.markuplintrc');
		await expect(promise).rejects.toBeInstanceOf(ConfigLoadError);
		await expect(promise).rejects.toMatchObject({
			message: 'Preset markuplint:no-exists is not found in /path/to/.markuplintrc',
			filePath: 'markuplint:no-exists',
			referrer: '/path/to/.markuplintrc',
		});
	});
});
