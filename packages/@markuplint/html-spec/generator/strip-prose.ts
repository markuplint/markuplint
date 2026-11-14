import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * The generated data carries no prose: no `description` of an element, of an attribute (the global ones too) or of
 * an ARIA role, and no `valueDescriptions` of an ARIA property. A `description` in a source file of `src/` is
 * dropped as well.
 *
 * It is text copied from MDN (CC-BY-SA) and from the W3C documents, and markuplint reads none of it. What notices
 * that a specification was reworded is the weekly spec citation watch (`scripts/spec-citations`), which reads the
 * specification itself for every element and every ARIA role and property.
 *
 * The generator still scrapes the text and uses it before this runs (`isDeprecatedRole` reads the marker of a role,
 * and `validateSpecs` takes an empty description for a failed MDN fetch): `finalizeSpec` is where the order is
 * kept. This is the one place where the output is assembled, so a scraper does not decide what is written.
 *
 * It is structural, not a walk that deletes every key called `description`: an attribute can be named
 * `description` and is data. An attribute that had nothing but a description (one that only MDN lists) stays as an
 * empty entry, because the entry is what makes the attribute known (`getAttrSpecs` gives it the type `Any`). The
 * input is not changed.
 */
export function stripProse(spec: ExtendedSpec): ExtendedSpec {
	const { def, specs } = spec;
	return {
		...spec,
		...(def && { def: stripDefs(def) }),
		...(specs && { specs: specs.map(stripElement) }),
	};
}

type Defs = NonNullable<ExtendedSpec['def']>;
type Element = NonNullable<ExtendedSpec['specs']>[number];
type Attributes = NonNullable<Element['attributes']>;
type Aria = NonNullable<Defs['#aria']>;
type AriaList = Aria[keyof Aria];

function omit<T extends object>(value: T, key: string): T {
	return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key)) as T;
}

function stripAttributes(attributes: Attributes): Attributes {
	return Object.fromEntries(Object.entries(attributes).map(([name, attr]) => [name, omit(attr, 'description')]));
}

function stripElement(element: Element): Element {
	// Rebuilt entry by entry, not with a spread of `attributes` last: the file is compared with a regeneration line
	// by line, so the keys keep the order in which the generator writes them.
	return Object.fromEntries(
		Object.entries(element)
			.filter(([key]) => key !== 'description')
			.map(([key, value]) => [key, key === 'attributes' ? stripAttributes(value as Attributes) : value]),
	) as Element;
}

function stripAria(aria: AriaList): AriaList {
	const strip = <T extends object>(list: readonly T[] | undefined, key: string) =>
		list?.map(entry => omit(entry, key));
	return {
		...aria,
		...(aria.roles && { roles: strip(aria.roles, 'description') }),
		...(aria.graphicsRoles && { graphicsRoles: strip(aria.graphicsRoles, 'description') }),
		...(aria.dpubRoles && { dpubRoles: strip(aria.dpubRoles, 'description') }),
		...(aria.props && { props: strip(aria.props, 'valueDescriptions') }),
	} as AriaList;
}

function stripDefs(def: Defs): Defs {
	const globalAttrs = def['#globalAttrs'];
	const aria = def['#aria'];
	return {
		...def,
		...(globalAttrs && {
			'#globalAttrs': Object.fromEntries(
				Object.entries(globalAttrs).map(([category, attrs]) => [category, stripAttributes(attrs)]),
			),
		}),
		...(aria && {
			'#aria': Object.fromEntries(Object.entries(aria).map(([version, list]) => [version, stripAria(list)])),
		}),
	} as Defs;
}
