import type { MLASTDocument, MLParser } from '@markuplint/ml-ast';

import fs from 'node:fs';
import path from 'node:path';

/**
 * Parses a component file of a framework into the MLAST document the specs of `src/template` take as their
 * input. The parsers are `devDependencies` of this package, so a missing one is a broken test setup and is
 * left to throw.
 */

type FrameworkType = 'vue' | 'svelte' | 'astro';

const EXTENSION_MAP: Record<string, FrameworkType> = {
	'.vue': 'vue',
	'.svelte': 'svelte',
	'.astro': 'astro',
};

/**
 * The framework a component file belongs to, by its extension.
 *
 * @param filePath - The path of the file
 * @returns The framework, or `null` for an extension that is none of them
 */
export function getFrameworkType(filePath: string): FrameworkType | null {
	const ext = path.extname(filePath).toLowerCase();
	return EXTENSION_MAP[ext] ?? null;
}

const PARSER_PACKAGES: Record<FrameworkType, string> = {
	vue: '@markuplint/vue-parser',
	svelte: '@markuplint/svelte-parser',
	astro: '@markuplint/astro-parser',
};

async function getParser(framework: FrameworkType): Promise<MLParser> {
	const mod: { parser: MLParser } = await import(PARSER_PACKAGES[framework]);
	return mod.parser;
}

/**
 * Reads and parses a component file.
 *
 * @param filePath - The path of the file
 * @returns The document, or `null` for an extension that is none of the frameworks', a file that cannot be
 *   read, or one the parser rejects (a malformed file raises whatever its libraries do, a `SyntaxError`
 *   included: it is a file to skip, which the specs of the scanners rely on)
 */
export async function parseComponent(filePath: string): Promise<MLASTDocument | null> {
	const framework = getFrameworkType(filePath);
	if (!framework) {
		return null;
	}

	const parser = await getParser(framework);

	try {
		const sourceCode = fs.readFileSync(filePath, 'utf8');
		return parser.parse(sourceCode);
	} catch (error: unknown) {
		// eslint-disable-next-line no-console
		console.warn(`Failed to parse component: ${filePath}`, error instanceof Error ? error.message : error);
		return null;
	}
}
