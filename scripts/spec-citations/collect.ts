import type { Citation, CollectResult, Quote, TextDirective } from './types.ts';

import ts from 'typescript';

import { normalizeSpecText } from './normalize.ts';

type ParsedUrl = Pick<Citation, 'fragment' | 'page' | 'textDirective' | 'url'>;

export type MarkdownOptions = {
	/** Report blockquotes with no spec link beside them. Off for prose that is not a rule README. */
	readonly orphanQuotes?: boolean;
};

const BARE_URL = /https?:\/\/[^\s<>"'`{}]+/g;
const SECTION_SIGN = /§\s*(\d+(?:\.\d+)*)/;
/** A bare section number in the text of a link to the HTML Living Standard, e.g. `HTML Living Standard 13.1.2.3 Attributes`. */
const BARE_SECNO = /(?:^|\s)(\d+(?:\.\d+)+)(?=\s|$)/;
const INLINE_QUOTE_MIN_WORDS = 6;

function isWatched(url: URL): boolean {
	switch (url.hostname) {
		case 'html.spec.whatwg.org':
		case 'w3c.github.io': {
			return true;
		}
		case 'momdo.github.io': {
			return url.pathname === '/html' || url.pathname.startsWith('/html/');
		}
		case 'www.w3.org': {
			return url.pathname.startsWith('/TR/');
		}
		default: {
			return false;
		}
	}
}

/**
 * A malformed percent-escape (`URIError`) is kept as written. The `catch` has no `isFatalError()` guard on purpose:
 * the only thing in the `try` is the runtime's decoder, so nothing of ours can be mistaken for the failure.
 */
function safeDecode(text: string): string {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
}

function parseDirective(raw: string): TextDirective | null {
	const part = raw.split('&').find(p => p.startsWith('text='));
	if (part === undefined) {
		return null;
	}
	const segments = part.slice('text='.length).split(',');
	let prefix: string | undefined;
	let suffix: string | undefined;
	if (segments.length > 1 && segments[0]?.endsWith('-')) {
		prefix = safeDecode((segments.shift() ?? '').slice(0, -1));
	}
	if (segments.length > 1 && segments.at(-1)?.startsWith('-')) {
		suffix = safeDecode((segments.pop() ?? '').slice(1));
	}
	const start = safeDecode(segments[0] ?? '');
	if (start === '') {
		return null;
	}
	const end = segments[1] === undefined ? undefined : safeDecode(segments[1]);
	return {
		...(prefix === undefined ? {} : { prefix }),
		start,
		...(end === undefined ? {} : { end }),
		...(suffix === undefined ? {} : { suffix }),
	};
}

/**
 * Parses a URL written in a document. Returns `null` for a host the monitor
 * does not watch (MDN, open-ui, translations on waic.jp, `www.w3.org/WAI`…),
 * which are informative and are not worth a report when they change.
 */
export function parseSpecUrl(raw: string): ParsedUrl | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		// The runtime reports an unparsable URL as a `TypeError`, which `isFatalError()` would treat as our own bug;
		// the `try` holds only that constructor call, so the guard is left out.
		return null;
	}
	if (!isWatched(url)) {
		return null;
	}
	const hash = raw.indexOf('#');
	const page = hash === -1 ? raw : raw.slice(0, hash);
	const rest = hash === -1 ? '' : raw.slice(hash + 1);
	const directiveAt = rest.indexOf(':~:');
	const fragmentRaw = directiveAt === -1 ? rest : rest.slice(0, directiveAt);
	return {
		url: raw,
		page,
		fragment: fragmentRaw === '' ? null : safeDecode(fragmentRaw),
		textDirective: directiveAt === -1 ? null : parseDirective(rest.slice(directiveAt + 3)),
	};
}

/** Trims what ends a sentence, and a `)` or `}` the URL does not open, off a URL found in running text. */
function trimBareUrl(raw: string): string {
	let url = raw;
	for (;;) {
		const last = url.at(-1) ?? '';
		const unbalancedParen = last === ')' && url.split('(').length < url.split(')').length;
		if (/[.,;:!?*]/.test(last) || unbalancedParen) {
			url = url.slice(0, -1);
		} else {
			return url;
		}
	}
}

function lineStartsOf(text: string): number[] {
	const starts = [0];
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '\n') {
			starts.push(i + 1);
		}
	}
	return starts;
}

function lineOf(starts: readonly number[], offset: number): number {
	let low = 0;
	let high = starts.length - 1;
	while (low < high) {
		const mid = Math.ceil((low + high) / 2);
		if ((starts[mid] ?? 0) <= offset) {
			low = mid;
		} else {
			high = mid - 1;
		}
	}
	return low + 1;
}

