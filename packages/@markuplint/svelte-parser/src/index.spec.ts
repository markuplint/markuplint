// @ts-nocheck

import { attributesToDebugMaps, nodeListToDebugMaps, nodeTreeDebugView } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('parser', () => {
	test('syntax error', () => {
		expect(() => {
			parse('<div></div\nattr>');
		}).toThrow('Expected >\n1: <div></div\n2: attr>\n   ^');
	});

	test('standard', () => {
		const r = parse('<div>text</div>');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:10](5,9)#text: text',
			'[1:10]>[1:16](9,15)div: </div>',
		]);
	});

	test('with script', () => {
		const r = parse(`<script>let i = 1;</script>

<div data-attr={i}>{i}</div>
	<span></span>`);
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:28](0,27)#ps:Script: <script>let␣i␣=␣1;</script>',
			'[1:28]>[3:1](27,29)#text: ⏎⏎',
			'[3:1]>[3:20](29,48)div: <div␣data-attr={i}>',
			'[3:20]>[3:23](48,51)#ps:MustacheTag: {i}',
			'[3:23]>[3:29](51,57)div: </div>',
			'[3:29]>[4:2](57,59)#text: ⏎→',
			'[4:2]>[4:8](59,65)span: <span>',
			'[4:8]>[4:15](65,72)span: </span>',
		]);
	});

	test('with script (complex order)', () => {
		const r = parse(`
<div>1</div>
<script>let i = 1;</script>
<div>2</div>
<style>div { display: none; }</style>
<div>3</div>
`);
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[2:1](0,1)#text: ⏎',
			'[2:1]>[2:6](1,6)div: <div>',
			'[2:6]>[2:7](6,7)#text: 1',
			'[2:7]>[2:13](7,13)div: </div>',
			'[2:13]>[3:1](13,14)#text: ⏎',
			'[3:1]>[3:28](14,41)#ps:Script: <script>let␣i␣=␣1;</script>',
			'[3:28]>[4:1](41,42)#text: ⏎',
			'[4:1]>[4:6](42,47)div: <div>',
			'[4:6]>[4:7](47,48)#text: 2',
			'[4:7]>[4:13](48,54)div: </div>',
			'[4:13]>[5:1](54,55)#text: ⏎',
			'[5:1]>[5:38](55,92)#ps:Style: <style>div␣{␣display:␣none;␣}</style>',
			'[5:38]>[6:1](92,93)#text: ⏎',
			'[6:1]>[6:6](93,98)div: <div>',
			'[6:6]>[6:7](98,99)#text: 3',
			'[6:7]>[6:13](99,105)div: </div>',
			'[6:13]>[7:1](105,106)#text: ⏎',
		]);
	});

	test('variable', () => {
		const r = parse('<div>{variable}</div>');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:16](5,15)#ps:MustacheTag: {variable}',
			'[1:16]>[1:22](15,21)div: </div>',
		]);
	});

	test('if statement', () => {
		const r = parse('<div>{#if bool}true{:else}false{/if}</div>');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[1:16](5,15)#ps:if: {#if␣bool}',
			'[1:16]>[1:20](15,19)#text: true',
			'[1:20]>[1:27](19,26)#ps:else: {:else}',
			'[1:27]>[1:32](26,31)#text: false',
			'[1:32]>[1:37](31,36)#ps:/if: {/if}',
			'[1:37]>[1:43](36,42)div: </div>',
		]);
	});

	test('else if statement', () => {
		const r = parse(`<div>
	{#if porridge.temperature > 100}
		<p>too hot!</p>
	{:else if 80 > porridge.temperature}
		<p>too cold!</p>
	{:else}
		<p>just right!</p>
	{/if}
</div>`);
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[2:2](5,7)#text: ⏎→',
			'[2:2]>[3:3](7,42)#ps:if: {#if␣porridge.temperature␣>␣100}⏎→→',
			'[3:3]>[3:6](42,45)p: <p>',
			'[3:6]>[3:14](45,53)#text: too␣hot!',
			'[3:14]>[3:18](53,57)p: </p>',
			'[3:18]>[5:3](57,98)#ps:elseif: ⏎→{:else␣if␣80␣>␣porridge.temperature}⏎→→',
			'[5:3]>[5:6](98,101)p: <p>',
			'[5:6]>[5:15](101,110)#text: too␣cold!',
			'[5:15]>[5:19](110,114)p: </p>',
			'[5:19]>[7:3](114,126)#ps:else: ⏎→{:else}⏎→→',
			'[7:3]>[7:6](126,129)p: <p>',
			'[7:6]>[7:17](129,140)#text: just␣right!',
			'[7:17]>[7:21](140,144)p: </p>',
			'[7:21]>[8:7](144,151)#ps:/if: ⏎→{/if}',
			'[8:7]>[9:1](151,152)#text: ⏎',
			'[9:1]>[9:7](152,158)div: </div>',
		]);
	});

	test('each statement', () => {
		const r = parse('{#each expression as name}...{/each}');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:27](0,26)#ps:each: {#each␣expression␣as␣name}',
			'[1:27]>[1:30](26,29)#text: ...',
			'[1:30]>[1:37](29,36)#ps:/each: {/each}',
		]);
	});

	test('each statement (empty)', () => {
		const r = parse('{#each expression as name}{/each}');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual(['[1:1]>[1:34](0,33)#ps:each: {#each␣expression␣as␣name}{/each}']);
	});

	test('each else statement', () => {
		const r = parse('{#each expression as name}...{:else}...{/each}');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:27](0,26)#ps:each: {#each␣expression␣as␣name}',
			'[1:27]>[1:30](26,29)#text: ...',
			'[1:30]>[1:37](29,36)#ps:else: {:else}',
			'[1:37]>[1:40](36,39)#text: ...',
			'[1:40]>[1:47](39,46)#ps:/each: {/each}',
		]);
	});

	test('deep each statement', () => {
		const r = parse('<ul>{#each a as b}<li>{#each c as d}{/each}</li>{/each}</ul>');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:5](0,4)ul: <ul>',
			'[1:5]>[1:19](4,18)#ps:each: {#each␣a␣as␣b}',
			'[1:19]>[1:23](18,22)li: <li>',
			'[1:23]>[1:44](22,43)#ps:each: {#each␣c␣as␣d}{/each}',
			'[1:44]>[1:49](43,48)li: </li>',
			'[1:49]>[1:56](48,55)#ps:/each: {/each}',
			'[1:56]>[1:61](55,60)ul: </ul>',
		]);
	});

	test('await then catch statement', () => {
		const r = parse('{#await expression}...{:then name}...{:catch name}...{/await}');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:20](0,19)#ps:await: {#await␣expression}',
			'[1:20]>[1:23](19,22)#text: ...',
			'[1:23]>[1:35](22,34)#ps:then: {:then␣name}',
			'[1:35]>[1:38](34,37)#text: ...',
			'[1:38]>[1:51](37,50)#ps:catch: {:catch␣name}',
			'[1:51]>[1:54](50,53)#text: ...',
			'[1:54]>[1:62](53,61)#ps:/await: {/await}',
		]);
	});

	test('attribute', () => {
		const r = parse('<el attr-name="value" />');
		const attr = attributesToDebugMaps(r.nodeList[0].attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:22](4,21)attr-name: attr-name="value"',
				'  [1:4]>[1:5](3,4)bN: ␣',
				'  [1:5]>[1:14](4,13)name: attr-name',
				'  [1:14]>[1:14](13,13)bE: ',
				'  [1:14]>[1:15](13,14)equal: =',
				'  [1:15]>[1:15](14,14)aE: ',
				'  [1:15]>[1:16](14,15)sQ: "',
				'  [1:16]>[1:21](15,20)value: value',
				'  [1:21]>[1:22](20,21)eQ: "',
				'  isDirective: false',
				'  isDynamicValue: false',
			],
		]);
	});

	test('event directive', () => {
		const r = parse('<el on:eventname={ `abc${def}ghi` } />');
		const attr = attributesToDebugMaps(r.nodeList[0].attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:36](4,35)on:eventname: on:eventname={␣`abc${def}ghi`␣}',
				'  [1:4]>[1:5](3,4)bN: ␣',
				'  [1:5]>[1:17](4,16)name: on:eventname',
				'  [1:17]>[1:17](16,16)bE: ',
				'  [1:17]>[1:18](16,17)equal: =',
				'  [1:18]>[1:18](17,17)aE: ',
				'  [1:18]>[1:19](17,18)sQ: {',
				'  [1:19]>[1:35](18,34)value: ␣`abc${def}ghi`␣',
				'  [1:35]>[1:36](34,35)eQ: }',
				'  isDirective: true',
				'  isDynamicValue: true',
			],
		]);
	});

	test('event directive 2', () => {
		const r = parse('<el on:eventname|modifiers = {handler} />');
		const attr = attributesToDebugMaps(r.nodeList[0].attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:39](4,38)on:eventname|modifiers: on:eventname|modifiers␣=␣{handler}',
				'  [1:4]>[1:5](3,4)bN: ␣',
				'  [1:5]>[1:27](4,26)name: on:eventname|modifiers',
				'  [1:27]>[1:28](26,27)bE: ␣',
				'  [1:28]>[1:29](27,28)equal: =',
				'  [1:29]>[1:30](28,29)aE: ␣',
				'  [1:30]>[1:31](29,30)sQ: {',
				'  [1:31]>[1:38](30,37)value: handler',
				'  [1:38]>[1:39](37,38)eQ: }',
				'  isDirective: true',
				'  isDynamicValue: true',
			],
		]);
	});

	test('event directive 3', () => {
		const r = parse('<el on:eventname />');
		const attr = attributesToDebugMaps(r.nodeList[0].attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:17](4,16)on:eventname: on:eventname',
				'  [1:4]>[1:5](3,4)bN: ␣',
				'  [1:5]>[1:17](4,16)name: on:eventname',
				'  [1:17]>[1:17](16,16)bE: ',
				'  [1:17]>[1:17](16,16)equal: ',
				'  [1:17]>[1:17](16,16)aE: ',
				'  [1:17]>[1:17](16,16)sQ: ',
				'  [1:17]>[1:17](16,16)value: ',
				'  [1:17]>[1:17](16,16)eQ: ',
				'  isDirective: true',
				'  isDynamicValue: false',
			],
		]);
	});

	test('bind directive', () => {
		const r = parse('<el bind:property={variable} />');
		const attr = attributesToDebugMaps(r.nodeList[0].attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:29](4,28)property: bind:property={variable}',
				'  [1:4]>[1:5](3,4)bN: ␣',
				'  [1:5]>[1:18](4,17)name: bind:property',
				'  [1:18]>[1:18](17,17)bE: ',
				'  [1:18]>[1:19](17,18)equal: =',
				'  [1:19]>[1:19](18,18)aE: ',
				'  [1:19]>[1:20](18,19)sQ: {',
				'  [1:20]>[1:28](19,27)value: variable',
				'  [1:28]>[1:29](27,28)eQ: }',
				'  isDirective: false',
				'  isDynamicValue: true',
				'  potentialName: property',
			],
		]);
	});

	test('bind directive 2', () => {
		const r = parse('<el bind:property />');
		const attr = attributesToDebugMaps(r.nodeList[0].attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:18](4,17)property: bind:property',
				'  [1:4]>[1:5](3,4)bN: ␣',
				'  [1:5]>[1:18](4,17)name: bind:property',
				'  [1:18]>[1:18](17,17)bE: ',
				'  [1:18]>[1:18](17,17)equal: ',
				'  [1:18]>[1:18](17,17)aE: ',
				'  [1:18]>[1:18](17,17)sQ: ',
				'  [1:18]>[1:18](17,17)value: ',
				'  [1:18]>[1:18](17,17)eQ: ',
				'  isDirective: false',
				'  isDynamicValue: true',
				'  potentialName: property',
			],
		]);
	});

	test('other directives', () => {
		const r = parse(`<el
	class:name={value}
	use:action={parameters}
	transition:fn
	transition:fn2={params}
	transition:fn3|local
	transition:fn4|local={params}
	transition:fade="{{ duration: 2000 }}"
	in:whoosh
	in:fn
	in:fn2={params}
	in:fn3|local
	in:fn4|local={params}
	out:fn
	out:fn2={params}
	out:fn3|local
	out:fn4|local={params}
	animate:name
	animate:name2={params}
/>`);
		const attrs = r.nodeList[0].attributes;
		expect(attrs.every(attr => (attr.type === 'attr' ? attr.isDirective : false))).toBe(true);
	});

	test('multiple class directives', () => {
		const r = parse('<el class:selected="{isSelected}" class:focused="{isFocused}" />');
		const attr = attributesToDebugMaps(r.nodeList[0].attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:34](4,33)class: class:selected="{isSelected}"',
				'  [1:4]>[1:5](3,4)bN: ␣',
				'  [1:5]>[1:19](4,18)name: class:selected',
				'  [1:19]>[1:19](18,18)bE: ',
				'  [1:19]>[1:20](18,19)equal: =',
				'  [1:20]>[1:20](19,19)aE: ',
				'  [1:20]>[1:21](19,20)sQ: "',
				'  [1:21]>[1:33](20,32)value: {isSelected}',
				'  [1:33]>[1:34](32,33)eQ: "',
				'  isDirective: true',
				'  isDynamicValue: true',
				'  potentialName: class',
			],
			[
				'[1:35]>[1:62](34,61)class: class:focused="{isFocused}"',
				'  [1:34]>[1:35](33,34)bN: ␣',
				'  [1:35]>[1:48](34,47)name: class:focused',
				'  [1:48]>[1:48](47,47)bE: ',
				'  [1:48]>[1:49](47,48)equal: =',
				'  [1:49]>[1:49](48,48)aE: ',
				'  [1:49]>[1:50](48,49)sQ: "',
				'  [1:50]>[1:61](49,60)value: {isFocused}',
				'  [1:61]>[1:62](60,61)eQ: "',
				'  isDirective: true',
				'  isDynamicValue: true',
				'  potentialName: class',
			],
		]);
	});

	test('shorthand', () => {
		const r = parse('<el {items} />');
		const attr = attributesToDebugMaps(r.nodeList[0].attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:12](4,11)items: {items}',
				'  [1:4]>[1:5](3,4)bN: ␣',
				'  [1:5]>[1:5](4,4)name: ',
				'  [1:5]>[1:5](4,4)bE: ',
				'  [1:5]>[1:5](4,4)equal: ',
				'  [1:5]>[1:5](4,4)aE: ',
				'  [1:5]>[1:6](4,5)sQ: {',
				'  [1:6]>[1:11](5,10)value: items',
				'  [1:11]>[1:12](10,11)eQ: }',
				'  isDirective: false',
				'  isDynamicValue: true',
				'  potentialName: items',
			],
		]);
	});

	test('spread attributes', () => {
		const r = parse('<el { ... attrs} />');
		const attr = attributesToDebugMaps(r.nodeList[0].attributes);
		expect(attr).toStrictEqual([
			[
				//
				'[1:5]>[1:17](4,16)#spread: {␣...␣attrs}',
				'  #spread: {␣...␣attrs}',
			],
		]);
	});

	test('namespace', () => {
		const doc = parse('<div><svg><text /></svg></div>');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect(doc.nodeList[0].namespace).toBe('http://www.w3.org/1999/xhtml');
		expect(doc.nodeList[1].nodeName).toBe('svg');
		expect(doc.nodeList[1].namespace).toBe('http://www.w3.org/2000/svg');
		expect(doc.nodeList[2].nodeName).toBe('text');
		expect(doc.nodeList[2].namespace).toBe('http://www.w3.org/2000/svg');
	});

	test('CRLF', () => {
		const r = parse(
			`<div
>{
#if
bool
}true{/if}</div
>`.replaceAll('\n', '\r\n'),
		);
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[2:2](0,7)div: <div␣⏎>',
			'[2:2]>[5:2](7,22)#ps:if: {␣⏎#if␣⏎bool␣⏎}',
			'[5:2]>[5:6](22,26)#text: true',
			'[5:6]>[5:11](26,31)#ps:/if: {/if}',
			'[5:11]>[6:2](31,39)div: </div␣⏎>',
		]);
	});
});

