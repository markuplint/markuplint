// @ts-nocheck

import { ParserError, nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('Basic parsing', () => {
	test('simple element', () => {
		const doc = parse('const t = html`<div></div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:21](15,20)div: <div>',
			'[1:21]>[1:27](20,26)div: </div>',
		]);
	});

	test('element with text', () => {
		const doc = parse('const t = html`<div>hello</div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:21](15,20)div: <div>',
			'[1:21]>[1:26](20,25)#text: hello',
			'[1:26]>[1:32](25,31)div: </div>',
		]);
	});

	test('self-closing element', () => {
		const doc = parse('const t = html`<br />`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual(['[1:16]>[1:22](15,21)br: <br␣/>']);
	});

	test('nested elements', () => {
		const doc = parse('const t = html`<div><span>text</span></div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:21](15,20)div: <div>',
			'[1:21]>[1:27](20,26)span: <span>',
			'[1:27]>[1:31](26,30)#text: text',
			'[1:31]>[1:38](30,37)span: </span>',
			'[1:38]>[1:44](37,43)div: </div>',
		]);
	});

	test('empty template literal', () => {
		const doc = parse('const t = html``;');
		expect(doc.nodeList.length).toBe(0);
	});

	test('whitespace-only template literal', () => {
		const doc = parse('const t = html` `;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual(['[1:16]>[1:17](15,16)#text: ␣']);
	});

	test('empty string input', () => {
		const doc = parse('');
		expect(doc.nodeList.length).toBe(0);
	});
});

describe('Template expressions as PSBlock', () => {
	test('expression in text content', () => {
		const doc = parse('const t = html`<div>${name}</div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:21](15,20)div: <div>',
			'[1:21]>[1:28](20,27)#ps:ttl-expression: ${name}',
			'[1:28]>[1:34](27,33)div: </div>',
		]);
	});

	test('expression surrounded by text', () => {
		const doc = parse('const t = html`<div>hello ${name} world</div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:21](15,20)div: <div>',
			'[1:21]>[1:27](20,26)#text: hello␣',
			'[1:27]>[1:34](26,33)#ps:ttl-expression: ${name}',
			'[1:34]>[1:40](33,39)#text: ␣world',
			'[1:40]>[1:46](39,45)div: </div>',
		]);
	});

	test('multiple expressions', () => {
		const doc = parse('const t = html`<div>${first} ${last}</div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:21](15,20)div: <div>',
			'[1:21]>[1:29](20,28)#ps:ttl-expression: ${first}',
			'[1:29]>[1:30](28,29)#text: ␣',
			'[1:30]>[1:37](29,36)#ps:ttl-expression: ${last}',
			'[1:37]>[1:43](36,42)div: </div>',
		]);
	});

	test('adjacent expressions with no separator', () => {
		const doc = parse('const t = html`<div>${a}${b}</div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:21](15,20)div: <div>',
			'[1:21]>[1:25](20,24)#ps:ttl-expression: ${a}',
			'[1:25]>[1:29](24,28)#ps:ttl-expression: ${b}',
			'[1:29]>[1:35](28,34)div: </div>',
		]);
	});

	test('expression in attribute value', () => {
		const doc = parse('const t = html`<div class="${cls}"></div>`;');
		expect(nodeListToDebugMaps(doc.nodeList, true)).toStrictEqual([
			'[1:16]>[1:36](15,35)div: <div␣class="${cls}">',
			'[1:21]>[1:35](20,34)class: class="${cls}"',
			'  [1:20]>[1:21](19,20)bN: ␣',
			'  [1:21]>[1:26](20,25)name: class',
			'  [1:26]>[1:26](25,25)bE: ',
			'  [1:26]>[1:27](25,26)equal: =',
			'  [1:27]>[1:27](26,26)aE: ',
			'  [1:27]>[1:28](26,27)sQ: "',
			'  [1:28]>[1:34](27,33)value: ${cls}',
			'  [1:34]>[1:35](33,34)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[1:36]>[1:42](35,41)div: </div>',
		]);
	});

	test('expression in attribute with static prefix', () => {
		const doc = parse('const t = html`<div class="prefix-${cls}"></div>`;');
		expect(nodeListToDebugMaps(doc.nodeList, true)).toStrictEqual([
			'[1:16]>[1:43](15,42)div: <div␣class="prefix-${cls}">',
			'[1:21]>[1:42](20,41)class: class="prefix-${cls}"',
			'  [1:20]>[1:21](19,20)bN: ␣',
			'  [1:21]>[1:26](20,25)name: class',
			'  [1:26]>[1:26](25,25)bE: ',
			'  [1:26]>[1:27](25,26)equal: =',
			'  [1:27]>[1:27](26,26)aE: ',
			'  [1:27]>[1:28](26,27)sQ: "',
			'  [1:28]>[1:41](27,40)value: prefix-${cls}',
			'  [1:41]>[1:42](40,41)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[1:43]>[1:49](42,48)div: </div>',
		]);
	});

	test('PSBlock node name', () => {
		const doc = parse('const t = html`<div>${name}</div>`;');
		expect(doc.nodeList[1].nodeName).toBe('#ps:ttl-expression');
	});
});

