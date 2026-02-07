import type { Slot } from '@markuplint/ml-config';
import type { JsxOpeningElement, JsxSelfClosingElement, SourceFile } from 'typescript';

// import { finder } from './finder.js';

/**
 * Extracts child slot information from a JSX element.
 * Currently returns an empty array as child slot extraction is not yet implemented.
 *
 * @param el - The JSX opening or self-closing element to extract children from
 * @param sourceFile - The TypeScript source file containing the element
 * @returns An array of Slot objects representing discovered child slots
 */
export function getChildren(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: JsxOpeningElement | JsxSelfClosingElement,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: SourceFile,
): Slot[] {
	const children: Slot[] = [];
	// const find = finder(sourceFile);

	return children;
}
