import type { Slot } from '@markuplint/ml-config';
import type { JsxOpeningElement, JsxSelfClosingElement, SourceFile } from 'typescript';

// import { finder } from './finder.js';

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
