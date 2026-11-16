import type { Page } from './extract.ts';
import type { Citation, Lock, LockEntry, PageResult, Problem, ProblemKind, Quote } from './types.ts';

import { definitionOf } from './definition.ts';
import { splitSentences, unifiedDiff } from './diff.ts';
import { extractDeclaration, isSourcePage } from './extract-source.ts';
import { extractSection, pageText, parsePage } from './extract.ts';
import { containsQuote, hashText, matchesDirective } from './normalize.ts';

export type CheckInput = {
	readonly citations: readonly Citation[];
	readonly orphanQuotes: readonly Quote[];
	readonly inlineQuotes: readonly Quote[];
	/** Fetched pages, keyed by the URL without a fragment. */
	readonly pages: ReadonlyMap<string, PageResult>;
	readonly lock: Lock;
	/** Stamped on every lock entry that is added or refreshed. */
	readonly now: string;
};

export type CheckResult = {
	readonly problems: readonly Problem[];
	/** The lock as it should be written by `--update`. */
	readonly lock: Lock;
};

/**
 * Problems are listed from the one that says most directly that a citation is
 * wrong to the one that only says the cited text moved.
 */
const PRIORITY: readonly ProblemKind[] = [
	'unprocessed-source',
	'page-missing',
	'anchor-missing',
	'anchor-empty',
	'anchor-thin',
	'quote-mismatch',
	'orphan-quote',
	'inline-quote',
	'no-fragment',
	'directive-missing',
	'secno-stale',
	'section-changed',
	'fetch-failed',
];

/** What a fetched page is read as: the HTML of a specification or of documentation, or the text of a source file. */
type Loaded = { readonly kind: 'page'; readonly page: Page } | { readonly kind: 'source'; readonly text: string };

/** The problem of a text fragment (`:~:text=`) that the page no longer has, or `null` when it has it or there is none. */
function missingDirective(citation: Citation, page: Page): Problem | null {
	const directive = citation.textDirective;
	if (directive === null || matchesDirective(pageText(page), directive)) {
		return null;
	}
	return {
		kind: 'directive-missing',
		citation,
		message: `The text fragment \`${directive.start}${directive.end === undefined ? '' : `…${directive.end}`}\` is no longer on the page`,
	};
}

/** A cited number is right when it is the section's own number or one of its ancestors'. */
function secnoMatches(cited: string, actual: string): boolean {
	return actual === cited || actual.startsWith(`${cited}.`);
}

/**
 * Compares every citation with what it cites now: the specification, the documentation of a framework, or the
 * declaration of a source file (`extract-source.ts`).
 *
 * Everything but `section-changed` is decided from the page alone, which is
 * why those checks come first and are reported first: they hold on a fresh
 * clone with no lock. The lock only answers "did this passage change since the
 * last time a maintainer looked", and says nothing about whether the
 * citation was ever right.
 */
