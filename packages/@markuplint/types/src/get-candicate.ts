import leven from 'leven';

type NullableString = string | null | undefined;

export function getCandicate(value: NullableString, ...candicates: (NullableString | NullableString[])[]) {
	if (!value) {
		return;
	}
	const list = candicates.flat(2).filter((s): s is string => !!s);
	let candicate: string | undefined;
	let maxRatio = 0;
	list.forEach(word => {
		const dist = leven(value.trim().toLowerCase(), word.trim().toLowerCase());
		const ratio = 1 - dist / word.length;
		if (0.5 <= ratio && maxRatio < ratio) {
			candicate = word;
		}
		maxRatio = Math.max(ratio, maxRatio);
	});
	if (value === candicate) {
		return;
	}
	return candicate;
}
