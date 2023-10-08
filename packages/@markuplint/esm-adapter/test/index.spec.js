import { version as versionForTest } from 'test-markuplint';
import { describe, it, expect } from 'vitest';

const { MLEngine, getVersion } = require('../cjs/index.cjs');

describe('test', () => {
	it('MLEngine.exec()', async () => {
		const engine = await MLEngine.fromCode('<span><div></div></span>', {
			name: 'test.html',
			dirname: __dirname,
			locale: 'en',
		});
		const result = await engine.exec();
		expect(result[0].violations).toEqual([
			{
				ruleId: 'permitted-contents',
				severity: 'error',
				line: 1,
				col: 7,
				message: 'The "div" element is not allowed in the "span" element in this context',
				raw: '<div>',
			},
		]);
		engine.dispose();
	});

	it('getVersion()', async () => {
		const version = await getVersion();
		expect(version).toMatch(/^\d+\.\d+\.\d+(?:-.+)$/);
	});

	it('setModule', async () => {
		const engine = await MLEngine.fromCode('<span><div></div></span>');
		await engine.setModule('test-markuplint');
		const version = await engine.getVersion();
		expect(version).toBe(versionForTest);
	});

	it('getAccessibilityByLocation', async () => {
		const engine = await MLEngine.fromCode('<div><button>It is button</button></div>', {
			name: 'test.html',
			dirname: __dirname,
			locale: 'en',
		});
		const aria = await engine.getAccessibilityByLocation(1, 7);
		expect(aria).toStrictEqual({
			node: 'button',
			aria: {
				exposedToTree: true,
				role: 'button',
				name: 'It is button',
				nameProhibited: false,
				nameRequired: true,
				focusable: true,
			},
		});
	});
});
