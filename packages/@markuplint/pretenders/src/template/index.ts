import type { Framework, ScriptProps } from './analyze-script.js';
import type { PretenderScanTemplateOptions } from './types.js';
import type { ComponentScanResult } from '../component-scanner.js';
import type { OriginalNode, PretenderAttr } from '@markuplint/ml-config';

import fs from 'node:fs';
import path from 'node:path';

import { isTrivialContents } from '../contents.js';
import { createScanner } from '../create-scanner.js';
import { analyzeImports } from '../import-resolver/index.js';
import { normalizePath, recordDependency } from '../import-resolver/resolve-module-file.js';
import { PretenderDirector } from '../pretender-director.js';
import { getScanner } from '../scanner-loader.js';

import { analyzeScript, createTemplatePropResolver } from './analyze-script.js';
import { deriveName } from './derive-name.js';
import { deriveSlotInfo, toAttrs } from './slot-info.js';

const FRAMEWORKS: Readonly<Record<string, Framework>> = {
	'.vue': 'vue',
	'.svelte': 'svelte',
	'.astro': 'astro',
};

const VUE_DISABLES_FALLTHROUGH = /\binheritAttrs\s*:\s*false\b/;
// `defineProps` of `<script setup>`, and `props:` of the Options API
const VUE_DECLARES_PROPS = /\bdefineProps\b|\bprops\s*:/;

/**
 * The source of a Vue SFC without its `<template>`, so that the text of the template
 * (`props:` in a sentence) is not taken for the script.
 */
function scriptsOf(sourceCode: string) {
	return sourceCode.replace(/<template[\s\S]*<\/template>/i, '');
}

/**
 * Whether the attributes written at the usage site reach the root element.
 *
 * - Vue falls them through to the root of a template that has one root, unless the
 *   component says `inheritAttrs: false` (any `inheritAttrs: false` in the file counts, so
 *   a component that may disable it is not taken to inherit). A prop the component declares
 *   is not an attribute (`<Alert type="error">` does not give its `div` a `type`), but
 *   `inheritAttrs` has no way to say which attributes, so a component that declares props
 *   is not taken to inherit: it would validate the props as attributes of the root.
 *   `v-bind="$attrs"` on the root hands the attributes over whatever the component says.
 * - Svelte and Astro: when the root spreads the props (`{...$$restProps}`, `{...rest}`
 *   of a destructuring, `{...Astro.props}`).
 */
function isInheritingAttrs(
	framework: Framework,
	scan: Pick<ComponentScanResult, 'spreads' | 'hasSiblingRoots'>,
	props: ScriptProps,
	sourceCode: string,
): boolean {
	const spreads = scan.spreads ?? [];
	if (framework === 'vue') {
		const scripts = scriptsOf(sourceCode);
		return (
			spreads.includes('$attrs') ||
			(!scan.hasSiblingRoots && !VUE_DISABLES_FALLTHROUGH.test(scripts) && !VUE_DECLARES_PROPS.test(scripts))
		);
	}
	return spreads.some(spread => props.rests.has(spread));
}

/**
 * Template scanner for Vue, Svelte, and Astro component files.
 *
 * Delegates to each parser package's component-scanner subpath export
 * via dynamic import, keeping framework-specific scanning logic co-located
 * with the parser that understands the framework best.
 *
 * An attribute whose value is just a prop of the component (`:aria-label="label"` with
 * `defineProps(['label'])`) is `{ fromAttr: 'label', omitIfMissing: true }` (see
 * `analyzeScript` for what is read, and what is not). The scanners never write `aria`:
 * `aria-label` and the like are attributes, so that the accessible name algorithm computes
 * the name from them.
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
		const framework = FRAMEWORKS[ext];
		const scanner = framework ? await getScanner(ext) : null;
		if (!framework || !scanner) {
			continue;
		}

		// Recorded even when the read below fails: the file coming back is a change too.
		recordDependency(options?.dependencies, filePath);

		const overrideSource = options?.sources?.get(normalizePath(filePath));
		let sourceCode: string;
		if (overrideSource === undefined) {
			try {
				sourceCode = fs.readFileSync(filePath, 'utf8');
			} catch (error: unknown) {
				// eslint-disable-next-line no-console
				console.warn(
					`Failed to read component file: ${filePath}`,
					error instanceof Error ? error.message : error,
				);
				continue;
			}
		} else {
			sourceCode = overrideSource;
		}

		const scan = scanner.scanComponent(sourceCode);
		if (!scan?.rootElement) {
			continue;
		}

		const relFilePath = normalizePath(path.relative(cwd, filePath));

		const props = analyzeScript(framework, scan.scriptSource?.content);
		const resolveProp = createTemplatePropResolver(framework, props);
		const isInherit = isInheritingAttrs(framework, scan, props, sourceCode);

		const attrs: readonly PretenderAttr[] = toAttrs(scan.attrs, resolveProp);

		const { slots, contents } = deriveSlotInfo(scan, resolveProp);
		const hasContents = !isTrivialContents(contents);

		// Never just the element name: a bare name reads as an element that renders
		// the children written at the usage site, so it would lose `slots: null`.
		const identity: OriginalNode = {
			element: scan.rootElement,
			...(attrs.length > 0 ? { attrs } : {}),
			slots,
			...(hasContents ? { contents } : {}),
			...(isInherit ? { inheritAttrs: true } : {}),
		};

		director.add(componentName, identity, relFilePath, scan.line ?? 1, scan.col ?? 1, relFilePath);

		const importAnalysis = await analyzeImports(filePath, sourceCode);
		if (importAnalysis) {
			director.addImports(relFilePath, importAnalysis.bindings);
		}
	}

	return director.getPretenders(cwd, options?.sources, options?.dependencies);
});
