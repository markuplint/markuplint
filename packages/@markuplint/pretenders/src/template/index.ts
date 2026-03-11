import type { PretenderScanTemplateOptions } from './types.js';
import type { OriginalNode } from '@markuplint/ml-config';

import path from 'node:path';

import { createScanner } from '../create-scanner.js';
import { PretenderDirector } from '../pretender-director.js';

import { deriveName } from './derive-name.js';
import { detectSlots } from './detect-slots.js';
import { extractAttrs } from './extract-attrs.js';
import { extractRoot } from './extract-root.js';
import { parseComponent } from './parse-component.js';

/**
 * Template scanner for Vue, Svelte, and Astro component files.
 *
 * Parses component files using markuplint's existing framework parsers,
 * extracts root elements at depth=0, detects static attributes and slot usage,
 * and registers component-to-element mappings via PretenderDirector.
 *
 * @param files - Absolute file paths to scan (relative paths cause a `ReferenceError`)
 * @param options - Template scanner configuration (cwd, component names to ignore)
 * @returns Discovered pretender mappings for all components found in the given files
 */
export const templateScanner = createScanner<PretenderScanTemplateOptions>(async (files, options) => {
	const cwd = options?.cwd ?? process.cwd();
	const ignoreComponentNames = options?.ignoreComponentNames ?? [];
	const director = new PretenderDirector();

	for (const filePath of files) {
		const componentName = deriveName(filePath);

		if (ignoreComponentNames.includes(componentName)) {
			continue;
		}

		const doc = await parseComponent(filePath);
		if (!doc) {
			continue;
		}

		const root = extractRoot(doc);
		if (!root) {
			continue;
		}

		const tagName = root.nodeName;
		const attrs = extractAttrs(root);
		const hasSlots = detectSlots(doc);
		const relFilePath = path.relative(cwd, filePath);

		const identity: string | OriginalNode =
			attrs.length > 0 || hasSlots
				? {
						element: tagName,
						...(attrs.length > 0 ? { attrs } : {}),
						slots: hasSlots ? true : null,
					}
				: tagName;

		director.add(componentName, identity, relFilePath, root.line, root.col, relFilePath);
	}

	return director.getPretenders();
});
