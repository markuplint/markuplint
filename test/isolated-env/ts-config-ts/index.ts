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

	const violations = result?.violations ?? [];
	assert.equal(violations.length, 1);
	assert.equal(violations[0]?.ruleId, 'permitted-contents');
	assert.equal(violations[0]?.severity, 'error');
	assert.equal(violations[0]?.line, 1);
	assert.equal(violations[0]?.col, 7);
	assert.equal(violations[0]?.raw, '<div>');
	assert.equal(violations[0]?.message, 'The "div" element is not allowed in the "span" element in this context');
});
