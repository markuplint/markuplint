type NamedDefinition = string | { name: string };

export function mergeArray<T extends NamedDefinition>(a: T[], b: T[] | null | undefined): T[] {
	if (!b) {
		return a;
	}
	const result: T[] = a.slice();
	for (const bItem of b) {
		const bName = getName(bItem);
		const aIndex = result.findIndex(item => getName(item) === bName);
		if (aIndex === -1) {
			result.push(bItem);
			continue;
		}
		const aItem = result.splice(aIndex, 1)[0];
		if (typeof bItem === 'string') {
			continue;
		}
		if (typeof aItem === 'string') {
			result.push(bItem);
			continue;
		}
		const exItem = {
			...(aItem as { name: string }),
			...(bItem as { name: string }),
		};
		result.push(exItem as T);
	}
	return result;
}

function getName(def: NamedDefinition): string {
	const result = typeof def === 'string' ? def : def.name;
	return result.toLowerCase().trim();
}