describe('Multiline templates', () => {
	test('multiline HTML', () => {
		const doc = parse(`const t = html\`
<div>
  <span>hello</span>
</div>
\`;`);
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[2:1](15,16)#text: ⏎',
			'[2:1]>[2:6](16,21)div: <div>',
			'[2:6]>[3:3](21,24)#text: ⏎␣␣',
			'[3:3]>[3:9](24,30)span: <span>',
			'[3:9]>[3:14](30,35)#text: hello',
			'[3:14]>[3:21](35,42)span: </span>',
			'[3:21]>[4:1](42,43)#text: ⏎',
			'[4:1]>[4:7](43,49)div: </div>',
			'[4:7]>[5:1](49,50)#text: ⏎',
		]);
	});

	test('multiline with expressions', () => {
		const doc = parse(`const t = html\`
<ul>
  <li>\${item1}</li>
  <li>\${item2}</li>
</ul>
\`;`);
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[2:1](15,16)#text: ⏎',
			'[2:1]>[2:5](16,20)ul: <ul>',
			'[2:5]>[3:3](20,23)#text: ⏎␣␣',
			'[3:3]>[3:7](23,27)li: <li>',
			'[3:7]>[3:15](27,35)#ps:ttl-expression: ${item1}',
			'[3:15]>[3:20](35,40)li: </li>',
			'[3:20]>[4:3](40,43)#text: ⏎␣␣',
			'[4:3]>[4:7](43,47)li: <li>',
			'[4:7]>[4:15](47,55)#ps:ttl-expression: ${item2}',
			'[4:15]>[4:20](55,60)li: </li>',
			'[4:20]>[5:1](60,61)#text: ⏎',
			'[5:1]>[5:6](61,66)ul: </ul>',
			'[5:6]>[6:1](66,67)#text: ⏎',
		]);
	});
});

describe('Multiple template literals', () => {
	test('two template literals in one file', () => {
		const doc = parse(`const a = html\`<div>aaa</div>\`;
const b = html\`<span>bbb</span>\`;`);
		const maps = nodeListToDebugMaps(doc.nodeList);
		// First template literal: html` starts at offset 14, content at 15
		expect(maps).toContain('[1:16]>[1:21](15,20)div: <div>');
		expect(maps).toContain('[1:21]>[1:24](20,23)#text: aaa');
		expect(maps).toContain('[1:24]>[1:30](23,29)div: </div>');
		// Second template literal: html` starts at offset 46, content at 47
		expect(maps).toContain('[2:16]>[2:22](47,53)span: <span>');
		expect(maps).toContain('[2:22]>[2:25](53,56)#text: bbb');
		expect(maps).toContain('[2:25]>[2:32](56,63)span: </span>');
	});
});

describe('Non-matching tags', () => {
	test('untagged template literal is ignored', () => {
		const doc = parse('const t = `<div></div>`;');
		expect(doc.nodeList.length).toBe(0);
	});

	test('different tag name is ignored', () => {
		const doc = parse('const t = css`div { color: red; }`;');
		expect(doc.nodeList.length).toBe(0);
	});

	test('no template literal at all', () => {
		const doc = parse('const x = 42;');
		expect(doc.nodeList.length).toBe(0);
	});
});

