import type { MLDOMElement } from './tokens';

import { createRule } from '../ml-rule/create-test-rule';
import { createTestDocument, createTestElement, createTestNodeList } from '../test';

test('node count', async () => {
	const nodeList = createTestNodeList('<div>text</div>');
	expect(nodeList.length).toBe(3);
});

test('raw', async () => {
	const nodeList = createTestNodeList('<div>text</div>');
	expect(nodeList[0].raw).toBe('<div>');
	expect(nodeList[1].raw).toBe('text');
	expect(nodeList[2].raw).toBe('</div>');
});

test('raw', async () => {
	const nodeList = createTestNodeList(`
<div>
	text
</div>`);
	expect(nodeList[0].raw).toBe('\n');
	expect(nodeList[1].raw).toBe('<div>');
	expect(nodeList[2].raw).toBe('\n\ttext\n');
	expect(nodeList[3].raw).toBe('</div>');
});

test('raw', async () => {
	const nodeList = createTestNodeList(`
    <div>
        text
    </div>`);
	expect(nodeList[0].raw).toBe('\n    ');
	expect(nodeList[1].raw).toBe('<div>');
	expect(nodeList[2].raw).toBe('\n        text\n    ');
	expect(nodeList[3].raw).toBe('</div>');
	expect(nodeList[0].prevToken).toBe(null);
	expect(nodeList[1].prevToken!.raw).toBe('\n    ');
	expect(nodeList[2].prevToken!.raw).toBe('<div>');
	expect(nodeList[3].prevToken!.raw).toBe('\n        text\n    ');
	expect(nodeList[1].prevToken!.uuid).toBe(nodeList[0].uuid);
	expect(nodeList[2].prevToken!.uuid).toBe(nodeList[1].uuid);
	expect(nodeList[3].prevToken!.uuid).toBe(nodeList[2].uuid);
});

test('raw', async () => {
	const nodeList = createTestNodeList(`
    <div>
        <span>text</span>
    </div>`);
	expect(nodeList[0].raw).toBe('\n    ');
	expect(nodeList[1].raw).toBe('<div>');
	expect(nodeList[2].raw).toBe('\n        ');
	expect(nodeList[3].raw).toBe('<span>');
	expect(nodeList[4].raw).toBe('text');
	expect(nodeList[5].raw).toBe('</span>');
	expect(nodeList[6].raw).toBe('\n    ');
	expect(nodeList[7].raw).toBe('</div>');
});

test('raw', async () => {
	const nodeList = createTestNodeList(`
<div>
	<span>text</span>
</div>`);
	expect(nodeList[0].raw).toBe('\n');
	expect(nodeList[1].raw).toBe('<div>');
	expect(nodeList[2].raw).toBe('\n\t');
	expect(nodeList[3].raw).toBe('<span>');
	expect(nodeList[4].raw).toBe('text');
	expect(nodeList[5].raw).toBe('</span>');
	expect(nodeList[6].raw).toBe('\n');
	expect(nodeList[7].raw).toBe('</div>');
});

test('raw', async () => {
	const el = createTestElement('<div></div>');
	expect(el.raw).toBe('<div>');
	el.fixNodeName('x-div');
	expect(el.raw).toBe('<x-div>');
});

test('namespace', async () => {
	const nodeList = createTestNodeList(`<div>
	<svg>
		<a></a>
		<foreignObject>
			<div></div>
		</foreignObject>
	</svg>
	<a></a>
</div>
`);
	expect((nodeList[0] as MLDOMElement<any, any>).nodeName).toBe('div');
	expect((nodeList[0] as MLDOMElement<any, any>).namespaceURI).toBe('http://www.w3.org/1999/xhtml');
	expect((nodeList[2] as MLDOMElement<any, any>).nodeName).toBe('svg');
	expect((nodeList[2] as MLDOMElement<any, any>).namespaceURI).toBe('http://www.w3.org/2000/svg');
	expect((nodeList[4] as MLDOMElement<any, any>).nodeName).toBe('a');
	expect((nodeList[4] as MLDOMElement<any, any>).namespaceURI).toBe('http://www.w3.org/2000/svg');
	expect((nodeList[7] as MLDOMElement<any, any>).nodeName).toBe('foreignObject');
	expect((nodeList[7] as MLDOMElement<any, any>).namespaceURI).toBe('http://www.w3.org/2000/svg');
	expect((nodeList[9] as MLDOMElement<any, any>).nodeName).toBe('div');
	expect((nodeList[9] as MLDOMElement<any, any>).namespaceURI).toBe('http://www.w3.org/1999/xhtml');
	expect((nodeList[16] as MLDOMElement<any, any>).nodeName).toBe('a');
	expect((nodeList[16] as MLDOMElement<any, any>).namespaceURI).toBe('http://www.w3.org/1999/xhtml');
});

