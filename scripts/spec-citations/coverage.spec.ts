import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { parseSpecUrl } from './collect.ts';
import { definitionCitations, elementSourcePath } from './definition.ts';
import { collectAll, collectFiles, listCitingFiles } from './discover.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = listCitingFiles(root);
const { citations } = collectFiles(root, files);
const definitions = definitionCitations(citations);
const cited = new Set(collectAll(root).citations.map(c => `${c.page}#${c.fragment}`));

type Element = { readonly name: string; readonly cite?: string };
const { specs } = JSON.parse(readFileSync(join(root, 'packages/@markuplint/html-spec/index.json'), 'utf8')) as {
	readonly specs: readonly Element[];
};

/** An element with a source file cites its definition there; one without (the obsolete elements) has only its `cite`. */
const withSource = specs.filter(s => files.some(f => f.path === elementSourcePath(s.name)));
const withoutSource = specs.filter(s => !withSource.includes(s));

/**
 * The elements whose definition is a section that is named after another: the specification defines them together
 * (`text` and `tspan` in SVG 2, `semantics` and its two annotations in MathML Core, `mmultiscripts` and its
 * `mprescripts`). The section is pinned, so that moving the citation away from it fails as any other mismatch does.
 */
const SHARED_SECTIONS: Readonly<Record<string, string>> = {
	'mml:annotation': 'semantics-and-presentation',
	'mml:annotation-xml': 'semantics-and-presentation',
	'mml:mprescripts': 'prescripts-and-tensor-indices-mmultiscripts',
	'svg:tspan': 'TextElement',
};

/** Whether a fragment names the element: one of its words is the name, or the name followed by `Element` (SVG 2). */
const namesElement = (fragment: string, local: string) =>
	fragment
		.toLowerCase()
		.split(/[^\da-z]+/)
		.some(word => word === local || word === `${local}element`);

const firstLine = (path: string) => readFileSync(join(root, path), 'utf8').split('\n', 1)[0] ?? '';

/**
 * The weekly monitor, which reads the section itself, is what notices that the specification reworded the definition
 * of an element. These tests hold, offline, the part of that promise that does not need the network: every element
 * of the generated data cites the section that defines it, on the first line of its source file, at a URL that the
 * monitor reads; an element with no source file has a `cite` that a tracked file cites. Whether the section holds
 * enough text to be one is the monitor's own check (`anchor-thin`), which needs the page.
 */
describe('every element cites the section that defines it', () => {
	test('[coverage-001] the source file of an element opens with a comment that cites a URL', () => {
		const missing = withSource
			.map(s => elementSourcePath(s.name))
			.filter(path => !/^\/\/ https?:\/\/\S+$/.test(firstLine(path)))
			.map(path => `${path}: the first line is \`${firstLine(path)}\``);
		expect(missing).toStrictEqual([]);
	});

	test('[coverage-002] that URL is one that the monitor reads', () => {
		const unread = withSource
			.map(s => elementSourcePath(s.name))
			.filter(path => /^\/\/ https?:\/\/\S+$/.test(firstLine(path)) && !definitions.has(path))
			.map(path => `${path}: ${firstLine(path)}`);
		expect(unread).toStrictEqual([]);
	});

	test('[coverage-003] it names a section by its fragment, not the whole page', () => {
		const loose = [...definitions.values()]
			.filter(c => c.fragment === null)
			.map(c => `${c.file}:${c.line} ${c.url}`);
		expect(loose).toStrictEqual([]);
	});

	test("[coverage-004] the `cite` of an element without a source file is a section that the monitor reads, at the element's own term where the specification has one", () => {
		const unread = withoutSource
			.filter(s => {
				const parsed = s.cite === undefined ? null : parseSpecUrl(s.cite);
				if (parsed === null || parsed.fragment === null || !cited.has(`${parsed.page}#${parsed.fragment}`)) {
					return true;
				}
				return parsed.fragment !== s.name && parsed.fragment !== 'non-conforming-features';
			})
			.map(s => `${s.name} cite=${s.cite ?? '(none)'}`);
		expect(unread).toStrictEqual([]);
	});

	test('[coverage-005] the section that an element cites is named after it, unless the specification defines it together with another', () => {
		const mismatched = withSource.flatMap(s => {
			const citation = definitions.get(elementSourcePath(s.name));
			if (citation === undefined || citation.fragment === null) {
				return [];
			}
			const shared = SHARED_SECTIONS[s.name];
			const local = s.name.slice(s.name.indexOf(':') + 1).toLowerCase();
			const fits = shared === undefined ? namesElement(citation.fragment, local) : citation.fragment === shared;
			return fits ? [] : [`${s.name}: ${citation.url}`];
		});
		expect(mismatched).toStrictEqual([]);
	});
});
