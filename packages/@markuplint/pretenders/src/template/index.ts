import type { PretenderScanTemplateOptions } from './types.js';
import type { OriginalNode, PretenderAttr } from '@markuplint/ml-config';

import fs from 'node:fs';
import path from 'node:path';

import { createScanner } from '../create-scanner.js';
import { analyzeImports } from '../import-resolver/index.js';
import { normalizePath } from '../import-resolver/resolve-module-file.js';
import { PretenderDirector } from '../pretender-director.js';
import { getScanner } from '../scanner-loader.js';

import { deriveName } from './derive-name.js';

/**
 * Template scanner for Vue, Svelte, and Astro component files.
 *
 * Delegates to each parser package's component-scanner subpath export
 * via dynamic import, keeping framework-specific scanning logic co-located
 * with the parser that understands the framework best.
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

		const ext = path.extname(filePath).toLowerCase();
		const scanner = await getScanner(ext);
		if (!scanner) {
			continue;
		}

		let sourceCode: string;
		try {
			sourceCode = fs.readFileSync(filePath, 'utf8');
		} catch (error: unknown) {
			// eslint-disable-next-line no-console
			console.warn(`Failed to read component file: ${filePath}`, error instanceof Error ? error.message : error);
			continue;
		}

		const scan = scanner.scanComponent(sourceCode);
		if (!scan?.rootElement) {
			continue;
		}

		const relFilePath = normalizePath(path.relative(cwd, filePath));

		const attrs: readonly PretenderAttr[] = scan.attrs.map(a =>
			a.value === undefined ? { name: a.name } : { name: a.name, value: a.value },
		);

		const identity: string | OriginalNode =
			attrs.length > 0 || scan.hasSlots
				? {
						element: scan.rootElement,
						...(attrs.length > 0 ? { attrs } : {}),
						slots: scan.hasSlots ? true : null,
					}
				: scan.rootElement;

		director.add(componentName, identity, relFilePath, scan.line ?? 1, scan.col ?? 1, relFilePath);

		const importAnalysis = await analyzeImports(filePath, sourceCode);
		if (importAnalysis) {
			director.addImports(relFilePath, importAnalysis.bindings);
		}
	}

	return director.getPretenders(cwd);
});
