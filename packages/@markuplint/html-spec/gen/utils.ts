/* global cheerio */

import type { Attribute, AttributeJSON } from '@markuplint/ml-spec';

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

export function mergeAttributes(fromDocs: Attribute[], fromJSON: (string | AttributeJSON)[]) {
	const attributes: (Attribute | string)[] = [];

	for (const docs of fromDocs) {
		if (!docs.name) {
			continue;
		}
		const jsonIndex = fromJSON.findIndex(a => typeof a !== 'string' && a.name === docs.name);
		if (jsonIndex !== -1) {
			const json = fromJSON.splice(jsonIndex, 1)[0];
			if (json && typeof json !== 'string') {
				attributes.push({
					...{
						name: '',
						description: '',
						type: '',
					},
					...docs,
					...json,
				});
				continue;
			}
			fromJSON.push(json);
		}
		attributes.push(docs);
	}

	for (const spec of fromJSON) {
		if (typeof spec === 'string') {
			attributes.push(spec);
			continue;
		}
		attributes.push({
			...{
				name: '',
				description: '',
				type: '',
			},
			...spec,
		});
	}

	attributes.sort(nameCompare);

	return attributes;
}
