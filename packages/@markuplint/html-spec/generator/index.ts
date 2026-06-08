/**
 * @module @markuplint/html-spec/generator
 *
 * Generates the markuplint extended specification JSON file by scraping W3C and MDN web standards
 * documentation. Aggregates HTML/SVG element specs, global attributes, ARIA roles and properties,
 * and content model definitions into a single output file consumed by the markuplint linter.
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

import { readFile, writeFile } from 'node:fs/promises';

import { getAria } from './aria.ts';
import { getFailedUrls, getReferences } from './fetch.ts';
import { getGlobalAttrs } from './global-attrs.ts';
import { getElements } from './html-elements.ts';
import { readJson } from './read-json.ts';
import { expandConditionAliases, resolveAliases } from './selector-aliases.ts';
import { summarizeChanges } from './summarize.ts';
import { validateSpecs } from './validate.ts';

/**
 * Configuration options for the spec generator.
 */
export type Options = {
	/** The absolute file path where the generated JSON spec will be written. */
	readonly outputFilePath: string;
	/** An absolute glob pattern matching per-element HTML spec JSON files. */
	readonly htmlFilePattern: string;
	/** The absolute file path to the common (global) attributes JSON definition. */
	readonly commonAttrsFilePath: string;
	/** The absolute file path to the common content models JSON definition. */
	readonly commonContentsFilePath: string;
	/** The absolute file path to the named selector alias definitions. */
	readonly selectorAliasesFilePath: string;
	/**
	 * Optional absolute file path to write a Markdown summary of the changes
	 * relative to the previously generated spec. Consumed by the auto-update
	 * workflow for the PR body. When omitted, no summary file is written.
	 */
	readonly summaryFilePath?: string;
};

/**
 * Main entry point for the spec generator. Fetches and aggregates all specification data
 * (HTML/SVG elements, global attributes, ARIA definitions, content models, and reference URLs)
 * then writes the combined result as a JSON file to the specified output path.
 *
 * @param options - The configuration options controlling input sources and output destination
 * @returns A promise that resolves when the output file has been written
 */
export async function main({
	outputFilePath,
	htmlFilePattern,
	commonAttrsFilePath,
	commonContentsFilePath,
	selectorAliasesFilePath,
	summaryFilePath,
}: Options) {
	const [specs, globalAttrs, aria] = await Promise.all([
		getElements(htmlFilePattern),
		getGlobalAttrs(commonAttrsFilePath),
		getAria(),
	]);

	// Expand named selector aliases (e.g. #ClassicScript) in attribute
	// conditions so that index.json contains only plain CSS selectors.
	const selectorAliases = resolveAliases(readJson(selectorAliasesFilePath));
	for (const spec of specs) {
		if (spec.attributes) {
			// @ts-ignore
			spec.attributes = expandConditionAliases(spec.attributes, selectorAliases);
		}
	}

	const cites = getReferences();
	const failedUrls = getFailedUrls();

	if (failedUrls.length > 0) {
		// eslint-disable-next-line no-console
		console.error(`\n❌ ${failedUrls.length} URL(s) failed to fetch:`);
		for (const url of failedUrls) {
			// eslint-disable-next-line no-console
			console.error(`   - ${url}`);
		}
	}

	const json: ExtendedSpec = {
		cites,
		def: {
			'#globalAttrs': globalAttrs,
			'#aria': aria,
			'#contentModels': readJson(commonContentsFilePath).models,
		},
		specs: [...specs],
	};

	// Read the previously committed spec (if any) before overwriting it, so it
	// can drive the element-count stability check and the change summary.
	const previous = await readPreviousSpec(outputFilePath);

	validateSpecs(json, previous);

	const jsonString = JSON.stringify(json, null, 2);

	await writeFile(outputFilePath, jsonString);

	// eslint-disable-next-line no-console
	console.log(`🎁 Output: ${outputFilePath}`);

	if (summaryFilePath) {
		const summary = summarizeChanges(previous, json);
		await writeFile(summaryFilePath, summary + '\n');
		// eslint-disable-next-line no-console
		console.log(`📝 Summary: ${summaryFilePath}`);
	}
}

/**
 * Reads and parses the previously generated spec file, returning `null` when it
 * does not exist or cannot be parsed (e.g. the very first generation).
 */
export async function readPreviousSpec(filePath: string): Promise<ExtendedSpec | null> {
	let raw: string;
	try {
		raw = await readFile(filePath, 'utf8');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			// No previous file (first generation): treated as no baseline.
			return null;
		}
		// Permission denied, I/O error, etc. — unexpected; do not mask it.
		throw error;
	}
	try {
		return JSON.parse(raw) as ExtendedSpec;
	} catch (error) {
		// The file exists but is unparsable. Don't block regeneration, but
		// surface it so the corruption isn't silently treated as a first run.
		// eslint-disable-next-line no-console
		console.warn(`⚠️ Could not parse the previous spec at ${filePath}; skipping baseline checks. ${String(error)}`);
		return null;
	}
}
