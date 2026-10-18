import type { Lock, LockEntry } from './types.ts';

export const EMPTY_LOCK: Lock = { sections: {} };

function isEntry(value: unknown): value is LockEntry {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const entry = value as Record<string, unknown>;
	return (
		typeof entry['hash'] === 'string' && typeof entry['text'] === 'string' && typeof entry['updatedAt'] === 'string'
	);
}

/**
 * Parses `spec-citations.lock.json`. A file that does not have the expected
 * shape is an error rather than an empty lock: treating a corrupted lock as
 * empty would mark every section "new" and silently drop the changes the lock
 * exists to report.
 */
export function parseLock(text: string): Lock {
	const data: unknown = JSON.parse(text);
	const sections =
		typeof data === 'object' && data !== null ? (data as Record<string, unknown>)['sections'] : undefined;
	if (
		typeof sections !== 'object' ||
		sections === null ||
		Array.isArray(sections) ||
		!Object.values(sections).every(isEntry)
	) {
		throw new Error(
			'spec-citations.lock.json is not a lock file: expected { "sections": { "<url>#<fragment>": { hash, text, updatedAt } } }',
		);
	}
	return { sections: sections as Lock['sections'] };
}

/** Tab-indented with a final newline, which is the shape oxfmt leaves a JSON file in. */
export function serializeLock(lock: Lock): string {
	return `${JSON.stringify(lock, null, '\t')}\n`;
}
