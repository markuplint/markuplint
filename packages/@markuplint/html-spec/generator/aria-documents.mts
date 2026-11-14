import type { ARIAVersion } from '@markuplint/ml-spec';

/**
 * The documents that the generator reads the ARIA roles and properties from, in a module of their own so that
 * `scripts/spec-citations` watches exactly these documents: a document that is read here and not watched there would
 * let a reworded definition through unseen.
 *
 * The extension is `.mts` because `@markuplint/html-spec` is a CommonJS package (its `index.js` is), and the script
 * loads this file with Node's type stripping, which would take a `.ts` file of such a package for CommonJS.
 *
 * WAI-ARIA 1.1 and 1.2 are read at their dated editions because their data is frozen; 1.3 is read at the editor's
 * draft.
 */
export function ariaSpecURLByVersion(version: ARIAVersion, graphicsAria = false): string {
	switch (version) {
		case '1.3': {
			if (!graphicsAria) {
				return 'https://w3c.github.io/aria/';
			}
			return 'https://w3c.github.io/graphics-aria/';
		}
		case '1.2': {
			if (!graphicsAria) {
				return 'https://www.w3.org/TR/wai-aria-1.2/';
			}
			return 'https://w3c.github.io/graphics-aria/';
		}
		case '1.1': {
			if (!graphicsAria) {
				return 'https://www.w3.org/TR/wai-aria-1.1/';
			}
			return 'https://www.w3.org/TR/graphics-aria-1.0/';
		}
	}
}

export const DPUB_ARIA_URL = 'https://w3c.github.io/dpub-aria/';