test('rule', async () => {
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
		async verify() {
			throw new Error();
		},
	});
	document.setRule(ruleA);
	expect(document.nodeList[1].rule.disabled).toBe(true);
	const ruleB = createRule({
		name: 'ruleB',
		defaultValue: 'foo',
		defaultOptions: null,
		async verify() {
			throw new Error();
		},
	});
	document.setRule(ruleB);
	expect(document.nodeList[1].rule.disabled).toBe(false);
});

test('regexSelector', async () => {
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
							option: {
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
		async verify() {
			throw new Error();
		},
	});
	document.setRule(ruleA);
	expect(document.nodeList[0].rule).toStrictEqual({
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'fileName is name',
		option: {
			propA: 'fileName is name',
			propB: ['fileName is name'],
			propC: {
				prop: 'fileName is name',
			},
		},
	});
});

test('extend rule settings', async () => {
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

	expect((document.nodeList[0] as MLDOMElement<any, any>).nodeName).toBe('span');
	expect((document.nodeList[1] as MLDOMElement<any, any>).nodeName).toBe('span');
	expect((document.nodeList[2] as MLDOMElement<any, any>).nodeName).toBe('div');
	expect((document.nodeList[3] as MLDOMElement<any, any>).nodeName).toBe('span');
	expect((document.nodeList[4] as MLDOMElement<any, any>).nodeName).toBe('span');
	expect((document.nodeList[5] as MLDOMElement<any, any>).nodeName).toBe('div');

	const ruleA = createRule({
		name: 'ruleA',
		defaultValue: 'foo',
		defaultOptions: null,
		async verify() {
			throw new Error();
		},
	});
	const ruleB = createRule({
		name: 'ruleB',
		defaultValue: 'bar',
		defaultOptions: null,
		async verify() {
			throw new Error();
		},
	});
	const ruleC = createRule({
		name: 'ruleC',
		defaultValue: 'buz',
		defaultOptions: null,
		async verify() {
			throw new Error();
		},
	});
	const ruleD = createRule({
		name: 'ruleD',
		defaultValue: 'fuz',
		defaultOptions: null,
		async verify() {
			throw new Error();
		},
	});
	const ruleE = createRule({
		name: 'ruleE',
		defaultValue: 'piyo',
		defaultOptions: null,
		async verify() {
			throw new Error();
		},
	});

	document.setRule(ruleA);
	const resultA = {
		disabled: false,
		reason: '456',
		severity: 'info',
		value: 'foo',
		option: null,
	};
	expect(document.nodeList[0].rule).toStrictEqual(resultA);
	expect(document.nodeList[1].rule).toStrictEqual(resultA);
	expect(document.nodeList[2].rule).not.toStrictEqual(resultA);
	expect(document.nodeList[3].rule).toStrictEqual(resultA);
	expect(document.nodeList[4].rule).toStrictEqual(resultA);
	expect(document.nodeList[5].rule).not.toStrictEqual(resultA);

	document.setRule(ruleB);
	const resultB = {
		disabled: false,
		reason: '456',
		severity: 'info',
		value: 'bar',
		option: null,
	};
	expect(document.nodeList[0].rule).toStrictEqual(resultB);
	expect(document.nodeList[1].rule).toStrictEqual(resultB);
	expect(document.nodeList[2].rule).toStrictEqual(resultB);
	expect(document.nodeList[3].rule).toStrictEqual(resultB);
	expect(document.nodeList[4].rule).toStrictEqual(resultB);
	expect(document.nodeList[5].rule).toStrictEqual(resultB);

	document.setRule(ruleC);
	const resultC = {
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'buz',
		option: null,
	};
	expect(document.nodeList[0].rule).toStrictEqual(resultC);
	expect(document.nodeList[1].rule).toStrictEqual(resultC);
	expect(document.nodeList[2].rule).not.toStrictEqual(resultC);
	expect(document.nodeList[3].rule).toStrictEqual(resultC);
	expect(document.nodeList[4].rule).toStrictEqual(resultC);
	expect(document.nodeList[5].rule).not.toStrictEqual(resultC);

	document.setRule(ruleD);
	const resultD = {
		disabled: true,
		reason: undefined,
		severity: 'error',
		value: 'fuz',
		option: null,
	};
	expect(document.nodeList[0].rule).toStrictEqual(resultD);
	expect(document.nodeList[1].rule).toStrictEqual(resultD);
	expect(document.nodeList[2].rule).not.toStrictEqual(resultC);
	expect(document.nodeList[3].rule).toStrictEqual(resultD);
	expect(document.nodeList[4].rule).toStrictEqual(resultD);
	expect(document.nodeList[5].rule).not.toStrictEqual(resultC);

	document.setRule(ruleE);
	const resultE = {
		disabled: true,
		reason: undefined,
		severity: 'error',
		value: 'piyo',
		option: null,
	};
	expect(document.nodeList[0].rule).toStrictEqual(resultE);
	expect(document.nodeList[1].rule).toStrictEqual(resultE);
	expect(document.nodeList[2].rule).not.toStrictEqual(resultE);
	expect(document.nodeList[3].rule).toStrictEqual(resultE);
	expect(document.nodeList[4].rule).toStrictEqual(resultE);
	expect(document.nodeList[5].rule).not.toStrictEqual(resultE);
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
			parser: require('@markuplint/pug-parser'),
		},
	);
	const ruleA = createRule({
		name: 'ruleA',
		defaultValue: 'foo',
		defaultOptions: null,
		async verify() {
			throw new Error();
		},
	});
	document.setRule(ruleA);
	expect(document.nodeList[0].rule).toStrictEqual({
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'global',
		option: null,
	});
	expect(document.nodeList[1].rule).toStrictEqual({
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'Card',
		option: null,
	});
	expect(document.nodeList[2].rule).toStrictEqual({
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'Card',
		option: null,
	});
	expect(document.nodeList[4].rule).toStrictEqual({
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'Card',
		option: null,
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
			parser: require('@markuplint/jsx-parser'),
		},
	);
	const ruleA = createRule({
		name: 'ruleA',
		defaultValue: 'foo',
		defaultOptions: null,
		async verify() {
			throw new Error();
		},
	});
	document.setRule(ruleA);
	expect(document.nodeList[0].rule).toStrictEqual({
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'global',
		option: null,
	});
	expect(document.nodeList[2].rule).toStrictEqual({
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'Card',
		option: null,
	});
	expect(document.nodeList[4].rule).toStrictEqual({
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'Card',
		option: null,
	});
	expect(document.nodeList[7].rule).toStrictEqual({
		disabled: false,
		reason: undefined,
		severity: 'error',
		value: 'Card',
		option: null,
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
	// @ts-ignore
	const htmlRules = html.nodeList.map(node => node.nodeName + ':' + node.rules['ruleA']);
	expect(htmlRules).toStrictEqual(['x-a:global', 'x-b:a', 'x-c:b', 'x-c:b', 'x-b:a', 'x-a:global']);

	const pug = createTestDocument('x-a: x-b: x-c', {
		config,
		parser: require('@markuplint/pug-parser'),
	});
	// @ts-ignore
	const pugRules = pug.nodeList.map(node => node.nodeName + ':' + node.rules['ruleA']);
	expect(pugRules).toStrictEqual(['x-a:global', 'x-b:a', 'x-c:b']);
});
