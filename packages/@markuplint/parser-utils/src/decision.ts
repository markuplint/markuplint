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
 * Whether `name` is a reference to a component, not the name of an element, judged by
 * its form alone.
 *
 * The scanners of `pretenders.auto` / `pretenders.scan` follow what a component
 * renders until they reach a name they cannot resolve (a component of a package, a
 * member expression such as `Tabs.Root`, a local variable, a namespace import, a
 * component past the depth limit), and emit that name unchanged. Such a name is never
 * an element: the names of HTML, SVG and MathML elements start with a lowercase
 * letter and have no `.` (the camelCase of `foreignObject` starts with one), and the
 * `.` is valid only in a custom element name, which a hyphen and a lowercase start
 * give away. So the form of the name tells, however the chain stopped.
 *
 * This is the form that most languages share, and the default of `Parser#isComponentName`.
 * A parser of a language that names its components otherwise overrides that method, and what asks
 * (the scanners, `ml-core`, `pretenders`) asks the parser, not this function. It is called by name for a
 * parser that says nothing and for a file of a language that has no parser to ask.
 *
 * The case sensitivity of the document is not part of the criterion, nor is the user's pattern for
 * authored names (`authoredElementName`): the scanners and ml-core must agree on the rule of the language.
 *
 * @param name - A tag name as written, case kept
 * @returns Whether the name is a component's
 */
export function isComponentName(name: string): boolean {
	return /^[A-Z]|\./.test(name) && !isPotentialCustomElementName(name);
}
