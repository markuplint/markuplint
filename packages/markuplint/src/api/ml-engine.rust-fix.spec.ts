import { describe, it, expect, vi } from 'vitest';

import { MLEngine } from './ml-engine.js';

// The native addon is replaced so a lint of the fixed code can be made to fail, which the real
// engine does not do for any input a rule can produce.
const lintHtml = vi.hoisted(() => vi.fn());
vi.mock('@markuplint/core', () => ({ lintHtml }));

describe('experimentalRustCore when the Rust engine fails on fixed code', () => {
	const violation = {
		ruleId: 'case-sensitive-tag-name',
		severity: 'warning',
		message: 'm',
		line: 1,
		col: 2,
		raw: 'DIV',
		fix: { edits: [{ range: [1, 4], text: 'div' }] },
	};

	it('goes back to the code it could lint instead of failing the file', async () => {
		lintHtml.mockReset();
		lintHtml.mockReturnValueOnce([violation]).mockImplementation(() => {
			throw new Error('the engine could not lint the fixed code');
		});

		const file = await MLEngine.toMLFile({ sourceCode: '<DIV></DIV>', name: 'page.html' });
		const engine = new MLEngine(file!, {
			noSearchConfig: true,
			locale: 'en',
			experimentalRustCore: true,
			fix: true,
			config: { rules: { 'case-sensitive-tag-name': true } },
		});

		const result = await engine.exec();

		expect(result?.fixedCode).toBe('<DIV></DIV>');
		expect(result?.fixSummary?.totalApplied).toBe(0);
		expect(result?.violations.map(v => v.ruleId)).toStrictEqual(['case-sensitive-tag-name']);
		// The first call linted the source, the second the fixed code.
		expect(lintHtml).toHaveBeenCalledTimes(2);
		expect(lintHtml.mock.calls[1]![0]).toBe('<div></DIV>');
	});
});
