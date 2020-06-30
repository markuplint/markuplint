export function stringSplice(str: string, start: number, count: number, add = '') {
	if (start < 0) {
		start = str.length + start;
		if (start < 0) {
			start = 0;
		}
	}

	return str.slice(0, start) + add + str.slice(start + count);
}
