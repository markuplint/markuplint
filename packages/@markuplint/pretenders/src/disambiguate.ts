/**
 * @module disambiguate
 *
 * Resolves selector collisions in a flat `Pretender[]` list — the same thing
 * {@link ./dependency-mapper.js} does while a scanner builds its output, but
 * applied here at lint time to the file actually being linted. This is what
 * closes the other half of issue #3951: even once the generated pretenders
 * JSON carries independent entries for two same-named components declared in
 * different files, `MLElement.pretending()` still matches by CSS selector
 * alone — it has no file context, so it can't tell them apart on its own.
 *
 * This module inspects the lint target's own declarations and imports to
 * pick, among several same-named candidates, the one the file actually
 * refers to — falling back to leaving the list untouched whenever that can't
 * be confirmed, so lint output never gets worse than the pre-existing
 * first-match behavior.
 */

import type { ImportBinding } from './import-resolver/types.js';
import type { Pretender } from '@markuplint/ml-config';

import { parsePretenderFilePath } from '@markuplint/ml-config';

import { analyzeImports, resolveComponentImport } from './import-resolver/index.js';
import { normalizePath, resolveModuleFile } from './import-resolver/resolve-module-file.js';

const RE_SIMPLE_COMPONENT_NAME = /^[A-Z][\w$-]*$/i;

/**
 * Identifies the file to disambiguate pretenders against.
 */
export interface DisambiguateOptions {
	/** Absolute path of the file being linted. */
	readonly filePath: string;
	/** Full source text of the file being linted. */
	readonly sourceCode: string;
}

/**
 * @param pretenders - The resolved pretender list a lint run would otherwise
 *   use as-is. Entries without a `filePath`, or whose `selector` isn't a
 *   plain identifier, are never touched.
 * @param options - The file being linted, used to resolve which same-selector
 *   candidate it actually refers to.
 * @returns The disambiguated pretender list, or `pretenders` itself (same
 *   reference) when there was nothing to resolve or nothing could be confirmed.
 */
export async function disambiguatePretenders(
	pretenders: readonly Pretender[],
	options: DisambiguateOptions,
): Promise<readonly Pretender[]> {
	const groups = groupAmbiguousCandidates(pretenders);
	if (groups.size === 0) {
		// Fast path: no colliding selector has more than one file-backed candidate,
		// so there's nothing to resolve — skip import analysis entirely.
		return pretenders;
	}

	const importResult = await analyzeImports(options.filePath, options.sourceCode);
	const bindings = importResult?.bindings ?? [];

	const losers = new Set<Pretender>();

	for (const candidates of groups.values()) {
		const winner = resolveWinner(candidates, options.filePath, bindings);
		if (!winner) {
			continue;
		}
		for (const candidate of candidates) {
			if (candidate !== winner) {
				losers.add(candidate);
			}
		}
	}

	if (losers.size === 0) {
		return pretenders;
	}

	return pretenders.filter(p => !losers.has(p));
}

function groupAmbiguousCandidates(pretenders: readonly Pretender[]): Map<string, Pretender[]> {
	const bySelector = new Map<string, Pretender[]>();

	for (const pretender of pretenders) {
		if (!pretender.filePath || !RE_SIMPLE_COMPONENT_NAME.test(pretender.selector)) {
			continue;
		}
		const list = bySelector.get(pretender.selector);
		if (list) {
			list.push(pretender);
		} else {
			bySelector.set(pretender.selector, [pretender]);
		}
	}

	for (const [selector, list] of bySelector) {
		if (list.length < 2) {
			bySelector.delete(selector);
		}
	}

	return bySelector;
}

/**
 * Picks the one candidate `filePath` actually refers to: first a same-file
 * local declaration, then an import binding resolved via TypeScript module
 * resolution. Returns `null` when neither confirms a candidate, so the
 * caller leaves the whole group untouched.
 */
function resolveWinner(
	candidates: readonly Pretender[],
	filePath: string,
	bindings: readonly ImportBinding[],
): Pretender | null {
	const local = candidates.find(c => matchesFile(c.filePath!, filePath));
	if (local) {
		return local;
	}

	const binding = resolveComponentImport(candidates[0]!.selector, bindings);
	if (!binding || binding.type === 'namespace' || binding.type === 'dynamic') {
		return null;
	}

	const resolvedAbs = resolveModuleFile(filePath, binding.source);
	if (!resolvedAbs) {
		return null;
	}

	return candidates.find(c => matchesFile(c.filePath!, resolvedAbs)) ?? null;
}

function matchesFile(pretenderFilePath: string, targetAbsPath: string): boolean {
	const pathPart = parsePretenderFilePath(pretenderFilePath)?.path ?? pretenderFilePath;
	return normalizePath(pathPart) === normalizePath(targetAbsPath);
}
