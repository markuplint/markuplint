import type { ARIAVersion } from '@markuplint/ml-spec';

import type { Citation } from './types.ts';

import { ariaSpecURLByVersion, DPUB_ARIA_URL } from '../../packages/@markuplint/html-spec/generator/aria-documents.mts';

const ARIA_DOCUMENTS: ReadonlySet<string> = new Set([
	...(['1.3', '1.2', '1.1'] as const).flatMap(version => [
		ariaSpecURLByVersion(version),
		ariaSpecURLByVersion(version, true),
	]),
	DPUB_ARIA_URL,
]);

/** Whether a citation is one that this module derives: a section of a document that the generator reads for ARIA. */
export function isAriaCitation(citation: Citation): boolean {
	return ARIA_DOCUMENTS.has(citation.page);
}

/** The data file whose roles and properties are cited here. */
export const GENERATED_DATA = 'packages/@markuplint/html-spec/index.json';

/**
 * The lists of `def['#aria']` of one version and the document that each is read from: the roles and the
 * properties from WAI-ARIA, the graphics roles from Graphics ARIA, the DPub roles from DPub ARIA.
 */
const LISTS = [
	{ key: 'roles', document: (version: ARIAVersion) => ariaSpecURLByVersion(version) },
	{ key: 'props', document: (version: ARIAVersion) => ariaSpecURLByVersion(version) },
	{ key: 'graphicsRoles', document: (version: ARIAVersion) => ariaSpecURLByVersion(version, true) },
	{ key: 'dpubRoles', document: () => DPUB_ARIA_URL },
] as const;

type AriaData = {
	readonly def?: {
		readonly '#aria'?: Readonly<Record<string, Readonly<Record<string, readonly { name: string }[]>>>>;
	};
};

/** Where the entries of `def['#aria']` are in the generated file: the line that opens each list, and each entry's own. */
type LineIndex = {
	readonly lists: ReadonlyMap<string, number>;
	readonly entries: ReadonlyMap<string, number>;
};

const keyOf = (version: string, key: string, name?: string) => `${version}\0${key}\0${name ?? ''}`;

const tabsOf = (line: string) => line.length - line.trimStart().length;

/**
 * One pass over the generated file, found through its indentation: a version sits one level in from `"#aria"`, a
 * list two, and an entry's own `name` four (a role that names a property in its `ownedProperties` sits deeper, so it
 * is not taken for the property). `null` when the file has no `#aria` object laid out as the generator writes it.
 * It is one pass, not a search for each of the several hundred entries: the file is some 65,000 lines long.
 */
function indexLines(lines: readonly string[]): LineIndex | null {
	const start = lines.findIndex(l => l.trimStart() === '"#aria": {');
	if (start === -1) {
		return null;
	}
	const base = tabsOf(lines[start] ?? '');
	const lists = new Map<string, number>();
	const entries = new Map<string, number>();
	let version: string | null = null;
	let key: string | null = null;
	for (let i = start + 1; i < lines.length; i++) {
		const line = lines[i] ?? '';
		const depth = tabsOf(line);
		if (depth <= base) {
			break;
		}
		const text = line.trimStart();
		const opened = /^"([^"]+)": ([[{])$/.exec(text);
		if (depth === base + 1 && opened?.[2] === '{') {
			version = opened[1] ?? null;
			key = null;
		} else if (depth === base + 2 && opened?.[2] === '[' && version !== null) {
			key = opened[1] ?? null;
			lists.set(keyOf(version, key ?? ''), i + 1);
		} else if (depth === base + 2 && text.startsWith(']')) {
			key = null;
		} else if (depth === base + 4 && version !== null && key !== null) {
			const named = /^"name": ("(?:[^"\\]|\\.)*"),?$/.exec(text);
			if (named?.[1] !== undefined) {
				const entry = keyOf(version, key, JSON.parse(named[1]) as string);
				if (!entries.has(entry)) {
					entries.set(entry, i + 1);
				}
			}
		}
	}
	return { lists, entries };
}

/**
 * 1-based line of the entry called `name` in the list `key` of the version `version` of `def['#aria']`. Falls back
 * to line 1 when the file has no `#aria` object, version or list laid out as the generator writes them, and to the
 * line that opens the list when the entry is not in it, which is still in the right place of the file.
 */
function lineOf(index: LineIndex | null, version: string, key: string, name: string): number {
	return index?.entries.get(keyOf(version, key, name)) ?? index?.lists.get(keyOf(version, key)) ?? 1;
}

/**
 * The section of ARIA that defines each role and property of the generated data, as citations of
 * `packages/@markuplint/html-spec/index.json`.
 *
 * The weekly monitor, which reads the section itself, is what notices that the specification reworded what a
 * role or a property defines. The
 * section of a role or a property has the name as its id in WAI-ARIA, Graphics ARIA and DPub ARIA, so the list
 * of what to watch is the data itself and a role that the generator picks up is watched without anyone adding it.
 * The documents are the ones that the generator reads (`ariaSpecURLByVersion`), each version at its own: the
 * data of 1.1 and 1.2 is frozen, and the dated editions are cited on purpose, which the edition-less convention
 * of the READMEs is not meant to cover.
 *
 * A section that several versions define at one document (the DPub roles, the Graphics ARIA of 1.3 and 1.2) is
 * cited once, at the first version that lists it.
 */
export function collectAriaCitations(indexJson: string, file: string): Citation[] {
	const data = JSON.parse(indexJson) as AriaData;
	const aria = data.def?.['#aria'] ?? {};
	const index = indexLines(indexJson.split(/\r?\n/));
	const seen = new Set<string>();
	const citations: Citation[] = [];
	for (const [version, lists] of Object.entries(aria)) {
		for (const { key, document } of LISTS) {
			for (const { name } of lists[key] ?? []) {
				const page = document(version as ARIAVersion);
				if (page === undefined) {
					// `ariaSpecURLByVersion` has no case for it: cited as "undefined#<name>", the whole version would go unwatched.
					throw new Error(`${file} has the ARIA version ${version}, which aria-documents.mts does not name`);
				}
				const url = `${page}#${name}`;
				if (seen.has(url)) {
					continue;
				}
				seen.add(url);
				citations.push({
					file,
					line: lineOf(index, version, key, name),
					url,
					page,
					fragment: name,
					textDirective: null,
					secno: null,
					quotes: [],
				});
			}
		}
	}
	return citations;
}
