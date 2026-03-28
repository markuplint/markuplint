/**
 * E2E test: TS html-parser → MLAST JSON → Rust MLDOM (via napi) → TS
 */

 

import htmlSpec from '@markuplint/html-spec';
import { parser } from '@markuplint/html-parser';
import { describe, it, expect } from 'vitest';

import { NapiDom, lint, matchCssSyntax, matchCssProperty } from './index.js';

function buildDom(html: string): NapiDom {
	const ast = parser.parse(html);
	const json = JSON.stringify(ast);
	return new NapiDom(json);
}

describe('NapiDom E2E', () => {
	it('parses simple HTML and builds DOM', () => {
		const dom = buildDom('<div class="foo">text</div>');

		expect(dom.nodeCount).toBeGreaterThan(0);

		const root = dom.getNode(0);
		expect(root?.nodeType).toBe('document');
		expect(root?.nodeName).toBe('#document');
	});

	it('finds elements by UUID', () => {
		const dom = buildDom('<p>hello</p>');

		const elements = dom.getElements();
		expect(elements.length).toBeGreaterThanOrEqual(1);

		const p = elements.find(el => el.nodeName === 'p');
		expect(p).toBeDefined();

		// UUID lookup roundtrip
		const byUuid = dom.getNodeByUuid(p!.uuid);
		expect(byUuid).toBeDefined();
		expect(byUuid!.id).toBe(p!.id);
		expect(byUuid!.nodeType).toBe('element');
	});

	it('traverses parent-child relationships', () => {
		const dom = buildDom('<div><span>text</span></div>');

		const elements = dom.getElements();
		const div = elements.find(el => el.nodeName === 'div');
		const span = elements.find(el => el.nodeName === 'span');
		expect(div).toBeDefined();
		expect(span).toBeDefined();

		// span's parent should be div
		const spanParent = dom.getParent(span!.id);
		expect(spanParent).toBeDefined();
		expect(spanParent!.id).toBe(div!.id);

		// div's children should include span
		const divChildren = dom.getChildren(div!.id);
		expect(divChildren.some(c => c.id === span!.id)).toBe(true);
	});

	it('handles sibling navigation', () => {
		const dom = buildDom('<p>a</p><p>b</p><p>c</p>');

		const root = dom.getNode(0)!;
		const children = dom.getChildren(root.id);
		const elementChildren = children.filter(c => c.nodeType === 'element');
		expect(elementChildren.length).toBeGreaterThanOrEqual(3);

		const first = elementChildren[0];
		const second = elementChildren[1];

		const next = dom.getNextSibling(first.id);
		expect(next).toBeDefined();
		expect(next!.id).toBe(second.id);

		const prev = dom.getPrevSibling(second.id);
		expect(prev).toBeDefined();
		expect(prev!.id).toBe(first.id);
	});

	it('returns ancestors in strict bottom-up order', () => {
		const dom = buildDom('<div><span>text</span></div>');

		const descendants = dom.getDescendants(0);
		const textNode = descendants.find(n => n.nodeType === 'text' && n.raw === 'text');
		expect(textNode).toBeDefined();

		const ancestors = dom.getAncestors(textNode!.id);
		expect(ancestors.length).toBeGreaterThanOrEqual(2);

		// First ancestor is immediate parent (span), last is document
		expect(ancestors[0].nodeName).toBe('span');
		expect(ancestors.at(-1).nodeType).toBe('document');

		// Verify strict bottom-up: each ancestor must be parent of previous
		for (let i = 1; i < ancestors.length; i++) {
			const parent = dom.getParent(ancestors[i - 1].id);
			expect(parent).toBeDefined();
			expect(parent!.id).toBe(ancestors[i].id);
		}
	});

	it('handles namespace correctly', () => {
		const dom = buildDom('<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>');

		const elements = dom.getElements();
		const svg = elements.find(el => el.nodeName === 'svg');
		expect(svg).toBeDefined();
		expect(svg!.namespace).toBe('http://www.w3.org/2000/svg');
	});

	it('HTML elements have XHTML namespace', () => {
		const dom = buildDom('<p>text</p>');

		const elements = dom.getElements();
		const p = elements.find(el => el.nodeName === 'p');
		expect(p).toBeDefined();
		expect(p!.namespace).toBe('http://www.w3.org/1999/xhtml');
	});

	it('rejects invalid JSON', () => {
		expect(() => new NapiDom('not valid json')).toThrow(/Failed to parse MLAST JSON/);
	});

	it('rejects valid JSON with invalid MLAST structure', () => {
		expect(() => new NapiDom('{"foo": "bar"}')).toThrow(/Failed to parse MLAST JSON/);
	});

	it('handles comment nodes', () => {
		const dom = buildDom('<!-- hello --><p>text</p>');

		const descendants = dom.getDescendants(0);
		const comment = descendants.find(n => n.nodeType === 'comment');
		expect(comment).toBeDefined();
		expect(comment!.raw).toContain('hello');
	});

	it('handles doctype', () => {
		const dom = buildDom('<!DOCTYPE html><html><body></body></html>');

		const descendants = dom.getDescendants(0);
		const doctype = descendants.find(n => n.nodeType === 'doctype');
		expect(doctype).toBeDefined();
	});

	it('element attributes are counted', () => {
		const dom = buildDom('<input type="text" name="foo" required>');

		const elements = dom.getElements();
		const input = elements.find(el => el.nodeName === 'input');
		expect(input).toBeDefined();
		expect(input!.attributeCount).toBe(3);
	});

	it('source location properties are set correctly', () => {
		const dom = buildDom('<div>text</div>');

		const elements = dom.getElements();
		const div = elements.find(el => el.nodeName === 'div');
		expect(div).toBeDefined();

		// First element starts at beginning of input
		expect(div!.offset).toBe(0);
		expect(div!.line).toBe(1);
		expect(div!.col).toBe(1);
		// MLAST uses 0-based depth for top-level elements
		expect(div!.depth).toBe(0);
	});

	it('nested elements have correct depth', () => {
		const dom = buildDom('<div><span><a href="#">link</a></span></div>');

		const elements = dom.getElements();
		const div = elements.find(el => el.nodeName === 'div');
		const span = elements.find(el => el.nodeName === 'span');
		const a = elements.find(el => el.nodeName === 'a');
		expect(div).toBeDefined();
		expect(span).toBeDefined();
		expect(a).toBeDefined();

		expect(div!.depth).toBe(0);
		expect(span!.depth).toBe(1);
		expect(a!.depth).toBe(2);
	});

	it('NapiNode has correct source location', () => {
		const dom = buildDom('<p>text</p>');

		const descendants = dom.getDescendants(0);
		const text = descendants.find(n => n.nodeType === 'text' && n.raw === 'text');
		expect(text).toBeDefined();

		expect(text!.line).toBeGreaterThanOrEqual(1);
		expect(text!.col).toBeGreaterThanOrEqual(1);
		expect(text!.offset).toBeGreaterThan(0);
		expect(text!.depth).toBeGreaterThanOrEqual(1);
	});

	it('isGhost is false for normal elements', () => {
		const dom = buildDom('<div>text</div>');

		const elements = dom.getElements();
		const div = elements.find(el => el.nodeName === 'div');
		expect(div).toBeDefined();
		expect(div!.isGhost).toBe(false);
	});

	it('getNodeByUuid returns null for empty string', () => {
		const dom = buildDom('<p>text</p>');

		const result = dom.getNodeByUuid('');
		expect(result).toBeNull();
	});
});

