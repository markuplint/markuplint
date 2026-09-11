import type { MLASTDocument, MLParser } from '@markuplint/ml-ast';

import fs from 'node:fs';
import path from 'node:path';

type FrameworkType = 'vue' | 'svelte' | 'astro';

const EXTENSION_MAP: Record<string, FrameworkType> = {
	'.vue': 'vue',
	'.svelte': 'svelte',
	'.astro': 'astro',
};

export function getFrameworkType(filePath: string): FrameworkType | null {
	const ext = path.extname(filePath).toLowerCase();
	return EXTENSION_MAP[ext] ?? null;
}

const PARSER_PACKAGES: Record<FrameworkType, string> = {
	vue: '@markuplint/vue-parser',
	svelte: '@markuplint/svelte-parser',
	astro: '@markuplint/astro-parser',
};

export function isModuleNotFoundError(error: unknown): boolean {
	return (
		error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND'
	);
}

async function getParser(framework: FrameworkType): Promise<MLParser | null> {
	const pkg = PARSER_PACKAGES[framework];
	try {
		const mod: { parser: MLParser } = await import(pkg);
		return mod.parser;
	} catch (error: unknown) {
		if (isModuleNotFoundError(error)) {
			// eslint-disable-next-line no-console
			console.warn(`Parser package "${pkg}" is not installed. Skipping ${framework} files.`);
			return null;
		}
		throw error;
	}
}

export async function parseComponent(filePath: string): Promise<MLASTDocument | null> {
	const framework = getFrameworkType(filePath);
	if (!framework) {
		return null;
	}

	const parser = await getParser(framework);
	if (!parser) {
		return null;
	}

	try {
		const sourceCode = fs.readFileSync(filePath, 'utf8');
		return parser.parse(sourceCode);
	} catch (error: unknown) {
		// eslint-disable-next-line no-console
		console.warn(`Failed to parse component: ${filePath}`, error instanceof Error ? error.message : error);
		return null;
	}
}
