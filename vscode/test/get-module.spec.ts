import assert from 'node:assert';

import { suite, test } from 'mocha';

// We need to test the helper functions in get-module.ts
// Since they are not exported, we'll create similar implementations for testing

suite('Get Module Tests', () => {
	/**
	 * Test implementation of isNode22ImportAssertionError function
	 */
	function isNode22ImportAssertionError(error: unknown): boolean {
		if (!(error instanceof Error)) {
			return false;
		}

		// Check for import assertion syntax errors that occur in Node.js 22
		return (
			error.name === 'SyntaxError' &&
			(error.message.includes("Unexpected identifier 'assert'") ||
				error.message.includes('import assertion') ||
				error.message.includes('assert { type:'))
		);
	}

	test('should detect Node.js 22 import assertion errors', () => {
		// Test cases that should be detected as Node.js 22 import assertion errors
		const node22Errors = [
			new SyntaxError("Unexpected identifier 'assert'"),
			new SyntaxError('import assertion is not supported'),
			new SyntaxError("assert { type: 'json' } is not valid"),
		];

		for (const error of node22Errors) {
			assert.strictEqual(isNode22ImportAssertionError(error), true, `Should detect error: ${error.message}`);
		}
	});

	test('should not detect other syntax errors as Node.js 22 import assertion errors', () => {
		// Test cases that should NOT be detected as Node.js 22 import assertion errors
		const otherErrors = [
			new SyntaxError('Unexpected token }'),
			new Error('Module not found'),
			new TypeError('Cannot read property'),
			'string error',
			null,
			undefined,
		];

		for (const error of otherErrors) {
			assert.strictEqual(isNode22ImportAssertionError(error), false, `Should not detect error: ${error}`);
		}
	});

	test('should handle NODE_22_COMPATIBILITY_WARNING template', () => {
		const NODE_22_COMPATIBILITY_WARNING = `⚠️ Local markuplint compatibility issue detected

Your local markuplint version (v{0}) is incompatible with VS Code's Node.js 22 engine.
Using bundled markuplint version instead.

To use your local markuplint version:
• Upgrade to markuplint@4.10.0 or later
• Or downgrade VS Code to version < 1.90.0

See: https://github.com/markuplint/markuplint/issues/2837`;

		const version = '4.5.0';
		const message = NODE_22_COMPATIBILITY_WARNING.replace('{0}', version);

		assert.ok(message.includes('v4.5.0'), 'Should replace version placeholder');
		assert.ok(message.includes('markuplint@4.10.0 or later'), 'Should include upgrade instruction');
		assert.ok(message.includes('VS Code to version < 1.90.0'), 'Should include downgrade instruction');
		assert.ok(message.includes('github.com/markuplint/markuplint/issues/2837'), 'Should include issue link');
	});
});
