import type { Citation } from './types.ts';

import { GENERATED_DATA, isAriaCitation } from './aria.ts';

/**
 * The hand-written spec data of `@markuplint/html-spec` (`src/*.jsonc`): it cites the passages behind the content
 * models and the attributes that `permitted-contents` and `invalid-attr` rely on, and, on the first line of the file
 * of an element, the section that defines the element (`definitionCitations`). Only the `.jsonc` files directly in
 * the directory are spec data.
 */
export const SPEC_DATA = 'packages/@markuplint/html-spec/src';

/** The source file of an element: `a` is `spec.a.jsonc`. */
function isElementSource(path: string): boolean {
	return (
		path.startsWith(`${SPEC_DATA}/spec.`) &&
		path.endsWith('.jsonc') &&
		!path.slice(SPEC_DATA.length + 1).includes('/')
	);
}

/**
 * The source file of an element: `a` is `spec.a.jsonc`, and a namespaced element swaps the colon for an
 * underscore (`svg:rect` is `spec.svg_rect.jsonc`, `mml:mfrac` is `spec.mml_mfrac.jsonc`).
 */
export function elementSourcePath(name: string): string {
	return `${SPEC_DATA}/spec.${name.replace(':', '_')}.jsonc`;
}

/**
 * The citation that stands for the definition of the element in each of its source files: the one on the first
 * line, which opens the file. The citations after it point at the accessibility mappings and at what the data
 * depends on besides the definition.
 *
 * It is the line, not "the first citation the monitor reads", that decides: a header that points at a host the
 * monitor does not read (a page that moved, MDN) would otherwise hand the place to the accessibility mapping on
 * the next line, and the definition would go unwatched without anything saying so.
 *
 * The weekly monitor, which reads the section itself, is what notices that the specification reworded the
 * definition.
 */
export function definitionCitations(citations: readonly Citation[]): Map<string, Citation> {
	const first = new Map<string, Citation>();
	for (const citation of citations) {
		if (isDefinitionCitation(citation)) {
			first.set(citation.file, citation);
		}
	}
	return first;
}

/** Whether a citation is the one that stands for the definition of an element (see `definitionCitations`). */
export function isDefinitionCitation(citation: Citation): boolean {
	return citation.line === 1 && isElementSource(citation.file);
}

/**
 * The fewest characters that the text of a cited section may have for the citation to stand for the definition of
 * an element. The text of an anchor is the heading and the prose under it, the paragraph that carries the id
 * together with the definition box after it, or the term of a definition list together with its description
 * (`extract.ts`). An anchor whose text is a few words is the name of a term (`#elementdef-a`), which would never
 * show a change of the definition. The limit is a heuristic between such an anchor and a section that holds the
 * definition: a definition shorter than it is reported, and the section to cite is the one that holds more.
 */
export const MIN_DEFINITION_LENGTH = 100;

/**
 * The same for the section of a role or a property of ARIA, which the generated data cites. A simple role has a
 * short section, so the limit is lower than an element's: it rejects the anchor of a term, not a short section.
 */
export const MIN_ARIA_DEFINITION_LENGTH = 30;

/**
 * What a citation has to be long enough to stand for, or `null` when it need not be: the definition of an element
 * (the first line of its source file) or of a role or a property of ARIA (derived from the generated data). `advice`
 * is what to do about a section that is too short, which differs because only the first can be re-pointed by hand.
 * The term of an obsolete element is cited by the generated data too, and is a line long by nature (`xmp`: "Use pre
 * and code instead"), so it has no minimum.
 */
export function definitionOf(
	citation: Citation,
): { readonly minimum: number; readonly what: string; readonly advice: string } | null {
	if (isDefinitionCitation(citation)) {
		return {
			minimum: MIN_DEFINITION_LENGTH,
			what: 'element',
			advice: 'the section that holds the definition is the one to cite',
		};
	}
	if (citation.file === GENERATED_DATA && isAriaCitation(citation)) {
		return {
			minimum: MIN_ARIA_DEFINITION_LENGTH,
			what: 'role or property',
			advice: 'it is found by the name in index.json, so check that the name is the id of that role or property on the page',
		};
	}
	return null;
}
