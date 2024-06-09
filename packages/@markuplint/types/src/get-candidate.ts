import leven from 'leven';

type NullableString = string | null | undefined;

const CANDIDATE_DEPTH = 2;

export function getCandidate(
	value: NullableString,
	...candidates: readonly (NullableString | readonly NullableString[])[]
) {
	if (!value) {
		return;
	}
	const list = candidates.flat(CANDIDATE_DEPTH).filter((s): s is string => !!s);
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
