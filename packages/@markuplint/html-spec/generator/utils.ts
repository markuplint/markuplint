import type * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

import type { ARIARoleInSchema } from '@markuplint/ml-spec';

type HasName = { readonly name: string };

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

/**
 * Detects the deprecation marker that opens a role's description. The role
 * markup carries no class or attribute for the status, so the marker text is the
 * only signal, and its wording differs between specs and versions:
 *
 * - WAI-ARIA 1.2 Recommendation: `[Deprecated in ARIA 1.2]`
 *   (https://www.w3.org/TR/wai-aria-1.2/#directory)
 * - WAI-ARIA 1.3 editor's draft (as of 2026-11): `[Deprecated since ARIA 1.2]`
 *   (https://w3c.github.io/aria/#directory). Data generated before the draft
 *   changed the wording still reads "Deprecated in".
 * - DPUB-ARIA: `[Deprecated in DPUB-ARIA 1.1]`
 *   (https://w3c.github.io/dpub-aria/#doc-biblioentry)
 *
 * Any `<prefix>-ARIA` (Graphics-ARIA, WAI-ARIA) is accepted as well, since the
 * graphics roles go through the same scraper. A wording this pattern does not
 * know drops the `deprecated` flag without any error, so
 * `test/structure.spec.mjs` pins the roles known to be deprecated against the
 * generated data.
 *
 * The marker has to open a paragraph (the description joins the paragraphs
 * with blank lines): a description can mention the word in prose (e.g.
 * "Authors are advised to treat directory as deprecated").
 */
export function isDeprecatedRole(description: string) {
	return /^\[deprecated (?:in|since) (?:[a-z]+-)?aria \d+\.\d+\]/im.test(description);
}

/**
 * Detects the parenthesized deprecation note that WAI-ARIA and DPUB-ARIA append
 * to an entry of a role's property lists, e.g. `aria-errormessage (deprecated on
 * this role in ARIA 1.2)` or `aria-invalid (state) (Global use deprecated in
 * ARIA 1.2)` (https://www.w3.org/TR/wai-aria-1.2/#button, Inherited States and
 * Properties). The note is required to name an ARIA version so that a list
 * entry carrying explanatory prose with the word "deprecated" is not mistaken
 * for one, and a negated note ("not deprecated") does not count.
 */
export function isDeprecatedOwnedProperty(text: string) {
	return /\((?:[^()]*\s)?(?<!\bnot\s)deprecated\s(?:[^()]*\s)?aria \d+\.\d[^()]*\)/i.test(text);
}

/**
 * Sets the per-role `deprecated` flag of each inherited property of a DPUB-ARIA
 * role from its superclass roles in the given WAI-ARIA version.
 *
 * DPUB-ARIA annotates every inherited entry of `aria-disabled`, `aria-errormessage`,
 * `aria-haspopup` and `aria-invalid` with "(Global use deprecated in ARIA 1.2)",
 * whatever the superclass. That note says the property is no longer global; it
 * does not say the role stops supporting it. WAI-ARIA §5.1.1 Superclass Role:
 *
 * > This extension causes all the states and properties of the superclass role
 * > to propagate to the subclass role.
 *
 * So `doc-noteref`, a subclass of `link`, keeps `aria-disabled` and
 * `aria-haspopup` the way `link` does. Reading the note as a per-role
 * deprecation would report them on `doc-noteref` and not on `link`.
 *
 * DPUB-ARIA is also versioned apart from WAI-ARIA, so the same DPUB role takes
 * the flags of the WAI-ARIA version it is used with (none in 1.1).
 *
 * A property is deprecated when every superclass that owns it marks it so.
 *
 * @see https://w3c.github.io/aria/
 */
export function inheritDeprecatedProperties(
	dpubRoles: readonly ARIARoleInSchema[],
	ariaRoles: readonly ARIARoleInSchema[],
): ARIARoleInSchema[] {
	return dpubRoles.map(role => {
		const superclasses = (role.generalization ?? [])
			.map(name => ariaRoles.find(r => r.name === name))
			.filter(r => r != null);
		return {
			...role,
			ownedProperties: role.ownedProperties?.map(prop => {
				const owned = superclasses
					.map(r => r.ownedProperties?.find(p => p.name === prop.name))
					.filter(p => p != null);
				const deprecated = (owned.length > 0 && owned.every(p => p.deprecated)) || undefined;
				// Keeps the key order `name`, `deprecated`, … that `getRoles` writes.
				return Object.assign({ name: prop.name, deprecated }, prop, { deprecated });
			}),
		};
	});
}

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
