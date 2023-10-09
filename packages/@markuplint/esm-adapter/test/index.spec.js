import fs from 'node:fs/promises';
import path from 'node:path';

import { version as versionForTest } from 'test-markuplint';
import { describe, it, expect } from 'vitest';

const { MLEngine } = require('../cjs/index.cjs');

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

	it('Fixture 003.html', async () => {
		const filePath = path.resolve(__dirname, '..', '..', '..', '..', 'test', 'fixture', '003.html');
		const file = await fs.readFile(filePath, { encoding: 'utf8' });
		const name = path.basename(filePath);
		const dirname = path.dirname(filePath);

		const engine = await MLEngine.fromCode(file, {
			name,
			dirname,
			locale: 'en',
		});

		const result = await engine.exec();

		const errors = result[0].violations.filter(v => v.severity === 'error');
		const warns = result[0].violations.filter(v => v.severity === 'warning');

		expect(errors.length).toBe(42);
		expect(warns.length).toBe(4);

		engine.dispose();
	});

	it('setModule', async () => {
		const engine = await MLEngine.fromCode('<span><div></div></span>');
		await engine.setModule('test-markuplint');
		const version = await engine.getVersion();
		expect(version).toBe(versionForTest);
		engine.dispose();
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
		engine.dispose();
	});
});
