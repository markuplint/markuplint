import { describe, expect, test } from 'vitest';

import { EMPTY_LOCK, parseLock, serializeLock } from './lockfile.ts';

const LOCK = {
	sections: { 'https://example.com/a#x': { hash: 'abc', text: 'One.\nTwo.', updatedAt: '2026-10-18T00:00:00.000Z' } },
};

describe('lockfile', () => {
	test('[lockfile-001] round-trips through the serialized form', () => {
		expect(parseLock(serializeLock(LOCK))).toStrictEqual(LOCK);
	});

	test('[lockfile-002] serializes with tabs and a final newline', () => {
		const text = serializeLock(LOCK);
		expect(text.startsWith('{\n\t"sections": {\n\t\t"https://example.com/a#x": {\n\t\t\t"hash"')).toBe(true);
		expect(text.endsWith('}\n')).toBe(true);
		expect(serializeLock(EMPTY_LOCK)).toBe('{\n\t"sections": {}\n}\n');
	});

	test('[lockfile-003] rejects a file that is not a lock rather than reading it as empty', () => {
		expect(() => parseLock('{}')).toThrow(/not a lock file/);
		expect(() => parseLock('{"sections":{"a":{"hash":1}}}')).toThrow(/not a lock file/);
		expect(() => parseLock('[]')).toThrow(/not a lock file/);
		expect(() => parseLock('{"sections":[]}')).toThrow(/not a lock file/);
	});
});
