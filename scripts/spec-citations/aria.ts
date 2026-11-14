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

const escapeRegExp = (text: string) => text.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);

/**
 * 1-based line of the entry called `name` in the list `key` of the version `version` of `def['#aria']`, found
 * through the indentation of the generated file: an entry's own `name` is the one that sits two levels in from
 * the list, so a role that names the property in its `ownedProperties` is not taken for the property.
 * Falls back to line 1 when the file has no `#aria` object, version or list laid out as the generator writes them,
 * and to the line that opens the list when the entry is not in it, which is still in the right place of the file.
 */
function lineOf(lines: readonly string[], version: string, key: string, name: string): number {
	const opening = (word: string, bracket: string) => new RegExp(`^\\t*"${escapeRegExp(word)}": \\${bracket}$`);
	const aria = lines.findIndex(l => opening('#aria', '{').test(l));
	const versionAt = lines.findIndex((l, i) => i > aria && opening(version, '{').test(l));
	const listAt = lines.findIndex((l, i) => i > versionAt && opening(key, '[').test(l));
	if (aria === -1 || versionAt === -1 || listAt === -1) {
		return 1;
	}
	const indent = /^\t*/.exec(lines[listAt] ?? '')?.[0] ?? '';
	const entry = new RegExp(`^${indent}\\t\\t"name": ${escapeRegExp(JSON.stringify(name))},?$`);
	for (let i = listAt + 1; i < lines.length; i++) {
		if (lines[i] === `${indent}]` || lines[i] === `${indent}],`) {
			break;
		}
		if (entry.test(lines[i] ?? '')) {
			return i + 1;
		}
	}
	return listAt + 1;
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
	const lines = indexJson.split(/\r?\n/);
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
					line: lineOf(lines, version, key, name),
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
