import { describe, it, expect } from 'vitest';

import { messageToString } from './message-to-string.js';

describe('messageToString', () => {
	it('returns message only', () => {
		expect(messageToString('error')).toBe('error');
	});

	it('includes specConformance tag', () => {
		expect(messageToString('error', 'normative')).toBe('error [normative]');
	});

	it('includes reason', () => {
		expect(messageToString('error', undefined, 'detail')).toBe('error / detail');
	});

	it('includes both specConformance and reason', () => {
		expect(messageToString('error', 'non-normative', 'detail')).toBe('error [non-normative] / detail');
	});
});