function toCitation(
	parsed: ParsedUrl,
	file: string,
	line: number,
	secno: string | null,
	quotes: readonly Quote[],
): Citation {
	return { file, line, secno, quotes, ...parsed };
}

type Link = {
	readonly parsed: ParsedUrl;
	readonly line: number;
	readonly text: string;
};

type Paragraph = {
	readonly start: number;
	readonly lines: readonly string[];
	readonly links: readonly Link[];
	readonly isQuote: boolean;
};

/** Blanks fenced code and inline code with spaces so offsets and line numbers still line up. */
function maskCode(text: string): string {
	let fence: string | null = null;
	return text
		.split('\n')
		.map(line => {
			const marker = /^\s*(```|~~~)/.exec(line)?.[1];
			if (fence !== null) {
				if (marker === fence) {
					fence = null;
				}
				return ' '.repeat(line.length);
			}
			if (marker !== undefined) {
				fence = marker;
				return ' '.repeat(line.length);
			}
			return line.replaceAll(/`[^`\n]+`/g, m => ' '.repeat(m.length));
		})
		.join('\n');
}

function parseDestination(masked: string, from: number): { dest: string; end: number } | null {
	let i = from;
	while (masked[i] === ' ') {
		i++;
	}
	if (masked[i] === '<') {
		const close = masked.indexOf('>', i);
		return close === -1 ? null : { dest: masked.slice(i + 1, close), end: close + 1 };
	}
	const start = i;
	let depth = 0;
	for (; i < masked.length; i++) {
		const c = masked[i];
		if (c === '(') {
			depth++;
		} else if (c === ')') {
			if (depth === 0) {
				break;
			}
			depth--;
		} else if (c === ' ' || c === '\n') {
			break;
		}
	}
	return { dest: masked.slice(start, i), end: i };
}

function linkText(original: string, masked: string, closeBracket: number): string {
	let depth = 1;
	let i = closeBracket - 1;
	for (; i >= 0; i--) {
		if (masked[i] === ']') {
			depth++;
		} else if (masked[i] === '[') {
			depth--;
			if (depth === 0) {
				break;
			}
		}
	}
	return i < 0 ? '' : original.slice(i + 1, closeBracket);
}

function secnoOfLinkText(text: string, parsed: ParsedUrl): string | null {
	const sign = SECTION_SIGN.exec(text)?.[1];
	if (sign !== undefined) {
		return sign;
	}
	const host = new URL(parsed.page).hostname;
	if (host === 'html.spec.whatwg.org' || host === 'momdo.github.io') {
		return BARE_SECNO.exec(text)?.[1] ?? null;
	}
	return null;
}

function linksOf(original: string, masked: string, startLine: number): Link[] {
	const links: Link[] = [];
	const taken: [number, number][] = [];
	const lineAt = (offset: number) => startLine + (masked.slice(0, offset).match(/\n/g)?.length ?? 0);

	for (const match of masked.matchAll(/\]\(/g)) {
		const parsedDest = parseDestination(masked, match.index + 2);
		if (parsedDest === null) {
			continue;
		}
		const parsed = parseSpecUrl(parsedDest.dest);
		if (parsed === null) {
			continue;
		}
		const text = linkText(original, masked, match.index);
		// The link's visible text is taken too: it may itself be the URL, which is not a second citation.
		taken.push([match.index - text.length - 1, parsedDest.end]);
		links.push({ parsed, line: lineAt(match.index + 2), text });
	}
	for (const match of masked.matchAll(BARE_URL)) {
		if (taken.some(([from, to]) => match.index >= from && match.index < to)) {
			continue;
		}
		const parsed = parseSpecUrl(trimBareUrl(match[0]));
		if (parsed !== null) {
			links.push({ parsed, line: lineAt(match.index), text: '' });
		}
	}
	return links.toSorted((a, b) => a.line - b.line);
}

function paragraphsOf(text: string): Paragraph[] {
	const masked = maskCode(text);
	const originalLines = text.split('\n');
	const maskedLines = masked.split('\n');
	const paragraphs: Paragraph[] = [];
	let from = -1;
	const flush = (to: number) => {
		if (from === -1) {
			return;
		}
		const lines = originalLines.slice(from, to);
		const maskedBlock = maskedLines.slice(from, to).join('\n');
		paragraphs.push({
			start: from + 1,
			lines,
			links: linksOf(lines.join('\n'), maskedBlock, from + 1),
			isQuote: maskedLines.slice(from, to).every(l => l.trimStart().startsWith('>')),
		});
		from = -1;
	};
	for (const [i, line] of maskedLines.entries()) {
		if (line.trim() === '') {
			flush(i);
		} else if (from === -1) {
			from = i;
		}
	}
	flush(maskedLines.length);
	return paragraphs;
}

/** A list marker is Markdown structure, not text of the spec the list item came from. */
function stripListMarker(line: string): string {
	return line.replace(/^(?:[-*]|\d+\.)\s+/, '');
}

function quoteTextOf(lines: readonly string[]): string {
	return normalizeSpecText(lines.map(l => stripListMarker(l.replace(/^\s*>\s?/, ''))).join(' '));
}

/** `> [!NOTE]`, `> **Note:**`: a callout, not a passage of a specification. */
function isCallout(lines: readonly string[]): boolean {
	const first = (lines[0] ?? '').replace(/^\s*>\s?/, '');
	return /^\[!\w+\]/.test(first) || /^\*\*[^*]+\*\*/.test(first);
}

/**
 * Collects the spec URLs of a Markdown file and the passages quoted from them.
 *
 * A rule README quotes a spec in a blockquote and names the source on a line
 * beside it: `Cite: [..](url)` / `[..](url)より引用` after the quote, or a link in
 * the paragraph before it. The line after wins because that is the convention
 * the READMEs follow; a link that merely introduces the quote is the fallback.
 */
export function collectFromMarkdown(text: string, file: string, options: MarkdownOptions = {}): CollectResult {
	const paragraphs = paragraphsOf(text);
	const quotesByLink = new Map<Link, Quote[]>();
	const orphanQuotes: Quote[] = [];

	for (const [i, paragraph] of paragraphs.entries()) {
		if (!paragraph.isQuote || isCallout(paragraph.lines)) {
			continue;
		}
		const quote: Quote = {
			text: quoteTextOf(paragraph.lines),
			file,
			line: paragraph.start,
			group: `${file}:${paragraph.start}`,
		};
		const next = paragraphs[i + 1];
		const previous = paragraphs[i - 1];
		const target =
			next !== undefined && !next.isQuote && next.links.length > 0
				? next.links[0]
				: previous !== undefined && !previous.isQuote && previous.links.length > 0
					? previous.links.at(-1)
					: undefined;
		if (target === undefined) {
			orphanQuotes.push(quote);
		} else {
			quotesByLink.set(target, [...(quotesByLink.get(target) ?? []), quote]);
		}
	}

	const citations = paragraphs.flatMap(p =>
		p.links.map(link =>
			toCitation(
				link.parsed,
				file,
				link.line,
				secnoOfLinkText(link.text, link.parsed),
				quotesByLink.get(link) ?? [],
			),
		),
	);
	return { citations, orphanQuotes: options.orphanQuotes === false ? [] : orphanQuotes, inlineQuotes: [] };
}

type CommentBlock = {
	readonly pos: number;
	readonly lines: readonly { readonly text: string; readonly offset: number }[];
};

function commentRanges(source: ts.SourceFile, text: string): ts.CommentRange[] {
	const ranges = new Map<number, ts.CommentRange>();
	const visit = (node: ts.Node) => {
		for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? []) {
			ranges.set(range.pos, range);
		}
		for (const child of node.getChildren(source)) {
			visit(child);
		}
	};
	visit(source);
	return [...ranges.values()].toSorted((a, b) => a.pos - b.pos);
}

