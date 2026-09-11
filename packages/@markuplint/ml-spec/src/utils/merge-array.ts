type NamedDefinition = string | { readonly name: string };

/**
 * Merges two arrays of named definitions by name, with items from `b` overriding
 * matching items in `a`. When both items are objects, their properties are merged;
 * when the overriding item is a string, the existing item is kept as-is.
 *
 * @template T - A named definition type (string or object with a `name` property)
 * @param a - The base array of named definitions
 * @param b - The array of named definitions to merge in, or null/undefined to skip
 * @returns A new array with items from `b` merged into `a` by name
 */
export function mergeArray<T extends NamedDefinition>(
	a: readonly T[],
	b: readonly T[] | null | undefined,
): readonly T[] {
	if (!b) {
		return a;
	}
	const result: T[] = [...a];
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