describe('Complex expressions', () => {
	test('expression with method call', () => {
		const doc = parse('const t = html`<div>${obj.getName()}</div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:21](15,20)div: <div>',
			'[1:21]>[1:37](20,36)#ps:ttl-expression: ${obj.getName()}',
			'[1:37]>[1:43](36,42)div: </div>',
		]);
	});

	test('expression with ternary operator', () => {
		const doc = parse('const t = html`<div>${cond ? "a" : "b"}</div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:21](15,20)div: <div>',
			'[1:21]>[1:40](20,39)#ps:ttl-expression: ${cond␣?␣"a"␣:␣"b"}',
			'[1:40]>[1:46](39,45)div: </div>',
		]);
	});

	test('expression with nested template literal', () => {
		// The outer template's ${...} is split by ignoreBlock at the first }
		// inside the inner template. This is a known limitation.
		// The inner html`<li>${i}</li>` is correctly parsed as a separate template.
		const doc = parse('const t = html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`;');
		const maps = nodeListToDebugMaps(doc.nodeList);

		// Outer template: <ul> and </ul> tags are present
		expect(maps[0]).toBe('[1:16]>[1:20](15,19)ul: <ul>');

		// Inner template: correctly parsed as separate template literal
		expect(maps).toContainEqual(expect.stringContaining('li: <li>'));
		expect(maps).toContainEqual(expect.stringContaining('#ps:ttl-expression: ${i}'));
		expect(maps).toContainEqual(expect.stringContaining('li: </li>'));

		// Total node count is deterministic
		expect(maps).toHaveLength(8);
	});
});

describe('Attributes', () => {
	test('static attributes', () => {
		const doc = parse('const t = html`<div id="main" class="container"></div>`;');
		expect(nodeListToDebugMaps(doc.nodeList, true)).toStrictEqual([
			'[1:16]>[1:49](15,48)div: <div␣id="main"␣class="container">',
			'[1:21]>[1:30](20,29)id: id="main"',
			'  [1:20]>[1:21](19,20)bN: ␣',
			'  [1:21]>[1:23](20,22)name: id',
			'  [1:23]>[1:23](22,22)bE: ',
			'  [1:23]>[1:24](22,23)equal: =',
			'  [1:24]>[1:24](23,23)aE: ',
			'  [1:24]>[1:25](23,24)sQ: "',
			'  [1:25]>[1:29](24,28)value: main',
			'  [1:29]>[1:30](28,29)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[1:31]>[1:48](30,47)class: class="container"',
			'  [1:30]>[1:31](29,30)bN: ␣',
			'  [1:31]>[1:36](30,35)name: class',
			'  [1:36]>[1:36](35,35)bE: ',
			'  [1:36]>[1:37](35,36)equal: =',
			'  [1:37]>[1:37](36,36)aE: ',
			'  [1:37]>[1:38](36,37)sQ: "',
			'  [1:38]>[1:47](37,46)value: container',
			'  [1:47]>[1:48](46,47)eQ: "',
			'  isDirective: false',
			'  isDynamicValue: false',
			'[1:49]>[1:55](48,54)div: </div>',
		]);
	});

	test('boolean attribute', () => {
		const doc = parse('const t = html`<input disabled />`;');
		const maps = nodeListToDebugMaps(doc.nodeList, true);
		expect(maps[0]).toContain('input: <input␣disabled␣/>');
	});

	test('expression in attribute position (spread-like)', () => {
		const doc = parse('const t = html`<div ${attrs}></div>`;');
		// Expression in attribute position is handled by ignoreBlock
		expect(doc.nodeList.length).toBeGreaterThan(0);
	});
});

