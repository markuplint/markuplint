import type { Translator } from '@markuplint/i18n';

import { i18n } from 'markuplint';
import { describe, test, expect, beforeAll } from 'vitest';

const { translator } = require('@markuplint/i18n');

const { __createMessageValueExpected } = require('./create-message');

let t: Translator;

beforeAll(async () => {
	const locale = await i18n('en');
	t = translator(locale);
});

// TODO: doesnt-exist-in-enum

describe('duplicated', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'duplicated',
			}),
		).toBe('A is duplicated (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'duplicated',
				partName: 'C',
			}),
		).toBe('the C part of A is duplicated (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'duplicated',
			}),
		).toBe('A is duplicated. It expects B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'duplicated',
				partName: 'C',
			}),
		).toBe('the C part of A is duplicated. It expects B (REF)');
	});
});

describe('empty-token', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'empty-token',
			}),
		).toBe('A must not be empty (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'empty-token',
				partName: 'C',
			}),
		).toBe('the C part of A must not be empty (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'empty-token',
			}),
		).toBe('A must not be empty. It expects B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'empty-token',
				partName: 'C',
			}),
		).toBe('the C part of A must not be empty. It expects B (REF)');
	});
});

describe('extra-token', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'extra-token',
			}),
		).toBe('Found extra token "RAW" (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'extra-token',
				partName: 'C',
			}),
		).toBe('Found extra C "RAW" (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'extra-token',
			}),
		).toBe('Found extra token "RAW". A expects B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'extra-token',
				partName: 'C',
			}),
		).toBe('Found extra C "RAW". the C part of A expects B (REF)');
	});
});

describe('illegal-combination', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'illegal-combination',
			}),
		).toBe('Found an illegal combination (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'illegal-combination',
				partName: 'C',
			}),
		).toBe('Found an illegal combination (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'illegal-combination',
			}),
		).toBe('Found an illegal combination. A expects B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'illegal-combination',
				partName: 'C',
			}),
		).toBe('Found an illegal combination. the C part of A expects B (REF)');
	});
});

describe('missing-comma', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-comma',
			}),
		).toBe('Missing a comma (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-comma',
				partName: 'C',
			}),
		).toBe('Missing a comma in the C part (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-comma',
			}),
		).toBe('Missing a comma. A expects B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-comma',
				partName: 'C',
			}),
		).toBe('Missing a comma in the C part. It expects B (REF)');
	});
});

describe('missing-token', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-token',
			}),
		).toBe('Missing a token (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-token',
				partName: 'C',
			}),
		).toBe('Missing the C part. A needs the C part (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-token',
			}),
		).toBe('Missing a token. A needs B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-token',
				partName: 'C',
			}),
		).toBe('Missing the C part. the C part of A needs B (REF)');
	});
});

describe('unexpected-comma', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-comma',
			}),
		).toBe('Found unexpected comma (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-comma',
				partName: 'C',
			}),
		).toBe('Found unexpected comma (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-comma',
			}),
		).toBe('Found unexpected comma. A expects B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-comma',
				partName: 'C',
			}),
		).toBe('Found unexpected comma. the C part of A expects B (REF)');
	});
});

describe('unexpected-newline', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-newline',
			}),
		).toBe('Found unexpected newline (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-newline',
				partName: 'C',
			}),
		).toBe('Found unexpected newline (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-newline',
			}),
		).toBe('Found unexpected newline. A expects B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-newline',
				partName: 'C',
			}),
		).toBe('Found unexpected newline. the C part of A expects B (REF)');
	});
});

describe('unexpected-space', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-space',
			}),
		).toBe('Found unexpected whitespace (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-space',
				partName: 'C',
			}),
		).toBe('Found unexpected whitespace (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-space',
			}),
		).toBe('Found unexpected whitespace. A expects B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-space',
				partName: 'C',
			}),
		).toBe('Found unexpected whitespace. the C part of A expects B (REF)');
	});
});

describe('unexpected-token', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-token',
			}),
		).toBe('It includes unexpected characters (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-token',
				partName: 'C',
			}),
		).toBe('the C part includes unexpected characters (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-token',
			}),
		).toBe('It includes unexpected characters. A expects B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-token',
				partName: 'C',
			}),
		).toBe('the C part includes unexpected characters. It expects B (REF)');
	});
});

describe('out-of-range-length-digit', () => {
	test('expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: { type: 'out-of-range-length-digit', gte: 4 },
			}),
		).toBe('A expects four or more digits (REF)');
	});

	test('expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: { type: 'out-of-range-length-digit', gte: 4 },
				partName: 'C',
			}),
		).toBe('the C part of A expects four or more digits (REF)');
	});

	test('expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: { type: 'out-of-range-length-digit', gte: 4 },
			}),
		).toBe('A expects four or more digits and B (REF)');
	});

	test('expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: { type: 'out-of-range-length-digit', gte: 4 },
				partName: 'C',
			}),
		).toBe('the C part of A expects four or more digits and B (REF)');
	});
});
