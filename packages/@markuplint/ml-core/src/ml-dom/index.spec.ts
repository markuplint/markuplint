import { createTestDocument, createTestElement, createTestNodeList } from '../test';
import { MLDOMElement } from './tokens';
import { createRule } from '../create-rule';

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
		rules: {
			ruleA: true,
			ruleB: true,
		},
		nodeRules: [
			{
				tagName: 'span',
				rules: {
					ruleA: false,
				},
			},
		],
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
