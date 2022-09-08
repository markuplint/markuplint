import leven from 'leven';

type NullableString = string | null | undefined;

export function getCandidate(value: NullableString, ...candidates: (NullableString | NullableString[])[]) {
	if (!value) {
		return;
	}
	const list = candidates.flat(2).filter((s): s is string => !!s);
	let candidate: string | undefined;
	let maxRatio = 0;
	list.forEach(word => {
		const dist = leven(value.trim().toLowerCase(), word.trim().toLowerCase());
		const ratio = 1 - dist / word.length;
		if (0.5 <= ratio && maxRatio < ratio) {
			candidate = word;
		}
		maxRatio = Math.max(ratio, maxRatio);
	});
	if (value === candidate) {
		return;
	}
	return candidate;
}
