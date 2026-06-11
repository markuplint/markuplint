import type { ComponentScanner } from './component-scanner.js';

const SCANNER_PACKAGES: Record<string, string> = {
	'.vue': '@markuplint/vue-parser/component-scanner',
	'.svelte': '@markuplint/svelte-parser/component-scanner',
	'.astro': '@markuplint/astro-parser/component-scanner',
};

const scannerCache = new Map<string, ComponentScanner | null>();

function isModuleNotFoundError(error: unknown): boolean {
	return (
		error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND'
	);
}

export async function getScanner(ext: string): Promise<ComponentScanner | null> {
	const cached = scannerCache.get(ext);
	if (cached !== undefined) {
		return cached;
	}

	const pkg = SCANNER_PACKAGES[ext];
	if (!pkg) {
		scannerCache.set(ext, null);
		return null;
	}

	try {
		const mod: { componentScanner: ComponentScanner } = await import(pkg);
		scannerCache.set(ext, mod.componentScanner);
		return mod.componentScanner;
	} catch (error: unknown) {
		if (isModuleNotFoundError(error)) {
			const parserPkg = pkg.replace('/component-scanner', '');
			// eslint-disable-next-line no-console
			console.warn(`Parser package "${parserPkg}" is not installed. Skipping ${ext} files.`);
		} else {
			// eslint-disable-next-line no-console
			console.warn(
				`Failed to load component scanner for ${ext}:`,
				error instanceof Error ? error.message : error,
			);
		}
		scannerCache.set(ext, null);
		return null;
	}
}
