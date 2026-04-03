import type { Translator } from '@markuplint/i18n';

import { translator } from '@markuplint/i18n';
import { i18n } from 'markuplint';
import { describe, test, expect, beforeAll } from 'vitest';

import { __createMessageValueExpected } from './create-message.js';

let t: Translator;

beforeAll(() => {
	const locale = i18n('en');
	t = translator(locale);
});

describe('doesnt-exist-in-enum', () => {
	test('[create-message-invalid-001] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'doesnt-exist-in-enum',
			}),
		).toBe(' (REF)');
	});

	test('[create-message-invalid-002] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'doesnt-exist-in-enum',
				partName: 'C',
			}),
		).toBe(' (REF)');
	});

	test('[create-message-invalid-003] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'doesnt-exist-in-enum',
			}),
		).toBe('A expects B (REF)');
	});

	test('[create-message-invalid-004] expects: with, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'doesnt-exist-in-enum',
				partName: 'C',
			}),
		).toBe('the C part of A expects B (REF)');
	});
});

describe('duplicated', () => {
	test('[create-message-invalid-005] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'duplicated',
			}),
		).toBe('A is duplicated (REF)');
	});

	test('[create-message-invalid-006] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'duplicated',
				partName: 'C',
			}),
		).toBe('the C part of A is duplicated (REF)');
	});

	test('[create-message-invalid-007] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'duplicated',
			}),
		).toBe('A is duplicated. It expects B (REF)');
	});

	test('[create-message-invalid-008] expects: with, partName: with', () => {
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
	test('[create-message-invalid-009] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'empty-token',
			}),
		).toBe('A must not be empty (REF)');
	});

	test('[create-message-invalid-010] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'empty-token',
				partName: 'C',
			}),
		).toBe('the C part of A must not be empty (REF)');
	});

	test('[create-message-invalid-011] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'empty-token',
			}),
		).toBe('A must not be empty. It expects B (REF)');
	});

	test('[create-message-invalid-012] expects: with, partName: with', () => {
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
	test('[create-message-invalid-013] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'extra-token',
			}),
		).toBe('Found extra token "RAW" (REF)');
	});

	test('[create-message-invalid-014] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'extra-token',
				partName: 'C',
			}),
		).toBe('Found extra C "RAW" (REF)');
	});

	test('[create-message-invalid-015] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'extra-token',
			}),
		).toBe('Found extra token "RAW". A expects B (REF)');
	});

	test('[create-message-invalid-016] expects: with, partName: with', () => {
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
	test('[create-message-invalid-017] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'illegal-combination',
			}),
		).toBe('Found an illegal combination (REF)');
	});

	test('[create-message-invalid-018] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'illegal-combination',
				partName: 'C',
			}),
		).toBe('Found an illegal combination (REF)');
	});

	test('[create-message-invalid-019] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'illegal-combination',
			}),
		).toBe('Found an illegal combination. A expects B (REF)');
	});

	test('[create-message-invalid-020] expects: with, partName: with', () => {
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
	test('[create-message-invalid-021] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-comma',
			}),
		).toBe('Missing a comma (REF)');
	});

	test('[create-message-invalid-022] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-comma',
				partName: 'C',
			}),
		).toBe('Missing a comma in the C part (REF)');
	});

	test('[create-message-invalid-023] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-comma',
			}),
		).toBe('Missing a comma. A expects B (REF)');
	});

	test('[create-message-invalid-024] expects: with, partName: with', () => {
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
	test('[create-message-invalid-025] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-token',
			}),
		).toBe('Missing a token (REF)');
	});

	test('[create-message-invalid-026] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-token',
				partName: 'C',
			}),
		).toBe('Missing the C part. A needs the C part (REF)');
	});

	test('[create-message-invalid-027] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'missing-token',
			}),
		).toBe('Missing a token. A needs B (REF)');
	});

	test('[create-message-invalid-028] expects: with, partName: with', () => {
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
	test('[create-message-invalid-029] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-comma',
			}),
		).toBe('Found unexpected comma (REF)');
	});

	test('[create-message-invalid-030] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-comma',
				partName: 'C',
			}),
		).toBe('Found unexpected comma (REF)');
	});

	test('[create-message-invalid-031] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-comma',
			}),
		).toBe('Found unexpected comma. A expects B (REF)');
	});

	test('[create-message-invalid-032] expects: with, partName: with', () => {
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
	test('[create-message-invalid-033] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-newline',
			}),
		).toBe('Found unexpected newline (REF)');
	});

	test('[create-message-invalid-034] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-newline',
				partName: 'C',
			}),
		).toBe('Found unexpected newline (REF)');
	});

	test('[create-message-invalid-035] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-newline',
			}),
		).toBe('Found unexpected newline. A expects B (REF)');
	});

	test('[create-message-invalid-036] expects: with, partName: with', () => {
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
	test('[create-message-invalid-037] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-space',
			}),
		).toBe('Found unexpected whitespace (REF)');
	});

	test('[create-message-invalid-038] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-space',
				partName: 'C',
			}),
		).toBe('Found unexpected whitespace (REF)');
	});

	test('[create-message-invalid-039] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-space',
			}),
		).toBe('Found unexpected whitespace. A expects B (REF)');
	});

	test('[create-message-invalid-040] expects: with, partName: with', () => {
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
	test('[create-message-invalid-041] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-token',
			}),
		).toBe('It includes unexpected characters (REF)');
	});

	test('[create-message-invalid-042] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-token',
				partName: 'C',
			}),
		).toBe('the C part includes unexpected characters (REF)');
	});

	test('[create-message-invalid-043] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: 'unexpected-token',
			}),
		).toBe('It includes unexpected characters. A expects B (REF)');
	});

	test('[create-message-invalid-044] expects: with, partName: with', () => {
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
	test('[create-message-invalid-045] expects: without, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: { type: 'out-of-range-length-digit', gte: 4 },
			}),
		).toBe('A expects four or more digits (REF)');
	});

	test('[create-message-invalid-046] expects: without, partName: with', () => {
		expect(
			__createMessageValueExpected(t, 'A', '', {
				ref: 'REF',
				raw: 'RAW',
				reason: { type: 'out-of-range-length-digit', gte: 4 },
				partName: 'C',
			}),
		).toBe('the C part of A expects four or more digits (REF)');
	});

	test('[create-message-invalid-047] expects: with, partName: without', () => {
		expect(
			__createMessageValueExpected(t, 'A', 'B', {
				ref: 'REF',
				raw: 'RAW',
				reason: { type: 'out-of-range-length-digit', gte: 4 },
			}),
		).toBe('A expects four or more digits and B (REF)');
	});

	test('[create-message-invalid-048] expects: with, partName: with', () => {
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
