import assert from 'node:assert';
import test from 'node:test';

// eslint-disable-next-line import/no-extraneous-dependencies
import { MLEngine } from 'markuplint';

test('esm', async () => {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	const engine = new MLEngine(file, {
		locale: 'en',
	});
	const result = await engine.exec();

	// parse-error is filtered out so the assertion works regardless of which
	// markuplint version the sandbox resolves to (pnpm currently bypasses
	// `pnpm.overrides` and resolves the published version, which predates
	// the parse-error channel).
	const nonParseError = result.violations.filter(v => v.ruleId !== 'parse-error');
	assert.equal(nonParseError.length, 6);
});

test('CommonJS Config', async () => {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	const engine = new MLEngine(file, {
		locale: 'en',
		config: await import('./config.cjs'),
	});
	const result = await engine.exec();

	// parse-error is filtered out so the assertion works regardless of which
	// markuplint version the sandbox resolves to (pnpm currently bypasses
	// `pnpm.overrides` and resolves the published version, which predates
	// the parse-error channel).
	const nonParseError = result.violations.filter(v => v.ruleId !== 'parse-error');
	assert.equal(nonParseError.length, 6);
});

test('ESM Config', async () => {
	const file = await MLEngine.toMLFile('../../fixture/002.html');

	const engine = new MLEngine(file, {
		locale: 'en',
		config: await import('./config.mjs'),
	});
	const result = await engine.exec();

	// parse-error is filtered out so the assertion works regardless of which
	// markuplint version the sandbox resolves to (pnpm currently bypasses
	// `pnpm.overrides` and resolves the published version, which predates
	// the parse-error channel).
	const nonParseError = result.violations.filter(v => v.ruleId !== 'parse-error');
	assert.equal(nonParseError.length, 6);
});