describe('Issues', () => {
	test('#444', () => {
		parse(`<script lang="ts">
  let count= 0
  const increment = () => {
    count += 1
  }
</script>

<button on:click={increment}>
  Clicks: {count}
</button>`);
		// No Error is success
	});

	test('#503', () => {
		const r = parse(`<nav>
	<ul>
		<li>
			<p>test</p>
			<ul>
				<li>
					<p>test</p>
					<ul>
						<li>test</li>
					</ul>
				</li>
				<li>test</li>
			</ul>
		</li>
	</ul>
</nav>`);
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)nav: <nav>',
			'[1:6]>[2:2](5,7)#text: ⏎→',
			'[2:2]>[2:6](7,11)ul: <ul>',
			'[2:6]>[3:3](11,14)#text: ⏎→→',
			'[3:3]>[3:7](14,18)li: <li>',
			'[3:7]>[4:4](18,22)#text: ⏎→→→',
			'[4:4]>[4:7](22,25)p: <p>',
			'[4:7]>[4:11](25,29)#text: test',
			'[4:11]>[4:15](29,33)p: </p>',
			'[4:15]>[5:4](33,37)#text: ⏎→→→',
			'[5:4]>[5:8](37,41)ul: <ul>',
			'[5:8]>[6:5](41,46)#text: ⏎→→→→',
			'[6:5]>[6:9](46,50)li: <li>',
			'[6:9]>[7:6](50,56)#text: ⏎→→→→→',
			'[7:6]>[7:9](56,59)p: <p>',
			'[7:9]>[7:13](59,63)#text: test',
			'[7:13]>[7:17](63,67)p: </p>',
			'[7:17]>[8:6](67,73)#text: ⏎→→→→→',
			'[8:6]>[8:10](73,77)ul: <ul>',
			'[8:10]>[9:7](77,84)#text: ⏎→→→→→→',
			'[9:7]>[9:11](84,88)li: <li>',
			'[9:11]>[9:15](88,92)#text: test',
			'[9:15]>[9:20](92,97)li: </li>',
			'[9:20]>[10:6](97,103)#text: ⏎→→→→→',
			'[10:6]>[10:11](103,108)ul: </ul>',
			'[10:11]>[11:5](108,113)#text: ⏎→→→→',
			'[11:5]>[11:10](113,118)li: </li>',
			'[11:10]>[12:5](118,123)#text: ⏎→→→→',
			'[12:5]>[12:9](123,127)li: <li>',
			'[12:9]>[12:13](127,131)#text: test',
			'[12:13]>[12:18](131,136)li: </li>',
			'[12:18]>[13:4](136,140)#text: ⏎→→→',
			'[13:4]>[13:9](140,145)ul: </ul>',
			'[13:9]>[14:3](145,148)#text: ⏎→→',
			'[14:3]>[14:8](148,153)li: </li>',
			'[14:8]>[15:2](153,155)#text: ⏎→',
			'[15:2]>[15:7](155,160)ul: </ul>',
			'[15:7]>[16:1](160,161)#text: ⏎',
			'[16:1]>[16:7](161,167)nav: </nav>',
		]);
	});

	test('#698', () => {
		const r = parse(`<ul>
	{#if cond === valueA}
		<li>A</li>
	{:else if cond === valueB}
		<li>B</li>
	{/if}
</ul>`);
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:5](0,4)ul: <ul>',
			'[1:5]>[2:2](4,6)#text: ⏎→',
			'[2:2]>[3:3](6,30)#ps:if: {#if␣cond␣===␣valueA}⏎→→',
			'[3:3]>[3:7](30,34)li: <li>',
			'[3:7]>[3:8](34,35)#text: A',
			'[3:8]>[3:13](35,40)li: </li>',
			'[3:13]>[5:3](40,71)#ps:elseif: ⏎→{:else␣if␣cond␣===␣valueB}⏎→→',
			'[5:3]>[5:7](71,75)li: <li>',
			'[5:7]>[5:8](75,76)#text: B',
			'[5:8]>[5:13](76,81)li: </li>',
			'[5:13]>[6:7](81,88)#ps:/if: ⏎→{/if}',
			'[6:7]>[7:1](88,89)#text: ⏎',
			'[7:1]>[7:6](89,94)ul: </ul>',
		]);

		expect(r.nodeList[0].childNodes[3].raw).toBe('\n\t{/if}');
		expect(r.nodeList[10].raw).toBe('\n\t{/if}');
		expect(r.nodeList[0].childNodes[3].raw).toBe(r.nodeList[10].raw);
		expect(r.nodeList[0].childNodes[3].uuid).toBe(r.nodeList[10].uuid);
	});

	test('#991', () => {
		const r = parse(`<CustomElement>
	<div>Evaluation doesn't work</div>
</CustomElement>`);
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:16](0,15)CustomElement: <CustomElement>',
			'[1:16]>[2:2](15,17)#text: ⏎→',
			'[2:2]>[2:7](17,22)div: <div>',
			"[2:7]>[2:30](22,45)#text: Evaluation␣doesn't␣work",
			'[2:30]>[2:36](45,51)div: </div>',
			'[2:36]>[3:1](51,52)#text: ⏎',
			'[3:1]>[3:17](52,68)CustomElement: </CustomElement>',
		]);
	});

	test('#991-2', () => {
		const r = parse('<div id={uid()}></div>');
		const map = nodeListToDebugMaps(r.nodeList, true);
		expect(map).toStrictEqual([
			'[1:1]>[1:17](0,16)div: <div␣id={uid()}>',
			'[1:6]>[1:16](5,15)id: id={uid()}',
			'  [1:5]>[1:6](4,5)bN: ␣',
			'  [1:6]>[1:8](5,7)name: id',
			'  [1:8]>[1:8](7,7)bE: ',
			'  [1:8]>[1:9](7,8)equal: =',
			'  [1:9]>[1:9](8,8)aE: ',
			'  [1:9]>[1:10](8,9)sQ: {',
			'  [1:10]>[1:15](9,14)value: uid()',
			'  [1:15]>[1:16](14,15)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[1:17]>[1:23](16,22)div: </div>',
		]);
	});

	test('#991-3', () => {
		const r = parse('<div>\n<!-- It is a comment node -->\n</div>');
		const map = nodeListToDebugMaps(r.nodeList, true);
		expect(map).toStrictEqual([
			'[1:1]>[1:6](0,5)div: <div>',
			'[1:6]>[2:1](5,6)#text: ⏎',
			'[2:1]>[2:30](6,35)#comment: <!--␣It␣is␣a␣comment␣node␣-->',
			'[2:30]>[3:1](35,36)#text: ⏎',
			'[3:1]>[3:7](36,42)div: </div>',
		]);
	});

	describe('#1321 whitespaces and line breaks in block token', () => {
		test('if else', () => {
			const r = parse('{\n\t#if cond\n}...{\n\t:else\n}...{\n\t/if\n}');
			const map = nodeListToDebugMaps(r.nodeList, true);
			expect(map).toStrictEqual([
				'[1:1]>[3:2](0,13)#ps:if: {⏎→#if␣cond⏎}',
				'[3:2]>[3:5](13,16)#text: ...',
				'[3:5]>[5:2](16,26)#ps:else: {⏎→:else⏎}',
				'[5:2]>[5:5](26,29)#text: ...',
				'[5:5]>[7:2](29,37)#ps:/if: {⏎→/if⏎}',
			]);
		});
		test('each', () => {
			const r = parse('{\n\t#each expression as name\n}...{\n\t/each\n}');
			const map = nodeListToDebugMaps(r.nodeList, true);
			expect(map).toStrictEqual([
				'[1:1]>[3:2](0,29)#ps:each: {⏎→#each␣expression␣as␣name⏎}',
				'[3:2]>[3:5](29,32)#text: ...',
				'[3:5]>[5:2](32,42)#ps:/each: {⏎→/each⏎}',
			]);
		});
		test('await', () => {
			const r = parse('{\n\t#await expression\n}...{\n\t:then name\n}...{\n\t:catch name\n}...{\n\t/await\n}');
			const map = nodeListToDebugMaps(r.nodeList, true);
			expect(map).toStrictEqual([
				'[1:1]>[3:2](0,22)#ps:await: {⏎→#await␣expression⏎}',
				'[3:2]>[3:5](22,25)#text: ...',
				'[3:5]>[5:2](25,40)#ps:then: {⏎→:then␣name⏎}',
				'[5:2]>[5:5](40,43)#text: ...',
				'[5:5]>[7:2](43,59)#ps:catch: {⏎→:catch␣name⏎}',
				'[7:2]>[7:5](59,62)#text: ...',
				'[7:5]>[9:2](62,73)#ps:/await: {⏎→/await⏎}',
			]);
		});
		test('key', () => {
			const r = parse('{\n\t#key expression\n}...{\n\t/key\n}');
			const map = nodeListToDebugMaps(r.nodeList, true);
			expect(map).toStrictEqual([
				'[1:1]>[3:2](0,20)#ps:key: {⏎→#key␣expression⏎}',
				'[3:2]>[3:5](20,23)#text: ...',
				'[3:5]>[5:2](23,32)#ps:/key: {⏎→/key⏎}',
			]);
		});
	});

	test('#1286', () => {
		const ast = parse(`{#each list as item, i (\`\${i}-\${i}\`)}
	<div>{item}</div>
{/each}`);
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[2:2](0,39)#ps:each: {#each␣list␣as␣item,␣i␣(`${i}-${i}`)}⏎→',
			'[2:2]>[2:7](39,44)div: <div>',
			'[2:7]>[2:13](44,50)#ps:MustacheTag: {item}',
			'[2:13]>[2:19](50,56)div: </div>',
			'[2:19]>[3:1](56,57)#text: ⏎',
			'[3:1]>[3:8](57,64)#ps:/each: {/each}',
		]);
	});

	test('#1364', () => {
		const ast = parse('<a href={`https://${host}`}></a>');
		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			'[1:1]>[1:29](0,28)a: <a␣href={`https://${host}`}>',
			'[1:4]>[1:28](3,27)href: href={`https://${host}`}',
			'  [1:3]>[1:4](2,3)bN: ␣',
			'  [1:4]>[1:8](3,7)name: href',
			'  [1:8]>[1:8](7,7)bE: ',
			'  [1:8]>[1:9](7,8)equal: =',
			'  [1:9]>[1:9](8,8)aE: ',
			'  [1:9]>[1:10](8,9)sQ: {',
			'  [1:10]>[1:27](9,26)value: `https://${host}`',
			'  [1:27]>[1:28](26,27)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[1:29]>[1:33](28,32)a: </a>',
		]);
	});

	test('#1432', () => {
		expect(nodeListToDebugMaps(parse('<div style={{ a: b }}></div>').nodeList, true)).toStrictEqual([
			'[1:1]>[1:23](0,22)div: <div␣style={{␣a:␣b␣}}>',
			'[1:6]>[1:22](5,21)style: style={{␣a:␣b␣}}',
			'  [1:5]>[1:6](4,5)bN: ␣',
			'  [1:6]>[1:11](5,10)name: style',
			'  [1:11]>[1:11](10,10)bE: ',
			'  [1:11]>[1:12](10,11)equal: =',
			'  [1:12]>[1:12](11,11)aE: ',
			'  [1:12]>[1:13](11,12)sQ: {',
			'  [1:13]>[1:21](12,20)value: {␣a:␣b␣}',
			'  [1:21]>[1:22](20,21)eQ: }',
			'  isDirective: false',
			'  isDynamicValue: true',
			'[1:23]>[1:29](22,28)div: </div>',
		]);
	});

	test('#1442', () => {
		const ast = parse(`<script>
	const type = 'c';
</script>

{#if type === 'a'}
	<a>a</a>
{:else if type === 'b'}
	<b>b</b>
{:else if type === 'c'}
	<c>
		{#if type === 'a'}
			<a>a</a>
		{:else if type === 'b'}
			<b>b</b>
		{:else}
			<e>e</e>
		{/if}
	</c>
{:else if type === 'd'}
	<d>d</d>
{:else}
	<e>e</e>
{/if}`);

		const map = nodeListToDebugMaps(ast.nodeList, true);
		expect(map).toEqual([
			"[1:1]>[3:10](0,37)#ps:Script: <script>⏎→const␣type␣=␣'c';⏎</script>",
			'[3:10]>[5:1](37,39)#text: ⏎⏎',
			"[5:1]>[6:2](39,59)#ps:if: {#if␣type␣===␣'a'}⏎→",
			'[6:2]>[6:5](59,62)a: <a>',
			'[6:5]>[6:6](62,63)#text: a',
			'[6:6]>[6:10](63,67)a: </a>',
			"[6:10]>[8:2](67,93)#ps:elseif: ⏎{:else␣if␣type␣===␣'b'}⏎→",
			'[8:2]>[8:5](93,96)b: <b>',
			'[8:5]>[8:6](96,97)#text: b',
			'[8:6]>[8:10](97,101)b: </b>',
			"[8:10]>[10:2](101,127)#ps:elseif: ⏎{:else␣if␣type␣===␣'c'}⏎→",
			'[10:2]>[10:5](127,130)c: <c>',
			'[10:5]>[11:3](130,133)#text: ⏎→→',
			"[11:3]>[12:4](133,155)#ps:if: {#if␣type␣===␣'a'}⏎→→→",
			'[12:4]>[12:7](155,158)a: <a>',
			'[12:7]>[12:8](158,159)#text: a',
			'[12:8]>[12:12](159,163)a: </a>',
			"[12:12]>[14:4](163,193)#ps:elseif: ⏎→→{:else␣if␣type␣===␣'b'}⏎→→→",
			'[14:4]>[14:7](193,196)b: <b>',
			'[14:7]>[14:8](196,197)#text: b',
			'[14:8]>[14:12](197,201)b: </b>',
			'[14:12]>[16:4](201,215)#ps:else: ⏎→→{:else}⏎→→→',
			'[16:4]>[16:7](215,218)e: <e>',
			'[16:7]>[16:8](218,219)#text: e',
			'[16:8]>[16:12](219,223)e: </e>',
			'[16:12]>[17:8](223,231)#ps:/if: ⏎→→{/if}',
			'[17:8]>[18:2](231,233)#text: ⏎→',
			'[18:2]>[18:6](233,237)c: </c>',
			"[18:6]>[20:2](237,263)#ps:elseif: ⏎{:else␣if␣type␣===␣'d'}⏎→",
			'[20:2]>[20:5](263,266)d: <d>',
			'[20:5]>[20:6](266,267)#text: d',
			'[20:6]>[20:10](267,271)d: </d>',
			'[20:10]>[22:2](271,281)#ps:else: ⏎{:else}⏎→',
			'[22:2]>[22:5](281,284)e: <e>',
			'[22:5]>[22:6](284,285)#text: e',
			'[22:6]>[22:10](285,289)e: </e>',
			'[22:10]>[23:6](289,295)#ps:/if: ⏎{/if}',
		]);
		const tree = nodeTreeDebugView(ast.nodeList);
		expect(tree.map(n => n?.replaceAll(/[\da-z]{8}/g, '▓'.repeat(8)))).toEqual([
			'000: [▓▓▓▓▓▓▓▓] #ps:Script(▓▓▓▓▓▓▓▓)',
			'001: [▓▓▓▓▓▓▓▓] #text(▓▓▓▓▓▓▓▓)',
			'002: [▓▓▓▓▓▓▓▓] #ps:if(▓▓▓▓▓▓▓▓)',
			'                  ┗━ a(▓▓▓▓▓▓▓▓)',
			'                  ┗━ /a(▓▓▓▓▓▓▓▓)',
			'003: [▓▓▓▓▓▓▓▓]   a(▓▓▓▓▓▓▓▓) => /a(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #text(▓▓▓▓▓▓▓▓)',
			'004: [▓▓▓▓▓▓▓▓]     #text(▓▓▓▓▓▓▓▓)',
			'005: [▓▓▓▓▓▓▓▓]   /a(▓▓▓▓▓▓▓▓)',
			'006: [▓▓▓▓▓▓▓▓] #ps:elseif(▓▓▓▓▓▓▓▓)',
			'                  ┗━ b(▓▓▓▓▓▓▓▓)',
			'                  ┗━ /b(▓▓▓▓▓▓▓▓)',
			'007: [▓▓▓▓▓▓▓▓]   b(▓▓▓▓▓▓▓▓) => /b(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #text(▓▓▓▓▓▓▓▓)',
			'008: [▓▓▓▓▓▓▓▓]     #text(▓▓▓▓▓▓▓▓)',
			'009: [▓▓▓▓▓▓▓▓]   /b(▓▓▓▓▓▓▓▓)',
			'010: [▓▓▓▓▓▓▓▓] #ps:elseif(▓▓▓▓▓▓▓▓)',
			'                  ┗━ c(▓▓▓▓▓▓▓▓)',
			'                  ┗━ /c(▓▓▓▓▓▓▓▓)',
			'011: [▓▓▓▓▓▓▓▓]   c(▓▓▓▓▓▓▓▓) => /c(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #text(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #ps:if(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #ps:elseif(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #ps:else(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #ps:/if(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #text(▓▓▓▓▓▓▓▓)',
			'012: [▓▓▓▓▓▓▓▓]     #text(▓▓▓▓▓▓▓▓)',
			'013: [▓▓▓▓▓▓▓▓]     #ps:if(▓▓▓▓▓▓▓▓)',
			'                      ┗━ a(▓▓▓▓▓▓▓▓)',
			'                      ┗━ /a(▓▓▓▓▓▓▓▓)',
			'014: [▓▓▓▓▓▓▓▓]       a(▓▓▓▓▓▓▓▓) => /a(▓▓▓▓▓▓▓▓)',
			'                        ┗━ #text(▓▓▓▓▓▓▓▓)',
			'015: [▓▓▓▓▓▓▓▓]         #text(▓▓▓▓▓▓▓▓)',
			'016: [▓▓▓▓▓▓▓▓]       /a(▓▓▓▓▓▓▓▓)',
			'017: [▓▓▓▓▓▓▓▓]     #ps:elseif(▓▓▓▓▓▓▓▓)',
			'                      ┗━ b(▓▓▓▓▓▓▓▓)',
			'                      ┗━ /b(▓▓▓▓▓▓▓▓)',
			'018: [▓▓▓▓▓▓▓▓]       b(▓▓▓▓▓▓▓▓) => /b(▓▓▓▓▓▓▓▓)',
			'                        ┗━ #text(▓▓▓▓▓▓▓▓)',
			'019: [▓▓▓▓▓▓▓▓]         #text(▓▓▓▓▓▓▓▓)',
			'020: [▓▓▓▓▓▓▓▓]       /b(▓▓▓▓▓▓▓▓)',
			'021: [▓▓▓▓▓▓▓▓]     #ps:else(▓▓▓▓▓▓▓▓)',
			'                      ┗━ e(▓▓▓▓▓▓▓▓)',
			'                      ┗━ /e(▓▓▓▓▓▓▓▓)',
			'022: [▓▓▓▓▓▓▓▓]       e(▓▓▓▓▓▓▓▓) => /e(▓▓▓▓▓▓▓▓)',
			'                        ┗━ #text(▓▓▓▓▓▓▓▓)',
			'023: [▓▓▓▓▓▓▓▓]         #text(▓▓▓▓▓▓▓▓)',
			'024: [▓▓▓▓▓▓▓▓]       /e(▓▓▓▓▓▓▓▓)',
			'025: [▓▓▓▓▓▓▓▓]     #ps:/if(▓▓▓▓▓▓▓▓)',
			'026: [▓▓▓▓▓▓▓▓]     #text(▓▓▓▓▓▓▓▓)',
			'027: [▓▓▓▓▓▓▓▓]   /c(▓▓▓▓▓▓▓▓)',
			'028: [▓▓▓▓▓▓▓▓] #ps:elseif(▓▓▓▓▓▓▓▓)',
			'                  ┗━ d(▓▓▓▓▓▓▓▓)',
			'                  ┗━ /d(▓▓▓▓▓▓▓▓)',
			'029: [▓▓▓▓▓▓▓▓]   d(▓▓▓▓▓▓▓▓) => /d(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #text(▓▓▓▓▓▓▓▓)',
			'030: [▓▓▓▓▓▓▓▓]     #text(▓▓▓▓▓▓▓▓)',
			'031: [▓▓▓▓▓▓▓▓]   /d(▓▓▓▓▓▓▓▓)',
			'032: [▓▓▓▓▓▓▓▓] #ps:else(▓▓▓▓▓▓▓▓)',
			'                  ┗━ e(▓▓▓▓▓▓▓▓)',
			'                  ┗━ /e(▓▓▓▓▓▓▓▓)',
			'033: [▓▓▓▓▓▓▓▓]   e(▓▓▓▓▓▓▓▓) => /e(▓▓▓▓▓▓▓▓)',
			'                    ┗━ #text(▓▓▓▓▓▓▓▓)',
			'034: [▓▓▓▓▓▓▓▓]     #text(▓▓▓▓▓▓▓▓)',
			'035: [▓▓▓▓▓▓▓▓]   /e(▓▓▓▓▓▓▓▓)',
			'036: [▓▓▓▓▓▓▓▓] #ps:/if(▓▓▓▓▓▓▓▓)',
		]);
	});

	test('#1451', () => {
		expect(parse('<div></div>').nodeList[0].elementType).toBe('html');
		expect(parse('<x-div></x-div>').nodeList[0].elementType).toBe('web-component');
		expect(parse('<Div></Div>').nodeList[0].elementType).toBe('authored');
	});
});