function blocksOf(ranges: readonly ts.CommentRange[], text: string): CommentBlock[] {
	const blocks: CommentBlock[] = [];
	let run: { range: ts.CommentRange; text: string; offset: number }[] = [];
	const flushRun = () => {
		if (run.length > 0) {
			blocks.push({ pos: run[0]?.range.pos ?? 0, lines: run.map(r => ({ text: r.text, offset: r.offset })) });
			run = [];
		}
	};
	for (const range of ranges) {
		if (range.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
			const raw = text.slice(range.pos, range.end);
			const lead = /^\/\/\s?/.exec(raw)?.[0].length ?? 2;
			const previous = run.at(-1);
			if (previous !== undefined && !/\S/.test(text.slice(previous.range.end, range.pos).replaceAll('\n', ' '))) {
				run.push({ range, text: raw.slice(lead), offset: range.pos + lead });
			} else {
				flushRun();
				run.push({ range, text: raw.slice(lead), offset: range.pos + lead });
			}
			continue;
		}
		flushRun();
		const raw = text.slice(range.pos, range.end);
		const lines: { text: string; offset: number }[] = [];
		let offset = range.pos;
		for (const line of raw.split('\n')) {
			const lead = /^\s*(?:\/\*\*?|\*(?!\/))?\s?/.exec(line)?.[0].length ?? 0;
			const content = line.slice(lead).replace(/\s*\*\/\s*$/, '');
			lines.push({ text: content, offset: offset + lead });
			offset += line.length + 1;
		}
		blocks.push({ pos: range.pos, lines });
	}
	flushRun();
	return blocks;
}

