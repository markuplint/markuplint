import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { isCliEntry } from './is-cli-entry.ts';

describe('isCliEntry', () => {
	const original = process.argv[1];

	afterEach(() => {
		process.argv[1] = original;
	});

	test('returns false when process.argv[1] is undefined', () => {
		vi.stubGlobal('process', { ...process, argv: [process.argv[0] ?? ''] });
		expect(isCliEntry('file:///any.ts')).toBe(false);
		vi.unstubAllGlobals();
	});

	test('returns true when import.meta.url matches pathToFileURL(process.argv[1])', () => {
		const fake = '/tmp/fake-entry.ts';
		process.argv[1] = fake;
		expect(isCliEntry(pathToFileURL(fake).href)).toBe(true);
	});

	test('returns false when import.meta.url refers to a different file', () => {
		process.argv[1] = '/tmp/fake-entry.ts';
		expect(isCliEntry(pathToFileURL('/tmp/other.ts').href)).toBe(false);
	});

	test('works for path shapes that would break naive `file://${argv[1]}` concatenation', () => {
		// A Windows-like path: pathToFileURL handles backslashes and drive letters.
		// We can only simulate the URL shape here; the point is that any path we
		// hand to pathToFileURL on both sides of the comparison round-trips equally.
		const fake = '/Users/name with space/project/entry.ts';
		process.argv[1] = fake;
		expect(isCliEntry(pathToFileURL(fake).href)).toBe(true);
	});
});
