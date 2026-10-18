import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import type { Citation } from './types.ts';

import { collectFiles, listCitingFiles } from './discover.ts';

/**
 * These tests hold the conventions the monitor relies on, on the real files and without the network. The monitor
 * itself runs monthly; a README that breaks a convention should fail in the pull request that breaks it.
 */
const root = fileURLToPath(new URL('../../', import.meta.url));
const files = listCitingFiles(root);
const { citations, orphanQuotes, inlineQuotes } = collectFiles(root, files);

const WHATWG = 'https://html.spec.whatwg.org/multipage/';
const MOMDO = 'https://momdo.github.io/html/';

/**
 * A Japanese document that has to cite the original rather than the translation, with the reason.
 * Empty until momdo.github.io lacks a page or an anchor that a rule needs; add the file here then.
 */
const ORIGINAL_IN_JAPANESE: readonly { readonly file: string; readonly reason: string }[] = [];

const isJapanese = (file: string) => file.endsWith('README.ja.md') || file.startsWith('website/i18n/ja/');

describe('how a spec is quoted', () => {
	test('[citations-policy-001] a blockquote in a rule README always has the specification link that names its source', () => {
		expect(orphanQuotes.map(q => `${q.file}:${q.line}`)).toStrictEqual([]);
	});

	test('[citations-policy-002] a rule quotes a spec sentence in "> " lines, not inline in double quotes, so that it can be checked', () => {
		expect(inlineQuotes.map(q => `${q.file}:${q.line}`)).toStrictEqual([]);
	});

	test('[citations-policy-003] a citation that quotes or numbers a section says which section by its fragment', () => {
		const loose = citations.filter(c => c.fragment === null && (c.quotes.length > 0 || c.secno !== null));
		expect(loose.map(c => `${c.file}:${c.line}`)).toStrictEqual([]);
	});
});

describe('which edition of a spec is cited', () => {
	test('[citations-policy-004] Japanese documents cite the HTML Living Standard through its translation', () => {
		const allowed = new Set(ORIGINAL_IN_JAPANESE.map(a => a.file));
		const original = citations.filter(c => isJapanese(c.file) && c.url.startsWith(WHATWG) && !allowed.has(c.file));
		expect(original.map(c => `${c.file}:${c.line} ${c.url}`)).toStrictEqual([]);
	});

	test('[citations-policy-005] a rule README cites the same section of the HTML Living Standard in both languages', () => {
		const canonical = (c: Citation) => `${c.page.replace(MOMDO, WHATWG)}#${c.fragment}`;
		const byRule = new Map<string, { en: Set<string>; ja: Set<string> }>();
		for (const c of citations) {
			const match = /^packages\/@markuplint\/rules\/src\/([^/]+)\/README(\.ja)?\.md$/.exec(c.file);
			if (match === null || c.fragment === null || !(c.page.startsWith(WHATWG) || c.page.startsWith(MOMDO))) {
				continue;
			}
			const entry = byRule.get(match[1] ?? '') ?? { en: new Set<string>(), ja: new Set<string>() };
			entry[match[2] === undefined ? 'en' : 'ja'].add(canonical(c));
			byRule.set(match[1] ?? '', entry);
		}
		const differing = [...byRule].flatMap(([rule, { en, ja }]) => {
			const onlyEn = [...en].filter(x => !ja.has(x));
			const onlyJa = [...ja].filter(x => !en.has(x));
			return onlyEn.length + onlyJa.length === 0 ? [] : [{ rule, onlyEn, onlyJa }];
		});
		expect(differing).toStrictEqual([]);
	});

	test('[citations-policy-006] W3C specs are cited at their edition-less URL, so a citation does not freeze on a superseded edition', () => {
		const dated = /^https:\/\/www\.w3\.org\/TR\/(?:wai-aria-1\.\d|accname-1\.\d|WCAG2\d)\//;
		const unrendered = /^https:\/\/w3c\.github\.io\/html-aria\//;
		const offending = citations.filter(c => dated.test(c.url) || unrendered.test(c.url));
		expect(offending.map(c => `${c.file}:${c.line} ${c.url}`)).toStrictEqual([]);
	});
});