/**
 * Collects spec citations from a TypeScript file.
 *
 * Comments are located through the TypeScript scanner rather than a regular
 * expression because `'https://…'` in a string literal contains `//`. Quotes
 * are read only from comments: `>` lines, in the same shape a README uses.
 * A spec sentence written inline in double quotes is reported separately, so
 * that every quote has the one shape the monitor can check.
 */
export function collectFromSource(text: string, file: string): CollectResult {
	const starts = lineStartsOf(text);
	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
	const ranges = commentRanges(source, text);
	const citations: Citation[] = [];
	const inlineQuotes: Quote[] = [];

	for (const block of blocksOf(ranges, text)) {
		const found: { parsed: ParsedUrl; offset: number }[] = [];
		const secnos: { value: string; offset: number }[] = [];
		const quoteLines: { text: string; line: number }[][] = [];
		let quoteRun: { text: string; line: number }[] = [];
		const prose: string[] = [];

		for (const line of block.lines) {
			for (const match of line.text.matchAll(BARE_URL)) {
				const parsed = parseSpecUrl(trimBareUrl(match[0]));
				if (parsed !== null) {
					found.push({ parsed, offset: line.offset + match.index });
				}
			}
			const sign = SECTION_SIGN.exec(line.text);
			if (sign?.[1] !== undefined) {
				secnos.push({ value: sign[1], offset: line.offset + sign.index });
			}
			if (line.text.startsWith('>')) {
				quoteRun.push({
					text: stripListMarker(line.text.replace(/^>\s?/, '')),
					line: lineOf(starts, line.offset),
				});
			} else {
				if (quoteRun.length > 0) {
					quoteLines.push(quoteRun);
					quoteRun = [];
				}
				prose.push(line.text);
			}
		}
		if (quoteRun.length > 0) {
			quoteLines.push(quoteRun);
		}
		if (found.length === 0) {
			continue;
		}

		const quotes = quoteLines.map((run): Quote => {
			const line = run[0]?.line ?? 1;
			return { text: normalizeSpecText(run.map(r => r.text).join(' ')), file, line, group: `${file}:${line}` };
		});
		for (const match of prose.join(' ').matchAll(/["“]([^"”]+)["”]/g)) {
			const sentence = normalizeSpecText(match[1] ?? '');
			if (sentence.split(' ').length >= INLINE_QUOTE_MIN_WORDS) {
				const line = lineOf(starts, block.pos);
				inlineQuotes.push({ text: sentence, file, line, group: `${file}:${line}` });
			}
		}

		const secnoOf = new Map<number, string>();
		for (const secno of secnos) {
			const following = found.findIndex(f => f.offset > secno.offset);
			const target = following === -1 ? found.length - 1 : following;
			if (!secnoOf.has(target)) {
				secnoOf.set(target, secno.value);
			}
		}
		for (const [i, entry] of found.entries()) {
			citations.push(
				toCitation(entry.parsed, file, lineOf(starts, entry.offset), secnoOf.get(i) ?? null, quotes),
			);
		}
	}

	const inComment = (offset: number) => ranges.some(r => offset >= r.pos && offset < r.end);
	for (const match of text.matchAll(BARE_URL)) {
		if (inComment(match.index)) {
			continue;
		}
		const parsed = parseSpecUrl(trimBareUrl(match[0]));
		if (parsed !== null) {
			citations.push(toCitation(parsed, file, lineOf(starts, match.index), null, []));
		}
	}
	return { citations: citations.toSorted((a, b) => a.line - b.line), orphanQuotes: [], inlineQuotes };
}

/** Collects the URLs of a data file (`schema.json`): no quotes, only places to check. */
export function collectFromText(text: string, file: string): CollectResult {
	const starts = lineStartsOf(text);
	const citations: Citation[] = [];
	for (const match of text.matchAll(BARE_URL)) {
		const parsed = parseSpecUrl(trimBareUrl(match[0]));
		if (parsed !== null) {
			citations.push(toCitation(parsed, file, lineOf(starts, match.index), null, []));
		}
	}
	return { citations, orphanQuotes: [], inlineQuotes: [] };
}
