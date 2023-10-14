import assert from 'node:assert';
import test from 'node:test';

// eslint-disable-next-line import/no-extraneous-dependencies
import { MLEngine } from 'markuplint';

void test('ts-config-ts', async () => {
	const file = await MLEngine.toMLFile('./index.html');

	if (!file) {
		throw new Error('File not found');
	}

	const engine = new MLEngine(file, {
		locale: 'en',
	});
	const result = await engine.exec();

	assert.deepStrictEqual(result?.violations, [
		{
			ruleId: 'permitted-contents',
			severity: 'error',
			line: 1,
			col: 7,
			raw: '<div>',
			message: 'The "div" element is not allowed in the "span" element in this context',
		},
	]);
});