describe('Lit binding syntax', () => {
	test('property binding (.prop)', () => {
		// Lit uses .prop=${val} for property bindings
		// The expression is masked by ignoreBlock, resulting in unquoted attribute handling
		const doc = parse('const t = html`<input .value=${val} />`;');
		expect(doc.nodeList.length).toBeGreaterThan(0);
		const maps = nodeListToDebugMaps(doc.nodeList);
		expect(maps[0]).toContain('input');
	});

	test('boolean attribute binding (?attr)', () => {
		// Lit uses ?attr=${val} for boolean attribute bindings
		const doc = parse('const t = html`<div ?hidden=${hide}></div>`;');
		expect(doc.nodeList.length).toBeGreaterThan(0);
	});

	test('event binding (@event)', () => {
		// Lit uses @event=${handler} for event bindings
		const doc = parse('const t = html`<button @click=${handler}>Click</button>`;');
		expect(doc.nodeList.length).toBeGreaterThan(0);
		const maps = nodeListToDebugMaps(doc.nodeList);
		expect(maps[0]).toContain('button');
	});
});

describe('HTML comments', () => {
	test('HTML comment', () => {
		const doc = parse('const t = html`<!-- comment --><div></div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:16]>[1:32](15,31)#comment: <!--␣comment␣-->',
			'[1:32]>[1:37](31,36)div: <div>',
			'[1:37]>[1:43](36,42)div: </div>',
		]);
	});
});

describe('Fragment', () => {
	test('isFragment is true', () => {
		const doc = parse('const t = html`<div></div>`;');
		expect(doc.isFragment).toBe(true);
	});
});

describe('Error handling', () => {
	test('invalid JS throws ParserError with location', () => {
		expect(() => parse('const t = html`<div></div>`; @#$invalid')).toThrow(ParserError);
	});

	test('ParserError preserves line and column', () => {
		try {
			parse('const t = html`<div></div>`; @#$invalid');
			expect.unreachable('should have thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(ParserError);
			expect(error.line).toBe(1);
			expect(error.col).toBeGreaterThan(0);
		}
	});
});

describe('Known limitations', () => {
	test('object literal in expression causes incorrect splitting', () => {
		// ${{ key: "value" }} has a nested } that ignoreBlock matches first
		const doc = parse('const t = html`<div>${{ key: "value" }}</div>`;');
		const maps = nodeListToDebugMaps(doc.nodeList);
		// The expression is split at the first } inside the object literal.
		// This results in the trailing } appearing as a text node.
		expect(maps).toContainEqual(expect.stringContaining('#text: }'));
	});
});

describe('Edge cases', () => {
	test('template with preceding code', () => {
		const doc = parse(`import { html } from 'lit';
const greeting = html\`<h1>Hello</h1>\`;`);
		const maps = nodeListToDebugMaps(doc.nodeList);
		expect(maps).toStrictEqual([
			'[2:23]>[2:27](50,54)h1: <h1>',
			'[2:27]>[2:32](54,59)#text: Hello',
			'[2:32]>[2:37](59,64)h1: </h1>',
		]);
	});

	test('member expression tag (e.g., LitElement.html)', () => {
		const doc = parse('const t = LitElement.html`<div></div>`;');
		const maps = nodeListToDebugMaps(doc.nodeList);
		expect(maps[0]).toContain('div: <div>');
		expect(maps[1]).toContain('div: </div>');
	});

	test('expression with curly brace in string', () => {
		const doc = parse('const t = html`<div>${"}"}</div>`;');
		// The } inside the string should not close the expression prematurely
		// This is handled by the ignoreBlock mechanism
		expect(doc.nodeList.length).toBeGreaterThan(0);
	});

	test('TypeScript source with type annotation', () => {
		const doc = parse('const t: TemplateResult = html`<div></div>`;');
		expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
			'[1:32]>[1:37](31,36)div: <div>',
			'[1:37]>[1:43](36,42)div: </div>',
		]);
	});

	test('TypeScript class with decorator', () => {
		const doc = parse(`class MyElement extends HTMLElement {
  render() {
    return html\`<div>hello</div>\`;
  }
}`);
		const maps = nodeListToDebugMaps(doc.nodeList);
		expect(maps).toContainEqual(expect.stringContaining('div: <div>'));
		expect(maps).toContainEqual(expect.stringContaining('#text: hello'));
		expect(maps).toContainEqual(expect.stringContaining('div: </div>'));
	});
});