describe('CSS value matching via napi', () => {
	// Basic keyword matching
	it('matches a keyword', () => {
		const result = matchCssSyntax('auto | none', 'auto');
		expect(result.matched).toBe(true);
	});

	it('rejects non-matching keyword', () => {
		const result = matchCssSyntax('auto | none', 'invalid');
		expect(result.matched).toBe(false);
		expect(result.offset).toBeDefined();
		expect(result.expected).toBeDefined();
		expect(result.expected!.length).toBeGreaterThan(0);
	});

	// Built-in types
	it('matches <length>', () => {
		expect(matchCssSyntax('<length>', '10px').matched).toBe(true);
	});

	it('matches <number>', () => {
		expect(matchCssSyntax('<number>', '42').matched).toBe(true);
	});

	it('matches <percentage>', () => {
		expect(matchCssSyntax('<percentage>', '50%').matched).toBe(true);
	});

	it('matches <hex-color>', () => {
		expect(matchCssSyntax('<hex-color>', '#ff0000').matched).toBe(true);
	});

	// CSS-wide keywords via matchCssProperty
	it('accepts inherit as CSS-wide keyword', () => {
		expect(matchCssProperty('<length> | auto', 'inherit').matched).toBe(true);
	});

	it('accepts initial as CSS-wide keyword', () => {
		expect(matchCssProperty('<length> | auto', 'initial').matched).toBe(true);
	});

	it('accepts revert-layer as CSS-wide keyword', () => {
		expect(matchCssProperty('<length> | auto', 'revert-layer').matched).toBe(true);
	});

	// var() / calc()
	it('accepts var() in type context', () => {
		expect(matchCssSyntax('<length>', 'var(--x)').matched).toBe(true);
	});

	it('accepts calc() in type context', () => {
		expect(matchCssSyntax('<length>', 'calc(100% - 20px)').matched).toBe(true);
	});

	it('accepts min() in type context', () => {
		expect(matchCssSyntax('<length>', 'min(10px, 20px)').matched).toBe(true);
	});

	// Property resolution
	it('resolves property references', () => {
		expect(matchCssSyntax("<'display'>", 'block').matched).toBe(true);
		expect(matchCssSyntax("<'display'>", 'flex').matched).toBe(true);
	});

	// Custom SVG types
	it('matches <view-box>', () => {
		expect(matchCssSyntax('<view-box>', '0 0 100 100').matched).toBe(true);
	});

	it('matches <preserve-aspect-ratio>', () => {
		expect(matchCssSyntax('<preserve-aspect-ratio>', 'xMidYMid meet').matched).toBe(true);
	});

	// Error reporting
	it('reports mismatch position with offset 0 for first-token mismatch', () => {
		const result = matchCssSyntax('auto', 'none');
		expect(result.matched).toBe(false);
		// Mismatch at the very first token → byte offset 0
		expect(result.offset).toBe(0);
		expect(result.length).toBeGreaterThan(0);
	});

	it('reports expected values on mismatch', () => {
		const result = matchCssSyntax('auto | none', 'invalid');
		expect(result.matched).toBe(false);
		expect(result.expected).toBeDefined();
		// Should contain the expected alternatives
		expect(result.expected).toContain('auto');
		expect(result.expected).toContain('none');
	});

	it('handles invalid syntax string gracefully', () => {
		// Unclosed angle bracket is a parse error
		const result = matchCssSyntax('<', 'auto');
		expect(result.matched).toBe(false);
	});

	// Combinators
	it('handles || combinator', () => {
		expect(matchCssSyntax('bold || italic', 'italic bold').matched).toBe(true);
	});

	it('handles && combinator', () => {
		expect(matchCssSyntax('bold && italic', 'italic bold').matched).toBe(true);
	});

	// Multipliers
	it('handles # multiplier (comma-separated)', () => {
		expect(matchCssSyntax('auto#', 'auto, auto, auto').matched).toBe(true);
	});

	it('handles {A,B} range', () => {
		expect(matchCssSyntax('<length>{1,4}', '10px 20px').matched).toBe(true);
	});
});

