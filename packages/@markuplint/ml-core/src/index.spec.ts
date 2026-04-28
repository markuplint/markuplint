// @ts-nocheck

import specs from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { createRule } from './ml-rule/create-test-rule.js';
import { createTestDocument, createTestElement, createTestNodeList } from './test/index.js';

/**
 * Creates a flat, offset-sorted token list for test assertions (replaces removed createTestTokenList).
 */
function createTestTokenList(sourceCode) {
	const document = createTestDocument(sourceCode);
	const tokens = [];
	for (const node of document.nodeList) {
		tokens.push(node);
		if (node.is(node.ELEMENT_NODE) && node.closeTag) {
			tokens.push(node.closeTag);
		}
	}
	return tokens.toSorted((a, b) => a.startOffset - b.startOffset);
}

describe('AST', () => {
	test('node count', () => {
		const nodeList = createTestNodeList('<div>text</div>');
		expect(nodeList.length).toBe(2);
	});

	test('raw', () => {
		const nodeList = createTestNodeList('<div>text</div>');
		expect(nodeList[0].raw).toBe('<div>');
		expect(nodeList[1].raw).toBe('text');
		expect(nodeList[0].closeTag.raw).toBe('</div>');
	});

	test('raw', () => {
		const tokens = createTestTokenList(`
<div>
	text
</div>`);
		expect(tokens[0].raw).toBe('\n');
		expect(tokens[1].raw).toBe('<div>');
		expect(tokens[2].raw).toBe('\n\ttext\n');
		expect(tokens[3].raw).toBe('</div>');
	});

	test('raw', () => {
		const tokens = createTestTokenList(`
    <div>
        text
    </div>`);
		expect(tokens[0].raw).toBe('\n    ');
		expect(tokens[1].raw).toBe('<div>');
		expect(tokens[2].raw).toBe('\n        text\n    ');
		expect(tokens[3].raw).toBe('</div>');
		expect(tokens[0].prevToken).toBe(null);
		expect(tokens[1].prevToken.raw).toBe('\n    ');
		expect(tokens[2].prevToken.raw).toBe('<div>');
		expect(tokens[1].prevToken.uuid).toBe(tokens[0].uuid);
		expect(tokens[2].prevToken.uuid).toBe(tokens[1].uuid);
	});

	test('raw', () => {
		const tokens = createTestTokenList(`
    <div>
        <span>text</span>
    </div>`);
		expect(tokens[0].raw).toBe('\n    ');
		expect(tokens[1].raw).toBe('<div>');
		expect(tokens[2].raw).toBe('\n        ');
		expect(tokens[3].raw).toBe('<span>');
		expect(tokens[4].raw).toBe('text');
		expect(tokens[5].raw).toBe('</span>');
		expect(tokens[6].raw).toBe('\n    ');
		expect(tokens[7].raw).toBe('</div>');
	});

	test('raw', () => {
		const tokens = createTestTokenList(`
<div>
	<span>text</span>
</div>`);
		expect(tokens[0].raw).toBe('\n');
		expect(tokens[1].raw).toBe('<div>');
		expect(tokens[2].raw).toBe('\n\t');
		expect(tokens[3].raw).toBe('<span>');
		expect(tokens[4].raw).toBe('text');
		expect(tokens[5].raw).toBe('</span>');
		expect(tokens[6].raw).toBe('\n');
		expect(tokens[7].raw).toBe('</div>');
	});

	test('classList', () => {
		const el = createTestElement('<div class="a b c"></div>');
		expect([...el.classList]).toStrictEqual(['a', 'b', 'c']);
	});

	test('namespace', () => {
		const tokens = createTestTokenList(`<div>
	<svg>
		<a></a>
		<foreignObject>
			<div></div>
		</foreignObject>
	</svg>
	<a></a>
</div>
`);
		expect(tokens[0].nodeName).toBe('DIV');
		expect(tokens[0].namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect(tokens[2].nodeName).toBe('svg');
		expect(tokens[2].namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(tokens[4].nodeName).toBe('a');
		expect(tokens[4].namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(tokens[7].nodeName).toBe('foreignObject');
		expect(tokens[7].namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(tokens[9].nodeName).toBe('DIV');
		expect(tokens[9].namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect(tokens[16].nodeName).toBe('A');
		expect(tokens[16].namespaceURI).toBe('http://www.w3.org/1999/xhtml');
	});

	test('toString', () => {
		const raw = `
	<div>
		<span attr attr2 attr3="value" attr4=value>text</span>
	</div>`;
		const doc = createTestDocument(raw);
		expect(doc.toString()).toBe(raw);
	});

	test('IDL attribute in JSX', async () => {
		expect(
			createTestElement('<label></label>', {
				parser: await import('@markuplint/jsx-parser'),
				specs: { ...specs, acceptedAttrNames: 'idl' },
			}).getAttributeNode('for')?.localName,
		).toBeUndefined();
		expect(
			createTestElement('<label htmlFor></label>', {
				parser: await import('@markuplint/jsx-parser'),
				specs: { ...specs, acceptedAttrNames: 'idl' },
			}).getAttributeNode('for')?.localName,
		).toBe('for');
		expect(
			createTestElement('<label htmlFor></label>', {
				parser: await import('@markuplint/jsx-parser'),
				specs: { ...specs, acceptedAttrNames: 'idl' },
			}).getAttributeNode('htmlFor')?.localName,
		).toBeUndefined();
	});

	test('IDL attribute candidate in idl mode vs both mode', async () => {
		// In 'idl' mode, using content name suggests the IDL name
		const idlEl = createTestElement('<div tabindex="0"></div>', {
			parser: await import('@markuplint/jsx-parser'),
			specs: { ...specs, acceptedAttrNames: 'idl' },
		});
		expect(idlEl.getAttributeNode('tabindex')?.candidate).toBe('tabIndex');

		// In 'both' mode, no candidate is set (both names are accepted)
		const bothEl = createTestElement('<div tabindex="0"></div>', {
			parser: await import('@markuplint/jsx-parser'),
			specs: { ...specs, acceptedAttrNames: 'both' },
		});
		expect(bothEl.getAttributeNode('tabindex')?.candidate).toBeUndefined();
	});

	test('rule', () => {
		const document = createTestDocument('<div><span>text</span></div>', {
			config: {
				rules: {
					ruleA: true,
					ruleB: true,
				},
				nodeRules: [
					{
						selector: 'span',
						rules: {
							ruleA: false,
						},
					},
				],
			},
		});
		const ruleA = createRule({
			name: 'ruleA',
			defaultValue: 'foo',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});
		document.setRule(ruleA);
		expect(document.nodeList[1].rule.disabled).toBe(true);
		const ruleB = createRule({
			name: 'ruleB',
			defaultValue: 'foo',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});
		document.setRule(ruleB);
		expect(document.nodeList[1].rule.disabled).toBe(false);
	});
});

describe('Selector', () => {
	test('nodeName case-sensitive', async () => {
		expect(createTestElement('<DIV></DIV>').matches('div')).toBeTruthy();
		expect(createTestElement('<DIV></DIV>').matches('DIV')).toBeTruthy();
		expect(
			createTestElement('<Div></Div>', {
				parser: await import('@markuplint/jsx-parser'),
			}).matches('DIV'),
		).toBeFalsy();
	});

	test('Pug has PSBlock', async () => {
		const el = createTestElement(
			`
div#hoge.foo.bar
	if foo
		a(href="path/to")`,
			{
				parser: await import('@markuplint/pug-parser'),
			},
		);
		const a = el.childNodes[0];
		expect(el.matches('*')).toBeTruthy();
		expect(el.matches('div')).toBeTruthy();
		expect(el.matches('div#hoge')).toBeTruthy();
		expect(el.matches('div#fuga')).toBe(false);
		expect(el.matches('#hoge')).toBeTruthy();
		expect(el.matches('div.foo')).toBeTruthy();
		expect(el.matches('div.bar')).toBeTruthy();
		expect(el.matches('.foo')).toBeTruthy();
		expect(el.matches('.foo.bar')).toBeTruthy();
		expect(el.matches('.any')).toBe(false);
		expect(a.matches('*')).toBeTruthy();
		expect(a.matches('a')).toBeTruthy();
		expect(a.matches('div a')).toBeTruthy();
		expect(a.matches('div > a')).toBeTruthy();
	});

	test('Attribute potential name', async () => {
		expect(
			createTestElement('<div tabIndex className><label htmlFor></label></div>', {
				parser: await import('@markuplint/jsx-parser'),
				specs: { ...specs, acceptedAttrNames: 'idl' },
			}).matches('[tabindex][class]:has(>label[for])'),
		).toBeTruthy();

		expect(
			createTestElement('<svg><image clipPath /></svg>', {
				parser: await import('@markuplint/jsx-parser'),
				specs: { ...specs, acceptedAttrNames: 'idl' },
			}).matches('svg:has(>image[clip-path])'),
		).toBeTruthy();
	});

	test('pretenders', async () => {
		expect(createTestElement('<div as="span"></div>').matches('span')).toBeFalsy();
		expect(createTestElement('<x-div as="span"></x-div>').matches('span')).toBeTruthy();

		expect(
			createTestElement('<Custom as="div"></Custom>', {
				parser: await import('@markuplint/jsx-parser'),
				pretenders: [
					{
						selector: 'Custom',
						as: 'div',
					},
				],
			}).matches('div'),
		).toBeTruthy();

		expect(
			createTestElement('<Custom as="div"></Custom>', {
				parser: await import('@markuplint/jsx-parser'),
				pretenders: [
					{
						selector: 'Custom',
						as: 'div',
					},
				],
			}).matches('Custom'),
		).toBeTruthy();
	});

	test('pretenders: slots: null treats component as void-like (no children shared)', async () => {
		const jsxParser = await import('@markuplint/jsx-parser');

		// slots: null — virtual element should have no children
		const voidEl = createTestElement('<VoidComp>child text</VoidComp>', {
			parser: jsxParser,
			pretenders: [
				{
					selector: 'VoidComp',
					as: { element: 'img', slots: null },
				},
			],
		});
		expect(voidEl.pretenderContext?.type).toBe('pretender');
		expect([...(voidEl.pretenderContext as any).as.childNodes]).toHaveLength(0);

		// slots: true — virtual element should share children
		const slotEl = createTestElement('<SlotComp>child text</SlotComp>', {
			parser: jsxParser,
			pretenders: [
				{
					selector: 'SlotComp',
					as: { element: 'div', slots: true },
				},
			],
		});
		expect(slotEl.pretenderContext?.type).toBe('pretender');
		expect([...(slotEl.pretenderContext as any).as.childNodes].length).toBeGreaterThan(0);
	});

	test('pretenders: bare string identity (slots undefined) shares children for backward compat', async () => {
		const jsxParser = await import('@markuplint/jsx-parser');

		const el = createTestElement('<Comp>child text</Comp>', {
			parser: jsxParser,
			pretenders: [
				{
					selector: 'Comp',
					as: 'div',
				},
			],
		});
		expect(el.pretenderContext?.type).toBe('pretender');
		expect([...(el.pretenderContext as any).as.childNodes].length).toBeGreaterThan(0);
	});

	// Issue #3740: HTML elements must never be pretendered. Allowing `<marquee as="div">`
	// or a config-driven HTML→HTML pretender would silently mask standards-conformance
	// violations (deprecation, ARIA role restrictions) on the original tag.
	test('pretenders: ignored when selector matches an HTML element (issue-3740)', () => {
		const el = createTestElement('<marquee>x</marquee>', {
			specs,
			pretenders: [
				{
					selector: 'marquee',
					as: 'div',
				},
			],
		});
		expect(el.pretenderContext).toBeNull();
		expect(el.localName).toBe('marquee');
	});

	test('pretenders: still applies to web-component selectors (issue-3740)', () => {
		const el = createTestElement('<x-marquee>x</x-marquee>', {
			specs,
			pretenders: [
				{
					selector: 'x-marquee',
					as: 'marquee',
				},
			],
		});
		expect(el.pretenderContext?.type).toBe('pretender');
		expect(el.localName).toBe('marquee');
	});

	test('pretenders: applies to non-spec custom names parsed as HTML (issue-3740)', () => {
		// `<SimpleButton>` lowercased by the HTML parser becomes `simplebutton`. It is
		// not a hyphenated custom element, so the parser tags it `elementType='html'`,
		// but the spec has no entry — pretender should still apply (covers the
		// pretenders.scan workflow).
		const el = createTestElement('<SimpleButton>x</SimpleButton>', {
			specs,
			pretenders: [
				{
					selector: 'SimpleButton',
					as: 'button',
				},
			],
		});
		expect(el.pretenderContext?.type).toBe('pretender');
		expect(el.localName).toBe('button');
	});
});

describe('Rule', () => {
	test('regexSelector', () => {
		const document = createTestDocument('<img src="path/to/name.png" />', {
			config: {
				rules: {
					ruleA: true,
				},
				nodeRules: [
					{
						regexSelector: {
							nodeName: 'img',
							attrName: 'src',
							attrValue: '/(?<fileName>[a-z0-9_-]+)\\.png$/',
						},
						rules: {
							ruleA: {
								value: 'fileName is {{ fileName }}',
								options: {
									propA: 'fileName is {{ fileName }}',
									propB: ['fileName is {{ fileName }}'],
									propC: {
										prop: 'fileName is {{ fileName }}',
									},
								},
							},
						},
					},
				],
			},
		});
		const ruleA = createRule({
			name: 'ruleA',
			defaultValue: 'foo',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});
		document.setRule(ruleA);
		expect(document.nodeList[0].rule).toStrictEqual({
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'fileName is name',
			options: {
				propA: 'fileName is name',
				propB: ['fileName is name'],
				propC: {
					prop: 'fileName is name',
				},
			},
		});
	});

	test('extend rule settings', () => {
		const document = createTestDocument('<span class="a"></span><div class="b"><span></span></div>', {
			config: {
				rules: {
					ruleA: {
						severity: 'error',
						reason: '123',
					},
					ruleB: {
						severity: 'info',
						reason: '456',
					},
					ruleC: false,
					ruleD: true,
					ruleE: {
						value: '789',
					},
				},
				nodeRules: [
					{
						selector: '.a',
						rules: {
							ruleA: {
								severity: 'info',
								reason: '456',
							},
							ruleB: {},
							ruleC: true,
							ruleD: false,
							ruleE: false,
						},
					},
				],
				childNodeRules: [
					{
						selector: '.b',
						rules: {
							ruleA: {
								severity: 'info',
								reason: '456',
							},
							ruleB: {},
							ruleC: true,
							ruleD: false,
							ruleE: false,
						},
					},
				],
			},
		});

		expect(document.nodeList[0].nodeName).toBe('SPAN');
		expect(document.nodeList[1].nodeName).toBe('DIV');
		expect(document.nodeList[2].nodeName).toBe('SPAN');

		const ruleA = createRule({
			name: 'ruleA',
			defaultValue: 'foo',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});
		const ruleB = createRule({
			name: 'ruleB',
			defaultValue: 'bar',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});
		const ruleC = createRule({
			name: 'ruleC',
			defaultValue: 'buz',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});
		const ruleD = createRule({
			name: 'ruleD',
			defaultValue: 'fuz',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});
		const ruleE = createRule({
			name: 'ruleE',
			defaultValue: 'piyo',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});

		document.setRule(ruleA);
		const resultA = {
			disabled: false,
			reason: '456',
			severity: 'info',
			value: 'foo',
			options: null,
		};
		expect(document.nodeList[0].rule).toStrictEqual(resultA);
		expect(document.nodeList[1].rule).not.toStrictEqual(resultA);
		expect(document.nodeList[2].rule).toStrictEqual(resultA);

		document.setRule(ruleB);
		const resultB = {
			disabled: false,
			reason: '456',
			severity: 'info',
			value: 'bar',
			options: null,
		};
		expect(document.nodeList[0].rule).toStrictEqual(resultB);
		expect(document.nodeList[1].rule).toStrictEqual(resultB);
		expect(document.nodeList[2].rule).toStrictEqual(resultB);

		document.setRule(ruleC);
		const resultC = {
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'buz',
			options: null,
		};
		expect(document.nodeList[0].rule).toStrictEqual(resultC);
		expect(document.nodeList[1].rule).not.toStrictEqual(resultC);
		expect(document.nodeList[2].rule).toStrictEqual(resultC);

		document.setRule(ruleD);
		const resultD = {
			disabled: true,
			reason: undefined,
			severity: 'error',
			value: 'fuz',
			options: null,
		};
		expect(document.nodeList[0].rule).toStrictEqual(resultD);
		expect(document.nodeList[1].rule).not.toStrictEqual(resultC);
		expect(document.nodeList[2].rule).toStrictEqual(resultD);

		document.setRule(ruleE);
		const resultE = {
			disabled: true,
			reason: undefined,
			severity: 'error',
			value: 'piyo',
			options: null,
		};
		expect(document.nodeList[0].rule).toStrictEqual(resultE);
		expect(document.nodeList[1].rule).not.toStrictEqual(resultE);
		expect(document.nodeList[2].rule).toStrictEqual(resultE);
	});

	test('regexSelector + pug', async () => {
		const document = createTestDocument(
			`section.Card
	.Card__inner1
		.Card__inner2
			if true
				.Card__inner3`,
			{
				config: {
					rules: {
						ruleA: 'global',
					},
					childNodeRules: [
						{
							regexSelector: {
								attrName: 'class',
								attrValue: '/^(?<BlockName>[A-Z][a-z0-9]+)$/',
							},
							inheritance: true,
							rules: {
								ruleA: '{{ BlockName }}',
							},
						},
					],
				},
				parser: await import('@markuplint/pug-parser'),
			},
		);
		const ruleA = createRule({
			name: 'ruleA',
			defaultValue: 'foo',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});
		document.setRule(ruleA);
		expect(document.nodeList[0].rule).toStrictEqual({
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'global',
			options: null,
		});
		expect(document.nodeList[1].rule).toStrictEqual({
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'Card',
			options: null,
		});
		expect(document.nodeList[2].rule).toStrictEqual({
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'Card',
			options: null,
		});
		expect(document.nodeList[4].rule).toStrictEqual({
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'Card',
			options: null,
		});
	});

	test('regexSelector + jsx', async () => {
		const document = createTestDocument(
			`<section className="Card">
	<div className="Card__inner1">
		<div className="Card__inner2">
			{() => (<div className="Card__inner3" />)}
		</div>
	</div>
</section>`,
			{
				config: {
					rules: {
						ruleA: 'global',
					},
					childNodeRules: [
						{
							regexSelector: {
								attrName: 'class',
								attrValue: '/^(?<BlockName>[A-Z][a-z0-9]+)$/',
							},
							inheritance: true,
							rules: {
								ruleA: '{{ BlockName }}',
							},
						},
					],
				},
				parser: await import('@markuplint/jsx-parser'),
				specs: { ...specs, acceptedAttrNames: 'idl' },
			},
		);
		const ruleA = createRule({
			name: 'ruleA',
			defaultValue: 'foo',
			defaultOptions: null,
			verify() {
				throw new Error();
			},
		});
		document.setRule(ruleA);
		expect(document.nodeList[0].rule).toStrictEqual({
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'global',
			options: null,
		});
		expect(document.nodeList[2].rule).toStrictEqual({
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'Card',
			options: null,
		});
		expect(document.nodeList[4].rule).toStrictEqual({
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'Card',
			options: null,
		});
		expect(document.nodeList[7].rule).toStrictEqual({
			disabled: false,
			reason: undefined,
			severity: 'error',
			value: 'Card',
			options: null,
		});
	});

	test('Rule Mapping', async () => {
		const config = {
			rules: {
				ruleA: 'global',
			},
			childNodeRules: [
				{
					regexSelector: {
						nodeName: '/^x-(?<name>[a-c])/',
					},
					inheritance: true,
					rules: {
						ruleA: '{{ name }}',
					},
				},
			],
		};

		const html = createTestDocument('<x-a><x-b><x-c></x-c></x-b></x-a>', {
			config,
		});
		const htmlRules = html.nodeList.map(node => node.nodeName.toLowerCase() + ':' + node.rules['ruleA']);
		expect(htmlRules).toStrictEqual(['x-a:global', 'x-b:a', 'x-c:b']);

		const pug = createTestDocument('x-a: x-b: x-c', {
			config,
			parser: await import('@markuplint/pug-parser'),
		});
		const pugRules = pug.nodeList.map(node => node.nodeName.toLowerCase() + ':' + node.rules['ruleA']);
		expect(pugRules).toStrictEqual(['x-a:global', 'x-b:a', 'x-c:b']);
	});
});

describe('Accessibility', () => {
	test('props', () => {
		const doc = createTestDocument('<button>This is button</button>', { specs });
		const el = doc.querySelector('button');
		const a11y = doc.getAccessibilityProp(el);

		expect(a11y.role).toBe('button');
		expect(a11y.name).toBe('This is button');
	});

	test('has <slot>', () => {
		const doc = createTestDocument('<button><slot></slot></button>', { specs });
		const el = doc.querySelector('button');
		const a11y = doc.getAccessibilityProp(el);

		expect(a11y.role).toBe('button');
		expect(a11y.name.unknown).toBe(true);
	});
});

describe('the `as` attribute pretending', () => {
	test('Native element', () => {
		const dom = createTestDocument('<span as="div"></span>');
		expect(dom.nodeList[0].nodeName).toBe('SPAN');
	});

	test('Custom element', () => {
		const dom = createTestDocument('<x-div as="div"></x-div>');
		expect(dom.nodeList[0].nodeName).toBe('DIV');
	});

	test('Authored element', async () => {
		const dom = createTestDocument('<XDiv as="div"></XDiv>', { parser: await import('@markuplint/jsx-parser') });
		expect(dom.nodeList[0].nodeName).toBe('DIV');
	});

	test('Authored element (No parser)', () => {
		const dom = createTestDocument('<Custom as="div"></Custom>');
		expect(dom.nodeList[0].nodeName).toBe('CUSTOM');
	});
});

describe('Conditional Child Nodes', () => {
	function debugConditionalChildNodesTree(node) {
		return node?.conditionalChildNodes().map(c =>
			c.map(n => {
				// `MLParentNode`
				const c = n.conditionalChildNodes?.().flatMap(c => [...c].map(n => n.raw));
				// Other
				if (c[0]) {
					return [n.raw, c];
				}
				return n.raw;
			}),
		);
	}

	test('if', async () => {
		const dom = createTestDocument(
			`
<ul>
	{#if cond === valueA}
		<li class="1"></li>
	{/if}
</ul>
`.replaceAll(/\t|\n/g, ''),
			{ parser: await import('@markuplint/svelte-parser') },
		);

		expect(debugConditionalChildNodesTree(dom.nodeList[0])).toEqual([
			[
				// if
				'<li class="1">',
			],
			[
				// default (else)
			],
		]);
	});

	test('if, if:elseif', async () => {
		const dom = createTestDocument(
			`
<ul>
	<li class="1"></li>
	{#if cond === valueA}
		<li class="2"></li>
	{:else if cond === valueB}
		<li class="3"></li>
	{/if}
	<li class="4"></li>
</ul>
`.replaceAll(/\t|\n/g, ''),
			{ parser: await import('@markuplint/svelte-parser') },
		);

		expect(debugConditionalChildNodesTree(dom.nodeList[0])).toEqual([
			[
				// if
				'<li class="1">',
				'<li class="2">',
				'<li class="4">',
			],
			[
				// else if
				'<li class="1">',
				'<li class="3">',
				'<li class="4">',
			],
			[
				// default (else)
				'<li class="1">',
				'<li class="4">',
			],
		]);
	});

	test('Nested: if', async () => {
		const dom = createTestDocument(
			`
<ul>
	<li class="1"></li>
	{#if cond1 === valueA}
		<li class="2">
			{#if cond2 === valueB}
				<span class="3"></span>
			{/if}
		</li>
	{/if}
	<li class="4"></li>
</ul>
`.replaceAll(/\t|\n/g, ''),
			{ parser: await import('@markuplint/svelte-parser') },
		);

		expect(debugConditionalChildNodesTree(dom.nodeList[0])).toEqual([
			[
				// if -> if
				'<li class="1">',
				['<li class="2">', ['<span class="3">']],
				'<li class="4">',
			],
			[
				// default (else)
				'<li class="1">',
				'<li class="4">',
			],
		]);
	});

	test('Nested: if (2)', async () => {
		const dom = createTestDocument(
			`
<ul>
	<li class="1"></li>
	{#if cond1 === valueA}
		{#if cond2 === valueB}
			<li class="2"></li>
		{/if}
	{/if}
	<li class="3"></li>
</ul>
`.replaceAll(/\t|\n/g, ''),
			{ parser: await import('@markuplint/svelte-parser') },
		);

		expect(debugConditionalChildNodesTree(dom.nodeList[0])).toEqual([
			[
				// if -> if
				'<li class="1">',
				'<li class="2">',
				'<li class="3">',
			],
			[
				// default (else)
				'<li class="1">',
				'<li class="3">',
			],
		]);
	});

	test('Nested: if (3)', async () => {
		const dom = createTestDocument(
			`
<ul>
	<li class="1"></li>
	{#if cond1 === valueA}
		{#if cond2 === valueB}
			<li class="2"></li>
		{:else if cond3 === valueB}
			<li class="3"></li>
		{/if}
	{/if}
	<li class="4"></li>
</ul>
`.replaceAll(/\t|\n/g, ''),
			{ parser: await import('@markuplint/svelte-parser') },
		);

		expect(debugConditionalChildNodesTree(dom.nodeList[0])).toEqual([
			[
				// if -> if
				'<li class="1">',
				'<li class="2">',
				'<li class="4">',
			],
			[
				// if -> default (else)
				'<li class="1">',
				'<li class="3">',
				'<li class="4">',
			],
			[
				// default (else)
				'<li class="1">',
				'<li class="4">',
			],
		]);
	});

	test('await', async () => {
		const dom = createTestDocument(
			`
<ul>
	<li class="1"></li>
	{#await promise}
		<li class="2">Wait</li>
	{:then data}
		<li class="3">{data}</li>
	{:catch error}
		<li class="4">{error.message}</li>
	{/await}
	<li class="5"></li>
</ul>
`.replaceAll(/\t|\n/g, ''),
			{ parser: await import('@markuplint/svelte-parser') },
		);

		expect(debugConditionalChildNodesTree(dom.nodeList[0])).toEqual([
			[
				// await
				'<li class="1">',
				['<li class="2">', ['Wait']],
				'<li class="5">',
			],
			[
				// then
				'<li class="1">',
				'<li class="3">',
				'<li class="5">',
			],
			[
				// error
				'<li class="1">',
				'<li class="4">',
				'<li class="5">',
			],
		]);
	});
});

describe('ChildNode with blockBehavior', () => {
	test('each', async () => {
		const dom = createTestDocument(
			`
<dl>
  {#each collection.items as item}
    <dt>{item.name}</dt>
  {/each}
</dl>
`.replaceAll(/\t|\n/g, ''),
			{ parser: await import('@markuplint/svelte-parser') },
		);

		expect(dom.nodeList[0]?.nodeName).toEqual('DL');
		expect(dom.nodeList[0]?.children[0]?.nodeName).toEqual('DT');
	});
});

describe('Issues', () => {
	test('#607', async () => {
		const dom = createTestDocument('<% %><div></div>', {
			config: {
				nodeRules: [{ selector: '* ~ div', rules: {} }],
			},
			parser: await import('@markuplint/ejs-parser'),
		});
		expect(dom.nodeList[0].nodeName).toBe('#ml-block');
	});

	test('#641', async () => {
		const dom = createTestDocument('<p>{array.map(_ => <>A</>)}</p>', {
			parser: await import('@markuplint/jsx-parser'),
		});
		expect(dom.nodeList[0].raw).toBe('<p>');
		expect(dom.nodeList[1].raw).toBe('{array.map(_ => <>A</>)}');
		expect(dom.nodeList[2].raw).toBe('<>');
		expect(dom.nodeList[3].raw).toBe('A');
		expect(dom.nodeList[4]).toBeUndefined();
		expect(dom.nodeList[0].childNodes[0].raw).toBe('A');
		const elements = dom.querySelectorAll('*');
		expect(elements.length).toBe(1);
	});

	test('#698', async () => {
		const dom = createTestDocument(
			`<ul>
	{#if cond === valueA}
		<li>A</li>
	{:else if cond === valueB}
		<li>B</li>
	{/if}
</ul>`,
			{ parser: await import('@markuplint/svelte-parser') },
		);

		// 💡 This calling is a test that checks it
		// doesn't throw an error when it referrers a DOM object.
		dom.querySelectorAll('*');

		const map = dom.debugMap();
		expect(map).toStrictEqual([
			'[1:1]>[1:5](0,4)UL: <ul>',
			'  namespaceURI: true',
			'  elementType: html',
			'  isInFragmentDocument: true',
			'  isForeignElement: false',
			'[1:5]>[2:2](4,6)#text: ⏎→',
			'[2:2]>[2:23](6,27)#ml-block: {#if␣cond␣===␣valueA}',
			'[2:23]>[3:3](27,30)#text: ⏎→→',
			'[3:3]>[3:7](30,34)LI: <li>',
			'  namespaceURI: true',
			'  elementType: html',
			'  isInFragmentDocument: true',
			'  isForeignElement: false',
			'[3:7]>[3:8](34,35)#text: A',
			'[3:13]>[4:2](40,42)#text: ⏎→',
			'[4:2]>[4:28](42,68)#ml-block: {:else␣if␣cond␣===␣valueB}',
			'[4:28]>[5:3](68,71)#text: ⏎→→',
			'[5:3]>[5:7](71,75)LI: <li>',
			'  namespaceURI: true',
			'  elementType: html',
			'  isInFragmentDocument: true',
			'  isForeignElement: false',
			'[5:7]>[5:8](75,76)#text: B',
			'[5:13]>[6:2](81,83)#text: ⏎→',
			'[6:2]>[6:7](83,88)#ml-block: {/if}',
			'[6:7]>[7:1](88,89)#text: ⏎',
		]);
	});

	test('#1147', async () => {
		const dom = createTestDocument(
			`
				<body>
					<label for="cheese">Do you like cheese?</label>
					<input type="checkbox" id="cheese">
					<% pp "anything" %>
				</body>
			`,
			{ parser: await import('@markuplint/erb-parser') },
		);

		const map = dom.debugMap();
		expect(map).toStrictEqual([
			'[1:1]>[2:5](0,5)#text: ⏎→→→→',
			'[2:5]>[2:11](5,11)BODY: <body>',
			'  namespaceURI: true',
			'  elementType: html',
			'  isInFragmentDocument: true',
			'  isForeignElement: false',
			'[2:11]>[3:6](11,17)#text: ⏎→→→→→',
			'[3:6]>[3:26](17,37)LABEL: <label␣for="cheese">',
			'  namespaceURI: true',
			'  elementType: html',
			'  isInFragmentDocument: true',
			'  isForeignElement: false',
			'  [3:13]>[3:25](24,36)for: for="cheese"',
			'    [3:12]>[3:13](23,24)bN: ␣',
			'    [3:13]>[3:16](24,27)name: for',
			'    [3:16]>[3:16](27,27)bE: ',
			'    [3:16]>[3:17](27,28)equal: =',
			'    [3:17]>[3:17](28,28)aE: ',
			'    [3:17]>[3:18](28,29)sQ: "',
			'    [3:18]>[3:24](29,35)value: cheese',
			'    [3:24]>[3:25](35,36)eQ: "',
			'    isDirective: false',
			'    isDynamicValue: false',
			'[3:26]>[3:45](37,56)#text: Do␣you␣like␣cheese?',
			'[3:53]>[4:6](64,70)#text: ⏎→→→→→',
			'[4:6]>[4:41](70,105)INPUT: <input␣type="checkbox"␣id="cheese">',
			'  namespaceURI: true',
			'  elementType: html',
			'  isInFragmentDocument: true',
			'  isForeignElement: false',
			'  [4:13]>[4:28](77,92)type: type="checkbox"',
			'    [4:12]>[4:13](76,77)bN: ␣',
			'    [4:13]>[4:17](77,81)name: type',
			'    [4:17]>[4:17](81,81)bE: ',
			'    [4:17]>[4:18](81,82)equal: =',
			'    [4:18]>[4:18](82,82)aE: ',
			'    [4:18]>[4:19](82,83)sQ: "',
			'    [4:19]>[4:27](83,91)value: checkbox',
			'    [4:27]>[4:28](91,92)eQ: "',
			'    isDirective: false',
			'    isDynamicValue: false',
			'  [4:29]>[4:40](93,104)id: id="cheese"',
			'    [4:28]>[4:29](92,93)bN: ␣',
			'    [4:29]>[4:31](93,95)name: id',
			'    [4:31]>[4:31](95,95)bE: ',
			'    [4:31]>[4:32](95,96)equal: =',
			'    [4:32]>[4:32](96,96)aE: ',
			'    [4:32]>[4:33](96,97)sQ: "',
			'    [4:33]>[4:39](97,103)value: cheese',
			'    [4:39]>[4:40](103,104)eQ: "',
			'    isDirective: false',
			'    isDynamicValue: false',
			'[4:41]>[5:6](105,111)#text: ⏎→→→→→',
			'[5:6]>[5:25](111,130)#ml-block: <%␣pp␣"anything"␣%>',
			'[5:25]>[6:5](130,135)#text: ⏎→→→→',
			'[6:12]>[7:4](142,146)#text: ⏎→→→',
		]);
	});

	test('#1286', async () => {
		const dom = createTestDocument(
			`{#each list as item, i (\`\${i}-\${i}\`)}
	<div>{item}</div>
{/each}`,
			{ parser: await import('@markuplint/svelte-parser') },
		);
		const map = dom.debugMap();
		expect(map).toEqual([
			'[1:1]>[1:38](0,37)#ml-block: {#each␣list␣as␣item,␣i␣(`${i}-${i}`)}',
			'[1:38]>[2:2](37,39)#text: ⏎→',
			'[2:2]>[2:7](39,44)DIV: <div>',
			'  namespaceURI: true',
			'  elementType: html',
			'  isInFragmentDocument: true',
			'  isForeignElement: false',
			'[2:7]>[2:13](44,50)#ml-block: {item}',
			'[2:19]>[3:1](56,57)#text: ⏎',
			'[3:1]>[3:8](57,64)#ml-block: {/each}',
		]);
	});

	test('#1042', () => {
		const contents = [
			`---
key: value
---
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>title</title>
	</head>
	<body>
		<div id="app"></div>
	</body>
</html>`,
			'<div attr attr2=\'value2\' attr3="value3">foo</div>',
			'      <div   attr    attr2=\'value2\' attr3  =   "value3">\r\nfoo\n\n\n\n\n\n\n</div>',
		];
		const ignoreFrontMatter = {
			config: {
				parserOptions: {
					ignoreFrontMatter: true,
				},
			},
		};
		expect(createTestDocument(contents[0]).toString()).toBe(contents[0]);
		expect(createTestDocument(contents[0], ignoreFrontMatter).toString()).toBe(contents[0]);
		expect(createTestDocument(contents[1]).toString()).toBe(contents[1]);
		expect(createTestDocument(contents[2]).toString()).toBe(contents[2]);
	});
});
