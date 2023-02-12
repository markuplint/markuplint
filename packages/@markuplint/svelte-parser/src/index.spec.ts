// @ts-nocheck

import type { MLASTElement } from '@markuplint/ml-ast';

import { attributesToDebugMaps, nodeListToDebugMaps } from '@markuplint/parser-utils';

import { parse } from './';

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
			'[1:6]>[1:16](5,15)IfBlock: {#if␣bool}',
			'[1:16]>[1:20](15,19)#text: true',
			'[1:20]>[1:27](19,26)ElseBlock: {:else}',
			'[1:27]>[1:32](26,31)#text: false',
			'[1:32]>[1:37](31,36)IfBlock: {/if}',
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
			'[2:2]>[3:3](7,42)IfBlock: {#if␣porridge.temperature␣>␣100}⏎→→',
			'[3:3]>[3:6](42,45)p: <p>',
			'[3:6]>[3:14](45,53)#text: too␣hot!',
			'[3:14]>[3:18](53,57)p: </p>',
			'[3:18]>[4:38](57,95)ElseBlock: ⏎→{:else␣if␣80␣>␣porridge.temperature}',
			'[4:38]>[5:3](95,98)IfBlock: ⏎→→',
			'[5:3]>[5:6](98,101)p: <p>',
			'[5:6]>[5:15](101,110)#text: too␣cold!',
			'[5:15]>[5:19](110,114)p: </p>',
			'[5:19]>[6:9](114,123)ElseBlock: ⏎→{:else}',
			'[6:9]>[7:3](123,126)#text: ⏎→→',
			'[7:3]>[7:6](126,129)p: <p>',
			'[7:6]>[7:17](129,140)#text: just␣right!',
			'[7:17]>[7:21](140,144)p: </p>',
			'[7:21]>[8:2](144,146)#text: ⏎→',
			'[8:2]>[8:7](146,151)IfBlock: {/if}',
			'[8:7]>[9:1](151,152)#text: ⏎',
			'[9:1]>[9:7](152,158)div: </div>',
		]);
	});

	test('each statement', () => {
		const r = parse('{#each expression as name}...{/each}');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:27](0,26)EachBlock: {#each␣expression␣as␣name}',
			'[1:27]>[1:30](26,29)#text: ...',
			'[1:30]>[1:37](29,36)EachBlock: {/each}',
		]);
	});

	test('each else statement', () => {
		const r = parse('{#each expression as name}...{:else}...{/each}');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:27](0,26)EachBlock: {#each␣expression␣as␣name}',
			'[1:27]>[1:30](26,29)#text: ...',
			'[1:30]>[1:37](29,36)ElseBlock: {:else}',
			'[1:37]>[1:40](36,39)#text: ...',
			'[1:40]>[1:47](39,46)EachBlock: {/each}',
		]);
	});

	test('deep each statement', () => {
		const r = parse('<ul>{#each a as b}<li>{#each c as d}{/each}</li>{/each}</ul>');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:5](0,4)ul: <ul>',
			'[1:5]>[1:19](4,18)EachBlock: {#each␣a␣as␣b}',
			'[1:19]>[1:23](18,22)li: <li>',
			'[1:23]>[1:37](22,36)EachBlock: {#each␣c␣as␣d}',
			'[1:37]>[1:44](36,43)EachBlock: {/each}',
			'[1:44]>[1:49](43,48)li: </li>',
			'[1:49]>[1:56](48,55)EachBlock: {/each}',
			'[1:56]>[1:61](55,60)ul: </ul>',
		]);
	});

	test('await then catch statement', () => {
		const r = parse('{#await expression}...{:then name}...{:catch name}...{/await}');
		const map = nodeListToDebugMaps(r.nodeList);
		expect(map).toStrictEqual([
			'[1:1]>[1:20](0,19)PendingBlock: {#await␣expression}',
			'[1:20]>[1:23](19,22)#text: ...',
			'[1:23]>[1:35](22,34)ThenBlock: {:then␣name}',
			'[1:35]>[1:38](34,37)#text: ...',
			'[1:38]>[1:51](37,50)CatchBlock: {:catch␣name}',
			'[1:51]>[1:54](50,53)#text: ...',
			'[1:54]>[1:62](53,61)AwaitBlock: {/await}',
		]);
	});

	test('attribute', () => {
		const r = parse('<el attr-name="value" />');
		const attr = attributesToDebugMaps((r.nodeList[0] as MLASTElement).attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:22](4,21)attr-name: attr-name="value"',
				'  [1:5]>[1:5](4,4)bN: ',
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
		const attr = attributesToDebugMaps((r.nodeList[0] as MLASTElement).attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:36](4,35)on:eventname: on:eventname={␣`abc${def}ghi`␣}',
				'  [1:5]>[1:5](4,4)bN: ',
				'  [1:5]>[1:17](4,16)name: on:eventname',
				'  [1:17]>[1:17](16,16)bE: ',
				'  [1:17]>[1:18](16,17)equal: =',
				'  [1:18]>[1:18](17,17)aE: ',
				'  [1:18]>[1:19](17,18)sQ: {',
				'  [1:19]>[1:35](18,34)value: ␣`abc${def}ghi`␣',
				'  [1:35]>[1:36](34,35)eQ: }',
				'  isDirective: true',
				'  isDynamicValue: false',
			],
		]);
	});

	test('event directive 2', () => {
		const r = parse('<el on:eventname|modifiers = {handler} />');
		const attr = attributesToDebugMaps((r.nodeList[0] as MLASTElement).attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:39](4,38)on:eventname|modifiers: on:eventname|modifiers␣=␣{handler}',
				'  [1:5]>[1:5](4,4)bN: ',
				'  [1:5]>[1:27](4,26)name: on:eventname|modifiers',
				'  [1:27]>[1:28](26,27)bE: ␣',
				'  [1:28]>[1:29](27,28)equal: =',
				'  [1:29]>[1:30](28,29)aE: ␣',
				'  [1:30]>[1:31](29,30)sQ: {',
				'  [1:31]>[1:38](30,37)value: handler',
				'  [1:38]>[1:39](37,38)eQ: }',
				'  isDirective: true',
				'  isDynamicValue: false',
			],
		]);
	});

	test('event directive 3', () => {
		const r = parse('<el on:eventname />');
		const attr = attributesToDebugMaps((r.nodeList[0] as MLASTElement).attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:17](4,16)on:eventname: on:eventname',
				'  [1:5]>[1:5](4,4)bN: ',
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
		const attr = attributesToDebugMaps((r.nodeList[0] as MLASTElement).attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:29](4,28)property: bind:property={variable}',
				'  [1:5]>[1:5](4,4)bN: ',
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
		const attr = attributesToDebugMaps((r.nodeList[0] as MLASTElement).attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:18](4,17)property: bind:property',
				'  [1:5]>[1:5](4,4)bN: ',
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
		const attrs = (r.nodeList[0] as MLASTElement).attributes;
		expect(attrs.every(attr => (attr.type === 'html-attr' ? attr.isDirective : false))).toBe(true);
	});

	test('multiple class directives', () => {
		const r = parse('<el class:selected="{isSelected}" class:focused="{isFocused}" />');
		const attr = attributesToDebugMaps((r.nodeList[0] as MLASTElement).attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:34](4,33)class: class:selected="{isSelected}"',
				'  [1:5]>[1:5](4,4)bN: ',
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
				'  [1:35]>[1:35](34,34)bN: ',
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
		const attr = attributesToDebugMaps((r.nodeList[0] as MLASTElement).attributes);
		expect(attr).toStrictEqual([
			[
				'[1:5]>[1:12](4,11)items: {items}',
				'  [1:5]>[1:5](4,4)bN: ',
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
		const attr = attributesToDebugMaps((r.nodeList[0] as MLASTElement).attributes);
		expect(attr).toStrictEqual([]);
		// @ts-ignore
		expect(r.nodeList[0].hasSpreadAttr).toBeTruthy();
	});

	test('namespace', () => {
		const doc = parse('<div><svg><text /></svg></div>');
		expect(doc.nodeList[0].nodeName).toBe('div');
		expect((doc.nodeList[0] as MLASTElement).namespace).toBe('http://www.w3.org/1999/xhtml');
		expect(doc.nodeList[1].nodeName).toBe('svg');
		expect((doc.nodeList[1] as MLASTElement).namespace).toBe('http://www.w3.org/2000/svg');
		expect(doc.nodeList[2].nodeName).toBe('text');
		expect((doc.nodeList[2] as MLASTElement).namespace).toBe('http://www.w3.org/2000/svg');
	});
});

describe('Issues', () => {
	test('#444', () => {
		parse(`<script lang="ts">
  let count: number = 0
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
			'[2:2]>[3:3](6,30)IfBlock: {#if␣cond␣===␣valueA}⏎→→',
			'[3:3]>[3:7](30,34)li: <li>',
			'[3:7]>[3:8](34,35)#text: A',
			'[3:8]>[3:13](35,40)li: </li>',
			'[3:13]>[4:28](40,68)ElseBlock: ⏎→{:else␣if␣cond␣===␣valueB}',
			'[4:28]>[5:3](68,71)IfBlock: ⏎→→',
			'[5:3]>[5:7](71,75)li: <li>',
			'[5:7]>[5:8](75,76)#text: B',
			'[5:8]>[5:13](76,81)li: </li>',
			'[5:13]>[6:2](81,83)#text: ⏎→',
			'[6:2]>[6:7](83,88)IfBlock: {/if}',
			'[6:7]>[7:1](88,89)#text: ⏎',
			'[7:1]>[7:6](89,94)ul: </ul>',
		]);

		expect(r.nodeList[12].raw).toBe('{/if}');
		// @ts-ignore
		expect(r.nodeList[0].childNodes[3].raw).toBe(r.nodeList[12].raw);
		// @ts-ignore
		expect(r.nodeList[0].childNodes[3].uuid).toBe(r.nodeList[12].uuid);
	});
});
