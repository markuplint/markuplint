import { parse } from '@markuplint/html-parser';
import { convertRuleset } from '../';
import { Document } from './';

describe('create Document', () => {
	it('node count', async () => {
		const sourceCode = `<div>text</div>`;
		const ast = parse(sourceCode);
		const ruleset = convertRuleset({});
		const document = new Document(ast, ruleset);
		expect(document.nodeList.length).toBe(3);
	});
});
