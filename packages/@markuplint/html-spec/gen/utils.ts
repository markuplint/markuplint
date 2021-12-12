/* global cheerio */

type HasName = { name: string };

export function nameCompare(a: HasName | string, b: HasName | string) {
	const nameA = typeof a === 'string' ? a : a.name.toUpperCase();
	const nameB = typeof b === 'string' ? b : b.name.toUpperCase();
	if (nameA < nameB) {
		return -1;
	}
	if (nameA > nameB) {
		return 1;
	}
	return 0;
}

export function sortObjectByKey<T>(o: T): T {
	const keys = Object.keys(o);
	keys.sort(nameCompare);
	// @ts-ignore
	const newObj: T = {};
	keys.forEach(key => {
		// @ts-ignore
		newObj[key] = o[key];
	});
	return newObj;
}

export function arrayUnique<T extends HasName>(array: T[]) {
	const nameStack: string[] = [];
	const result: T[] = [];
	for (const item of array) {
		if (nameStack.includes(item.name)) {
			continue;
		}
		result.push(item);
		nameStack.push(item.name);
	}
	return result;
}

export function getThisOutline($: cheerio.Root, $start: cheerio.Cheerio) {
	const $container = $('<div></div>');
	let $next = $start.next();
	const els = [$start.clone()];
	while (!!$next.length && !$next.filter('h2').length) {
		els.push($next.clone());
		$next = $next.next();
	}
	els.forEach(el => $container.append(el));
	return $container;
}

export function mergeAttributes<T>(fromDocs: T, fromJSON: T): T {
	return {
		...fromDocs,
		...fromJSON,
	};
}

export function keys<T, K = keyof T>(object: T): K[] {
	// @ts-ignore
	return Object.keys(object) as K[];
}
