import type { MLASTDocument, MLParser } from '@markuplint/ml-ast';

import fs from 'node:fs';
import path from 'node:path';

type FrameworkType = 'vue' | 'svelte' | 'astro';

const EXTENSION_MAP: Record<string, FrameworkType> = {
	'.vue': 'vue',
	'.svelte': 'svelte',
	'.astro': 'astro',
};

/**
 * Determines the framework type from the file extension.
 */
export function getFrameworkType(filePath: string): FrameworkType | null {
	const ext = path.extname(filePath).toLowerCase();
	return EXTENSION_MAP[ext] ?? null;
}

/**
 * Dynamically imports the appropriate parser for the given framework.
 */
async function getParser(framework: FrameworkType): Promise<MLParser> {
	switch (framework) {
		case 'vue': {
			const { parser } = await import('@markuplint/vue-parser');
			return parser;
		}
		case 'svelte': {
			const { parser } = await import('@markuplint/svelte-parser');
			return parser;
		}
		case 'astro': {
			const { parser } = await import('@markuplint/astro-parser');
			return parser;
		}
	}
}

/**
 * Parses a component file into an MLASTDocument using the appropriate framework parser.
 *
 * @returns The parsed document, or `null` if the file extension is not supported.
 */
export async function parseComponent(filePath: string): Promise<MLASTDocument | null> {
	const framework = getFrameworkType(filePath);
	if (!framework) {
		return null;
	}

	const sourceCode = fs.readFileSync(filePath, 'utf8');
	const parser = await getParser(framework);
	return parser.parse(sourceCode);
}
