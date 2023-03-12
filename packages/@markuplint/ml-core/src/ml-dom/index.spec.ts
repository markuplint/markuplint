// @ts-nocheck

import type { MLElement } from './node/element';

import { createRule } from '../ml-rule/create-test-rule';
import { createTestDocument, createTestElement, createTestNodeList, createTestTokenList } from '../test';

type Element = MLElement<any, any>;

describe('AST', () => {
	test('node count', () => {
		const nodeList = createTestNodeList('<div>text</div>');
		expect(nodeList.length).toBe(2);
	});

	test('raw', () => {
		const nodeList = createTestNodeList('<div>text</div>');
		expect(nodeList[0].raw).toBe('<div>');
		expect(nodeList[1].raw).toBe('text');
		expect((nodeList[0] as Element).closeTag?.raw).toBe('</div>');
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
		expect((tokens[0] as Element).prevToken).toBe(null);
		expect((tokens[1] as Element).prevToken?.raw).toBe('\n    ');
		expect((tokens[2] as Element).prevToken?.raw).toBe('<div>');
		expect((tokens[1] as Element).prevToken?.uuid).toBe(tokens[0].uuid);
		expect((tokens[2] as Element).prevToken?.uuid).toBe(tokens[1].uuid);
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
		expect(Array.from(el.classList)).toStrictEqual(['a', 'b', 'c']);
	});

	test('fixNodeName', () => {
		const el = createTestElement('<div></div>');
		expect(el.raw).toBe('<div>');
		el.fixNodeName('x-div');
		expect(el.raw).toBe('<x-div>');
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
		expect((tokens[0] as Element).nodeName).toBe('DIV');
		expect((tokens[0] as Element).namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect((tokens[2] as Element).nodeName).toBe('svg');
		expect((tokens[2] as Element).namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect((tokens[4] as Element).nodeName).toBe('a');
		expect((tokens[4] as Element).namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect((tokens[7] as Element).nodeName).toBe('foreignObject');
		expect((tokens[7] as Element).namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect((tokens[9] as Element).nodeName).toBe('DIV');
		expect((tokens[9] as Element).namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect((tokens[16] as Element).nodeName).toBe('A');
		expect((tokens[16] as Element).namespaceURI).toBe('http://www.w3.org/1999/xhtml');
	});

	test('toString', () => {
		const raw = `
	<div>
		<span attr attr2 attr3="value" attr4=value>text</span>
	</div>`;
		const doc = createTestDocument(raw);
		expect(doc.toString()).toBe(raw);
	});

	test('IDL attribute in JSX', () => {
		expect(
			createTestElement('<label></label>', {
				parser: require('@markuplint/jsx-parser'),
			}).getAttributeNode('for')?.localName,
		).toBeUndefined();
		expect(
			createTestElement('<label htmlFor></label>', {
				parser: require('@markuplint/jsx-parser'),
			}).getAttributeNode('for')?.localName,
		).toBe('for');
		expect(
			createTestElement('<label htmlFor></label>', {
				parser: require('@markuplint/jsx-parser'),
			}).getAttributeNode('htmlFor')?.localName,
		).toBeUndefined();
	});

	test('rule', () => {
		const document = createTestDocument<'foo', any>('<div><span>text</span></div>', {
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
	test('nodeName case-sensitive', () => {
		expect(createTestElement('<DIV></DIV>').matches('div')).toBeTruthy();
		expect(createTestElement('<DIV></DIV>').matches('DIV')).toBeTruthy();
		expect(
			createTestElement('<Div></Div>', {
				parser: require('@markuplint/jsx-parser'),
			}).matches('DIV'),
		).toBeFalsy();
	});

	test('Pug has PSBlock', () => {
		const el = createTestElement(
			`
div#hoge.foo.bar
	if foo
		a(href="path/to")`,
			{
				parser: require('@markuplint/pug-parser'),
			},
		);
		// @ts-ignore
		const a: Element = el.childNodes[0].childNodes[0];
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

	test('Attribute potential name', () => {
		expect(
			createTestElement('<div tabIndex className><label htmlFor></label></div>', {
				parser: require('@markuplint/jsx-parser'),
			}).matches('[tabindex][class]:has(>label[for])'),
		).toBeTruthy();

		expect(
			createTestElement('<svg><image clipPath /></svg>', {
				parser: require('@markuplint/jsx-parser'),
			}).matches('svg:has(>image[clip-path])'),
		).toBeTruthy();
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

		expect((document.nodeList[0] as Element).nodeName).toBe('SPAN');
		expect((document.nodeList[1] as Element).nodeName).toBe('DIV');
		expect((document.nodeList[2] as Element).nodeName).toBe('SPAN');

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

	test('regexSelector + pug', () => {
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
				parser: require('@markuplint/pug-parser'),
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

	test('regexSelector + jsx', () => {
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
				parser: require('@markuplint/jsx-parser'),
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

	test('Rule Mapping', () => {
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
			parser: require('@markuplint/pug-parser'),
		});
		const pugRules = pug.nodeList.map(node => node.nodeName.toLowerCase() + ':' + node.rules['ruleA']);
		expect(pugRules).toStrictEqual(['x-a:global', 'x-b:a', 'x-c:b']);
	});
});

describe('Issues', () => {
	test('#607', () => {
		const dom = createTestDocument('<% %><div></div>', {
			config: {
				nodeRules: [{ selector: '* ~ div', rules: {} }],
			},
			parser: require('@markuplint/ejs-parser'),
		});
		expect(dom.nodeList[0].nodeName).toBe('#ml-block');
	});

	test('#641', () => {
		const dom = createTestDocument('<p>{array.map(_ => <></>)}</p>', {
			parser: require('@markuplint/jsx-parser'),
		});
		expect(dom.nodeList[0].raw).toBe('<p>');
		expect(dom.nodeList[1].raw).toBe('{array.map(_ => <></>)}');
		expect(dom.nodeList[2].raw).toBe('<>');
		expect(dom.nodeList[3]).toBeUndefined();
		expect(dom.nodeList[0].childNodes[0].raw).toBe('{array.map(_ => <></>)}');
		expect(dom.nodeList[0].childNodes[0].childNodes[0].raw).toBe('<>');
		const elements = dom.querySelectorAll('*');
		expect(elements.length).toBe(2);
	});
});
