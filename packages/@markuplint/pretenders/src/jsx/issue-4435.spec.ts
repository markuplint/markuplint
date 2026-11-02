import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeAll, describe, test, expect } from 'vitest';

import { jsxScanner } from './index.js';

const fixture = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', '012-issue-4435.tsx');

/**
 * The scanner reports an attribute written as code (`aria-busy={true}`, `aria-busy={"true"}`) as the code
 * as it is written, and `@markuplint/ml-core` reads it as it reads an element written directly, so that
 * the result of a rule is the same for an element written directly and for the component that renders it.
 */
describe('jsxScanner: attributes written as code', () => {
	let asOf: (selector: string) => unknown;

	beforeAll(async () => {
		const pretenders = await jsxScanner([fixture]);
		asOf = (selector: string) => pretenders.find(pretender => pretender.selector === selector)?.as;
	});

	test('a literal in {…} is the code as it is written', () => {
		expect(asOf('Literals')).toStrictEqual({
			element: 'div',
			attrs: [
				{ name: 'aria-busy', value: { expression: 'true' } },
				{ name: 'aria-hidden', value: { expression: 'false' } },
				{ name: 'aria-label', value: { expression: "'Name'" } },
				{ name: 'tabIndex', value: { expression: '0' } },
				{ name: 'title', value: { expression: "'x'" } },
				{ name: 'data-n', value: { expression: '-1' } },
				{ name: 'data-t', value: { expression: '`t`' } },
				{ name: 'data-null', value: { expression: 'null' } },
				{ name: 'data-undefined', value: { expression: 'undefined' } },
				{ name: 'data-text', value: { expression: "'true'" } },
			],
			slots: null,
		});
	});

	test('an attribute without a value is a boolean', () => {
		expect(asOf('Shorthand')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'disabled' }, { name: 'aria-pressed' }],
			slots: null,
		});
	});

	test('any other expression is the code as well, and ml-core reads it as dynamic', () => {
		expect(asOf('Conditional')).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'tabIndex', value: { expression: 'selected ? 0 : -1' } }],
			slots: null,
		});
	});

	test('a prop of the component passed as it is is still `fromAttr`', () => {
		expect(asOf('Forwarded')).toStrictEqual({
			element: 'button',
			attrs: [
				{ name: 'aria-label', value: { fromAttr: 'label', omitIfMissing: true } },
				{ name: 'aria-busy', value: { fromAttr: 'busy', omitIfMissing: true } },
			],
			slots: null,
		});
	});

	test('`as` is part of the code', () => {
		expect(asOf('Wrapped')).toStrictEqual({
			element: 'div',
			attrs: [
				{ name: 'hidden', value: { expression: 'false as boolean' } },
				{ name: 'title', value: { expression: "'y' as string" } },
			],
			slots: null,
		});
	});

	test('a call and a template literal with a substitution are the code as well', () => {
		expect(asOf('Calls')).toStrictEqual({
			element: 'div',
			attrs: [
				{ name: 'title', value: { expression: 'String(1)' } },
				{ name: 'data-a', value: { expression: '`a${1}`' } },
			],
			slots: null,
		});
	});
});

describe('jsxScanner: an expression that has no code', () => {
	let tmpDir: string | undefined;

	afterEach(async () => {
		if (tmpDir) {
			await fs.rm(tmpDir, { recursive: true, force: true });
			tmpDir = undefined;
		}
	});

	// `title={}` is not valid JSX, but the compiler reads it and the scanner does not stop at it
	test('is an attribute whose value is not known', async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pretenders-empty-expression-'));
		const file = path.join(tmpDir, 'Empty.tsx');
		await fs.writeFile(file, 'export const Empty = () => <div title={} />;\n');

		const pretenders = await jsxScanner([file]);
		expect(pretenders.find(pretender => pretender.selector === 'Empty')?.as).toStrictEqual({
			element: 'div',
			attrs: [{ name: 'title', value: { dynamic: true } }],
			slots: null,
		});
	});
});