// ============================================================
// Rust lint pipeline E2E
// ============================================================

describe('Rust lint() E2E', () => {
	function lintHtml(html: string, rules: Record<string, unknown>) {
		const ast = parser.parse(html);
		const mlastJson = JSON.stringify(ast);
		const specJson = JSON.stringify(htmlSpec);
		const configJson = JSON.stringify({ rules });
		return lint(mlastJson, configJson, specJson);
	}

	it('detects duplicate attributes', () => {
		const violations = lintHtml('<div class="a" class="b"></div>', {
			'attr-duplication': true,
		});
		expect(violations).toHaveLength(1);
		expect(violations[0].ruleId).toBe('attr-duplication');
		expect(violations[0].severity).toBe('error');
		expect(violations[0].message).toContain('class');
		expect(violations[0].line).toBe(1);
		expect(violations[0].col).toBeGreaterThan(1);
	});

	it('reports no violations for clean HTML', () => {
		const violations = lintHtml('<div class="a" id="b"></div>', {
			'attr-duplication': true,
		});
		expect(violations).toHaveLength(0);
	});

	it('respects disabled rules', () => {
		const violations = lintHtml('<div class="a" class="b"></div>', {
			'attr-duplication': false,
		});
		expect(violations).toHaveLength(0);
	});

	it('respects severity override', () => {
		const violations = lintHtml('<div id="x" id="y"></div>', {
			'attr-duplication': 'warning',
		});
		expect(violations).toHaveLength(1);
		expect(violations[0].severity).toBe('warning');
	});

	it('handles empty HTML', () => {
		const violations = lintHtml('', {
			'attr-duplication': true,
		});
		expect(violations).toHaveLength(0);
	});

	it('handles multiple elements with duplicates', () => {
		const violations = lintHtml('<div class="a" class="b"></div><span id="x" id="y"></span>', {
			'attr-duplication': true,
		});
		expect(violations).toHaveLength(2);
		expect(violations[0].ruleId).toBe('attr-duplication');
		expect(violations[1].ruleId).toBe('attr-duplication');
	});
});
