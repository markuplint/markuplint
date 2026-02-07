import leven from 'leven';

type NullableString = string | null | undefined;

const FLAT_DEPTH = 2;

/**
 * Finds the closest matching candidate string using Levenshtein distance.
 *
 * Compares the input value against a list of candidate strings and returns
 * the one with the highest similarity ratio (at least 50% similar).
 * Returns `undefined` if no close match is found or the value exactly matches a candidate.
 *
 * @param value - The input string to find a candidate for
 * @param candidates - The candidate strings or arrays of strings to compare against
 * @returns The closest matching candidate, or `undefined` if none is close enough
 */
export function getCandidate(
	value: NullableString,
	...candidates: readonly (NullableString | readonly NullableString[])[]
) {
	if (!value) {
		return;
	}
	const list = candidates.flat(FLAT_DEPTH).filter((s): s is string => !!s);
	let candidate: string | undefined;
	let maxRatio = 0;
	for (const word of list) {
		const dist = leven(value.trim().toLowerCase(), word.trim().toLowerCase());
		const ratio = 1 - dist / word.length;
		if (0.5 <= ratio && maxRatio < ratio) {
			candidate = word;
		}
		maxRatio = Math.max(ratio, maxRatio);
	}
	if (value === candidate) {
		return;
	}
	return candidate;
}
