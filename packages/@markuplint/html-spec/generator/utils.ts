import type * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

/**
 * Represents an object that has a `name` property.
 */
type HasName = { readonly name: string };

/**
 * Compares two items by their name property (or string value) in a case-insensitive manner.
 * Suitable for use as a comparator function in `Array.prototype.sort`.
 *
 * @param a - The first item to compare, either a string or an object with a `name` property
 * @param b - The second item to compare, either a string or an object with a `name` property
 * @returns A negative number if `a` comes before `b`, positive if after, or zero if equal
 */
export function nameCompare(a: HasName | string, b: HasName | string) {
	const nameA = typeof a === 'string' ? a : (a.name?.toUpperCase() ?? String(a));
	const nameB = typeof b === 'string' ? b : (b.name?.toUpperCase() ?? String(b));
	if (nameA < nameB) {
		return -1;
	}
	if (nameA > nameB) {
		return 1;
	}
	return 0;
}

/**
 * Creates a new object with the same key-value pairs, sorted alphabetically by key.
 *
 * @template T - The type of the object
 * @param o - The object whose keys should be sorted
 * @returns A new object with keys in sorted alphabetical order
 */
export function sortObjectByKey<T>(o: T): T {
	// @ts-ignore
	const keys = Object.keys(o).toSorted(nameCompare);
	// @ts-ignore
	const newObj: T = {};
	for (const key of keys) {
		// @ts-ignore
		newObj[key] = o[key];
	}
	return newObj;
}

/**
 * Removes duplicate items from an array based on their `name` property,
 * keeping only the first occurrence.
 *
 * @template T - The type of array items, must have a `name` property
 * @param array - The array to deduplicate
 * @returns A new array with unique items by name
 */
export function arrayUnique<T extends HasName>(array: readonly T[]) {
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

/**
 * Collects all sibling elements following a starting element until the next `<h2>` heading
 * (or end of siblings) and wraps them in a container `<div>`.
 * Useful for extracting a section of content defined by a heading.
 *
 * @param $ - The Cheerio API instance for DOM manipulation
 * @param $start - The starting element (typically a heading) from which to collect siblings
 * @returns A Cheerio wrapper around a `<div>` containing cloned elements of the section
 */
export function getThisOutline(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	$: cheerio.CheerioAPI,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	$start: cheerio.Cheerio<AnyNode>,
) {
	const $container = $('<div></div>');
	let $next = $start.next();
	const els = [$start.clone()];
	while ($next.length > 0 && $next.filter('h2').length === 0) {
		els.push($next.clone());
		$next = $next.next();
	}
	for (const el of els) $container.append(el);
	return $container;
}

/**
 * Merges two attribute objects, with values from `fromJSON` taking precedence
 * over values from `fromDocs` when keys overlap.
 *
 * @template T - The type of the attribute objects
 * @param fromDocs - Attribute data sourced from documentation
 * @param fromJSON - Attribute data sourced from JSON specification files
 * @returns A merged object combining both sources
 */
export function mergeAttributes<T>(fromDocs: T, fromJSON: T): T {
	return {
		...fromDocs,
		...fromJSON,
	};
}

/**
 * Returns the keys of an object with a custom type cast.
 *
 * @template T - The type of the input object
 * @template K - The desired key type (defaults to `keyof T`)
 * @param object - The object whose keys to extract
 * @returns An array of the object's keys cast to the specified type
 */
export function keys<T, K = keyof T>(object: T): K[] {
	// @ts-ignore
	return Object.keys(object) as K[];
}

/**
 * Parses an element name string to extract the local name, namespace, and markup language type.
 * Handles SVG-prefixed names (e.g., `"svg_circle"`), MathML-prefixed names (e.g., `"mml_math"`),
 * and plain HTML names.
 *
 * @param origin - The raw element name, optionally prefixed with `"svg_"` or `"mml_"` for SVG/MathML elements
 * @returns An object containing the `localName`, optional `namespace` URI, and `ml` type (`"SVG"`, `"MathML"`, or `"HTML"`)
 */
export function getName(origin: string) {
	const [, rawNs, localName] = origin.match(/^(?:(svg|mml)_)?([\w-]+)/i) ?? [];
	const ns = rawNs?.toLowerCase();
	const name = localName ?? origin;
	const ml = ns === 'svg' ? 'SVG' : ns === 'mml' ? 'MathML' : 'HTML';
	const namespace: 'http://www.w3.org/2000/svg' | 'http://www.w3.org/1998/Math/MathML' | undefined =
		ns === 'svg' ? 'http://www.w3.org/2000/svg' : ns === 'mml' ? 'http://www.w3.org/1998/Math/MathML' : undefined;

	return {
		localName: name,
		namespace,
		ml,
	};
}
