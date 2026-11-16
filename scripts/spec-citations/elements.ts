import type { Citation } from './types.ts';

import { parseSpecUrl } from './collect.ts';

/**
 * 1-based line of the `cite` of the element called `name` in the `specs` of the generated data, found through the
 * indentation of the file: the key of an element sits three levels in. Falls back to line 1 for a layout other than
 * the generator's, which is still a line of the file.
 */
function lineOf(lines: readonly string[], name: string): number {
	const entry = `\t\t\t"name": ${JSON.stringify(name)},`;
	const at = lines.indexOf(entry);
	if (at === -1) {
		return 1;
	}
	for (let i = at + 1; i < lines.length && !(lines[i] ?? '').startsWith('\t\t}'); i++) {
		if ((lines[i] ?? '').startsWith('\t\t\t"cite": ')) {
			return i + 1;
		}
	}
	return 1;
}

/**
 * The sections that elements whose source file the monitor cannot read are defined by, as citations of the generated
 * data: the `cite` of each such element, when it is a page that the monitor reads. Every element of
 * `@markuplint/html-spec` has a source file, so these are the elements whose file is not tracked yet (a new one that
 * is not added): the data cites each at the section of its source file's first line, and reading it from the data
 * keeps the element watched until the file is added.
 *
 * An element whose source file the monitor reads is left out: it cites its definition there, on the first line. A
 * section that several elements cite is cited once.
 */
export function collectElementCitations(
	indexJson: string,
	file: string,
	hasSource: (name: string) => boolean,
): Citation[] {
	const data = JSON.parse(indexJson) as { readonly specs?: readonly { name: string; cite?: string }[] };
	const lines = indexJson.split(/\r?\n/);
	const seen = new Set<string>();
	const citations: Citation[] = [];
	for (const { name, cite } of data.specs ?? []) {
		if (cite === undefined || hasSource(name)) {
			continue;
		}
		const parsed = parseSpecUrl(cite);
		if (parsed === null || seen.has(parsed.url)) {
			continue;
		}
		seen.add(parsed.url);
		citations.push({
			file,
			line: lineOf(lines, name),
			url: parsed.url,
			page: parsed.page,
			fragment: parsed.fragment,
			textDirective: parsed.textDirective,
			secno: null,
			quotes: [],
		});
	}
	return citations;
}
