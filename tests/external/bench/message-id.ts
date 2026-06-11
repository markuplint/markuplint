import { createHash } from 'node:crypto';

/**
 * Minimal subset of a nu-validator message that is needed to derive a stable
 * ID. All five fields contribute to the hash so that moving a fixture or
 * reshaping a message text invalidates the prior ID — which is the intended
 * signal for `excluded-ids.json` to be re-reviewed.
 */
export type MessageIdInput = {
	readonly path: string;
	readonly type: string;
	readonly message: string;
	readonly firstLine: number | null;
	readonly firstColumn: number | null;
};

/**
 * Build a deterministic `nv-<hex12>` identifier for a nu-validator message.
 *
 * The identifier is a SHA-256 over `path + type + message + firstLine +
 * firstColumn`, separated by null bytes to avoid accidental collisions. The
 * output is platform-independent (POSIX path separators are expected on all
 * OSes — see nu-validator's test layout).
 *
 * @param input The fields that uniquely identify a message within the suite.
 * @returns `nv-` followed by the first 12 hex characters of the digest.
 */
export function buildMessageId(input: MessageIdInput): string {
	const hash = createHash('sha256');
	hash.update(input.path);
	hash.update('\0');
	hash.update(input.type);
	hash.update('\0');
	hash.update(input.message);
	hash.update('\0');
	hash.update(String(input.firstLine ?? ''));
	hash.update('\0');
	hash.update(String(input.firstColumn ?? ''));
	return `nv-${hash.digest('hex').slice(0, 12)}`;
}

/**
 * Suffix duplicate identifiers with `-1`, `-2`, … in first-seen order. Used
 * to disambiguate identical messages emitted at the same position (nu-validator
 * occasionally reports the same diagnostic against adjacent characters).
 *
 * @param ids Identifiers in their original emission order.
 * @returns The same array with duplicates disambiguated.
 */
export function disambiguateIds(ids: readonly string[]): string[] {
	const counts = new Map<string, number>();
	return ids.map(id => {
		const n = counts.get(id) ?? 0;
		counts.set(id, n + 1);
		return n === 0 ? id : `${id}-${n}`;
	});
}

/**
 * Convenience: hash every input and disambiguate the resulting identifiers
 * in one pass, preserving the original order.
 *
 * @param inputs One entry per nu-validator message.
 * @returns Stable identifiers, one per input, in the same order.
 */
export function buildMessageIds(inputs: readonly MessageIdInput[]): string[] {
	return disambiguateIds(inputs.map(input => buildMessageId(input)));
}
