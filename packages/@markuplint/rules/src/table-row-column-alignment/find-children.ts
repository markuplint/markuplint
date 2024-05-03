import type { Element } from '@markuplint/ml-core';

const findCache: Record<string, Element<boolean>[]> = {};

export function findChildren(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean>,
	selector: string,
) {
	const key = `${el.uuid}:${selector}`;
	const cached = findCache[key];
	if (cached) {
		return cached;
	}

	const children = [...el.children].filter(child => child.matches(selector));

	findCache[key] = children;
	return children;
}
