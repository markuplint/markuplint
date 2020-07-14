import { Document } from './';
import { convertRuleset } from '../';
import { dummySchemas } from './debug-utils';
import { parse } from '@markuplint/html-parser';

test('node count', async () => {
	const sourceCode = '<div>text</div>';
	const ast = parse(sourceCode);
	const ruleset = convertRuleset({});
	const document = new Document(ast, ruleset, dummySchemas());
	expect(document.nodeList.length).toBe(3);
});

test('raw', async () => {
	const sourceCode = '<div>text</div>';
	const ast = parse(sourceCode);
	const ruleset = convertRuleset({});
	const document = new Document(ast, ruleset, dummySchemas());
	expect(document.nodeList[0].raw).toBe('<div>');
	expect(document.nodeList[1].raw).toBe('text');
	expect(document.nodeList[2].raw).toBe('</div>');
});

test('raw', async () => {
	const sourceCode = `
<div>
	text
</div>`;
	const ast = parse(sourceCode);
	const ruleset = convertRuleset({});
	const document = new Document(ast, ruleset, dummySchemas());
	expect(document.nodeList[0].raw).toBe('\n');
	expect(document.nodeList[1].raw).toBe('<div>');
	expect(document.nodeList[2].raw).toBe('\n\ttext\n');
	expect(document.nodeList[3].raw).toBe('</div>');
});

test('raw', async () => {
	const sourceCode = `
    <div>
        text
    </div>`;
	const ast = parse(sourceCode);
	const ruleset = convertRuleset({});
	const document = new Document(ast, ruleset, dummySchemas());
	expect(document.nodeList[0].raw).toBe('\n    ');
	expect(document.nodeList[1].raw).toBe('<div>');
	expect(document.nodeList[2].raw).toBe('\n        text\n    ');
	expect(document.nodeList[3].raw).toBe('</div>');
	expect(document.nodeList[0].prevToken).toBe(null);
	expect(document.nodeList[1].prevToken!.raw).toBe('\n    ');
	expect(document.nodeList[2].prevToken!.raw).toBe('<div>');
	expect(document.nodeList[3].prevToken!.raw).toBe('\n        text\n    ');
	expect(document.nodeList[1].prevToken!.uuid).toBe(document.nodeList[0].uuid);
	expect(document.nodeList[2].prevToken!.uuid).toBe(document.nodeList[1].uuid);
	expect(document.nodeList[3].prevToken!.uuid).toBe(document.nodeList[2].uuid);
	expect(document.nodeList[0].indentation).toBe(null);
	expect(document.nodeList[1].indentation!.width).toBe(4);
	expect(document.nodeList[2].indentation!.width).toBe(8);
	expect(document.nodeList[3].indentation!.width).toBe(4);
});

test('raw', async () => {
	const sourceCode = `
    <div>
        <span>text</span>
    </div>`;
	const ast = parse(sourceCode);
	const ruleset = convertRuleset({});
	const document = new Document(ast, ruleset, dummySchemas());
	expect(document.nodeList[0].raw).toBe('\n    ');
	expect(document.nodeList[1].raw).toBe('<div>');
	expect(document.nodeList[2].raw).toBe('\n        ');
	expect(document.nodeList[3].raw).toBe('<span>');
	expect(document.nodeList[4].raw).toBe('text');
	expect(document.nodeList[5].raw).toBe('</span>');
	expect(document.nodeList[6].raw).toBe('\n    ');
	expect(document.nodeList[7].raw).toBe('</div>');
	expect(document.nodeList[0].indentation!).toBe(null);
	expect(document.nodeList[1].indentation!.width).toBe(4);
	expect(document.nodeList[2].indentation!).toBe(null);
	expect(document.nodeList[3].indentation!.width).toBe(8);
	expect(document.nodeList[4].indentation!).toBe(null);
	expect(document.nodeList[5].indentation!).toBe(null);
	expect(document.nodeList[6].indentation!).toBe(null);
	expect(document.nodeList[7].indentation!.width).toBe(4);
});

test('raw', async () => {
	const sourceCode = `
<div>
	<span>text</span>
</div>`;
	const ast = parse(sourceCode);
	const ruleset = convertRuleset({});
	const document = new Document(ast, ruleset, dummySchemas());
	expect(document.nodeList[0].raw).toBe('\n');
	expect(document.nodeList[1].raw).toBe('<div>');
	expect(document.nodeList[2].raw).toBe('\n\t');
	expect(document.nodeList[3].raw).toBe('<span>');
	expect(document.nodeList[4].raw).toBe('text');
	expect(document.nodeList[5].raw).toBe('</span>');
	expect(document.nodeList[6].raw).toBe('\n');
	expect(document.nodeList[7].raw).toBe('</div>');
	expect(document.nodeList[0].indentation!).toBe(null);
	expect(document.nodeList[1].indentation!.width).toBe(0);
	expect(document.nodeList[2].indentation!).toBe(null);
	expect(document.nodeList[3].indentation!.width).toBe(1);
	expect(document.nodeList[4].indentation!).toBe(null);
	expect(document.nodeList[5].indentation!).toBe(null);
	expect(document.nodeList[6].indentation!).toBe(null);
	expect(document.nodeList[7].indentation!.width).toBe(0);
});
