/**
 * @module @markuplint/html-spec/generator
 *
 * Generates the markuplint extended specification JSON file by scraping W3C and MDN web standards
 * documentation. Aggregates HTML/SVG element specs, global attributes, ARIA roles and properties,
 * and content model definitions into a single output file consumed by the markuplint linter.
 */

import type { ExtendedElementSpec, ExtendedSpec } from '@markuplint/ml-spec';

import { writeFile } from 'node:fs/promises';

import { getAria } from './aria.ts';
import { getFailedUrls, getReferences } from './fetch.ts';
import { getGlobalAttrs } from './global-attrs.ts';
import { getElements } from './html-elements.ts';
import { readJson } from './read-json.ts';

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
};

/**
 * Main entry point for the spec generator. Fetches and aggregates all specification data
 * (HTML/SVG elements, global attributes, ARIA definitions, content models, and reference URLs)
 * then writes the combined result as a JSON file to the specified output path.
 *
 * @param options - The configuration options controlling input sources and output destination
 * @returns A promise that resolves when the output file has been written
 */
export async function main({ outputFilePath, htmlFilePattern, commonAttrsFilePath, commonContentsFilePath }: Options) {
	const [specs, globalAttrs, aria] = await Promise.all([
		getElements(htmlFilePattern),
		getGlobalAttrs(commonAttrsFilePath),
		getAria(),
	]);

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

	validateSpecs(specs);

	const json: ExtendedSpec = {
		cites,
		def: {
			'#globalAttrs': globalAttrs,
			'#aria': aria,
			'#contentModels': readJson(commonContentsFilePath).models,
		},
		specs: [...specs],
	};

	const jsonString = JSON.stringify(json, null, 2);

	await writeFile(outputFilePath, jsonString);

	// eslint-disable-next-line no-console
	console.log(`🎁 Output: ${outputFilePath}`);
}

/**
 * Validates the generated specs to detect data loss from failed scraping.
 * Throws an error if the ratio of empty descriptions exceeds the threshold,
 * preventing broken data from being written.
 */
function validateSpecs(specs: readonly ExtendedElementSpec[]) {
	const threshold = 0.5;
	const htmlSpecs = specs.filter(s => !s.name.includes(':'));
	const emptyDescriptions = htmlSpecs.filter(s => !s.description);
	const emptyRatio = emptyDescriptions.length / htmlSpecs.length;

	if (emptyRatio > threshold) {
		throw new Error(
			`Spec validation failed: ${emptyDescriptions.length}/${htmlSpecs.length} HTML elements ` +
				`(${Math.round(emptyRatio * 100)}%) have empty descriptions. ` +
				'This likely indicates MDN fetch failures. Aborting to prevent data loss.',
		);
	}
}