export function check(input: CheckInput): CheckResult {
	const { citations, pages, lock, now } = input;
	const problems: Problem[] = [];
	const loaded = new Map<string, Loaded | null>();
	for (const [url, result] of pages) {
		if (result.status === 'failed') {
			problems.push(
				result.permanent === true
					? {
							kind: 'page-missing',
							citation: citations.find(c => c.page === url) ?? null,
							message: `${url} no longer exists (${result.message})`,
						}
					: { kind: 'fetch-failed', citation: null, message: `${url}: ${result.message}` },
			);
			loaded.set(url, null);
		} else {
			loaded.set(
				url,
				isSourcePage(url)
					? { kind: 'source', text: result.html }
					: { kind: 'page', page: parsePage(result.html) },
			);
		}
	}

	const reportedUnprocessed = new Set<string>();
	const cited = new Set<string>();
	const units = new Map<string, string>();
	const firstCitation = new Map<string, Citation>();
	const quoteGroups = new Map<string, { quote: Quote; citation: Citation; scopes: string[] }>();

	for (const citation of citations) {
		const key = citation.fragment === null ? null : `${citation.page}#${citation.fragment}`;
		if (key !== null) {
			cited.add(key);
		}
		const target = loaded.get(citation.page);
		if (target === undefined || target === null) {
			continue;
		}
		const page = target.kind === 'page' ? target.page : null;
		if (page?.unprocessed === true) {
			if (!reportedUnprocessed.has(citation.page)) {
				reportedUnprocessed.add(citation.page);
				problems.push({
					kind: 'unprocessed-source',
					citation,
					message: `${citation.page} is a ReSpec source that has not been rendered, so its anchors cannot be checked; cite the processed edition (https://www.w3.org/TR/…) instead`,
				});
			}
			continue;
		}
		if (key === null || citation.fragment === null) {
			if (citation.quotes.length > 0 || citation.secno !== null) {
				problems.push({
					kind: 'no-fragment',
					citation,
					message: `${citation.url} has no fragment, so the section it quotes or numbers cannot be located`,
				});
			}
			// A text fragment alone is the only way to point at a passage that no heading anchors (the introduction
			// of a page), and it is searched in the whole page, which needs no section.
			const missing = page === null ? null : missingDirective(citation, page);
			if (missing !== null) {
				problems.push(missing);
			}
			continue;
		}

		const section =
			target.kind === 'page'
				? extractSection(target.page, citation.fragment)
				: extractDeclaration(target.text, citation.fragment);
		if (section.status === 'missing') {
			problems.push({
				kind: 'anchor-missing',
				citation,
				message:
					target.kind === 'page'
						? `\`#${citation.fragment}\` is not on ${citation.page}`
						: `\`${citation.fragment}\` is not declared at the top level of ${citation.url.split('#')[0]}`,
			});
			continue;
		}
		if (section.unit === '') {
			// Nothing to hash: the hash of no text never changes, so a stale alias would stay silent for good.
			problems.push({
				kind: 'anchor-empty',
				citation,
				message: `\`#${citation.fragment}\` has no text on ${citation.page}, so nothing cited there can be checked; it is probably an alias for another anchor`,
			});
			continue;
		}
		// The few words of a term would never show a change of the definition, so this citation does not put its
		// section into the lock, which would say it is watched. What else the citation says (a quote, a text
		// fragment, a section number) is still checked.
		const definition = definitionOf(citation);
		if (definition !== null && section.unit.length < definition.minimum) {
			problems.push({
				kind: 'anchor-thin',
				citation,
				message: `\`#${citation.fragment}\` holds ${section.unit.length} characters on ${citation.page}, too little to be the section that defines the ${definition.what}; it is probably the anchor of a term; ${definition.advice}`,
			});
		} else {
			units.set(key, section.unit);
			if (!firstCitation.has(key)) {
				firstCitation.set(key, citation);
			}
		}

		for (const quote of citation.quotes) {
			const group = quoteGroups.get(quote.group) ?? { quote, citation, scopes: [] };
			group.scopes.push(section.scope);
			quoteGroups.set(quote.group, group);
		}

		const missing = page === null ? null : missingDirective(citation, page);
		if (missing !== null) {
			problems.push(missing);
		}

		if (citation.secno !== null && section.secno !== null && !secnoMatches(citation.secno, section.secno)) {
			problems.push({
				kind: 'secno-stale',
				citation,
				message: `Cites §${citation.secno}, but \`#${citation.fragment}\` is now in §${section.secno}`,
			});
		}
	}

	for (const { quote, citation, scopes } of quoteGroups.values()) {
		if (!scopes.some(scope => containsQuote(scope, quote.text))) {
			problems.push({
				kind: 'quote-mismatch',
				citation,
				quote,
				message: 'The quoted text is not in the cited section',
			});
		}
	}

	for (const quote of input.orphanQuotes) {
		problems.push({
			kind: 'orphan-quote',
			citation: null,
			quote,
			message: 'A blockquote with no specification link beside it',
		});
	}
	for (const quote of input.inlineQuotes) {
		problems.push({
			kind: 'inline-quote',
			citation: null,
			quote,
			message: 'A specification sentence is quoted inline; write it as "> " lines so it can be checked',
		});
	}

	const sections: Record<string, LockEntry> = {};
	for (const key of [...cited].toSorted()) {
		const stored = lock.sections[key];
		const unit = units.get(key);
		if (unit === undefined) {
			if (stored !== undefined) {
				sections[key] = stored;
			}
			continue;
		}
		const hash = hashText(unit);
		if (stored?.hash === hash) {
			sections[key] = stored;
			continue;
		}
		// Spec prose is stored one sentence to a line so that the diff points at the changed sentence; the lines
		// of a declaration are already the unit of its diff.
		const text = isSourcePage(key) ? unit : splitSentences(unit);
		if (stored !== undefined) {
			problems.push({
				kind: 'section-changed',
				citation: firstCitation.get(key) ?? null,
				message: `The cited ${isSourcePage(key) ? 'declaration' : 'section'} changed since ${stored.updatedAt.slice(0, 10)}`,
				diff: unifiedDiff(stored.text, text),
			});
		}
		sections[key] = { hash, text, updatedAt: now };
	}

	const rank = (problem: Problem) => PRIORITY.indexOf(problem.kind);
	const where = (problem: Problem) =>
		`${problem.citation?.file ?? problem.quote?.file ?? ''}:${String(problem.citation?.line ?? problem.quote?.line ?? 0).padStart(6, '0')}`;
	return {
		problems: problems.toSorted((a, b) => rank(a) - rank(b) || where(a).localeCompare(where(b))),
		lock: { sections },
	};
}
