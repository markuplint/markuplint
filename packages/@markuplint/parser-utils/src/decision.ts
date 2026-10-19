import { isCustomElementName } from '@markuplint/types';

import { svgElementList } from './const.js';

export function isSVGElement(nodeName: string) {
	return svgElementList.includes(nodeName);
}

const isCEN = isCustomElementName();
export function isPotentialCustomElementName(tagName: string) {
	return isCEN(tagName);
}

/**
 * The form of a component name in JSX: an identifier that does not start with a lowercase
 * ASCII letter (`Foo`, `$ui`, `_Foo`, `Éa`), or a member expression (`Tabs.Root`).
 *
 * The JSX compilers decide so: Babel takes a name that matches `/^[a-z]/` for an intrinsic
 * element and any other identifier for a reference (`isCompatTag`), and TypeScript likewise
 * takes an identifier with a lowercase ASCII initial for an intrinsic element.
 */
export const componentNamePattern = /^(?![a-z])[$_\p{ID_Start}]|\./u;

/**
 * Whether `name` is a reference to a component, not the name of an element, judged by
 * its form alone ({@link componentNamePattern}).
 *
 * The scanners of `pretenders.auto` / `pretenders.scan` follow what a component
 * renders until they reach a name they cannot resolve (a component of a package, a
 * member expression such as `Tabs.Root`, a local variable, a namespace import, a
 * component past the depth limit), and emit that name unchanged. Such a name is never
 * an element: the names of HTML, SVG and MathML elements start with a lowercase ASCII
 * letter and have no `.` (the camelCase of `foreignObject` starts with one), and the
 * `.` is valid only in a custom element name, which a hyphen and a lowercase start
 * give away. So the form of the name tells, however the chain stopped.
 *
 * The case sensitivity of the document is not part of the criterion: a Vue template
 * ignores the case of tag names, yet its components are written in PascalCase just
 * the same. Neither is a parser's pattern for authored names (`authoredElementName`):
 * it is the parser's own, and the scanners and ml-core must agree on this one.
 *
 * @param name - A tag name as written, case kept
 */
export function isComponentName(name: string): boolean {
	return componentNamePattern.test(name) && !isPotentialCustomElementName(name);
}
