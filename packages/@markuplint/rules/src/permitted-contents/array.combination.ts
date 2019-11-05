export default function combination<T>(array: T[]) {
	// Unique
	array = Array.from(new Set(array));

	if (array.length <= 1) {
		return [array];
	}

	// Sort
	array.sort();

	// Combination
	const combinated: string[] = [];
	for (const i1 of array) {
		for (const i2 of array) {
			for (const i3 of array) {
				for (const i4 of array) {
					for (const i5 of array) {
						const item = Array.from(new Set([i1, i2, i3, i4, i5]));
						if (item.length === array.length) {
							const itemA = JSON.stringify(item);
							if (!combinated.includes(itemA)) {
								combinated.push(itemA);
							}
						}
					}
				}
			}
		}
	}

	const result = combinated.map(i => JSON.parse(i) as T[]);
	return result;
}
