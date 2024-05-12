import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('Attributes', () => {
	test('hx-on:*', () => {
		const doc = parse(`
<div
	hx-on:click
	hx-on:htmx:abort
	hx-on::after-on-load
	hx-on:htmx:xhr:abort
></div>`);
		expect(nodeListToDebugMaps(doc.nodeList, true)).toStrictEqual([
			'[1:1]>[2:1](0,1)#text: ⏎',
			'[2:1]>[7:2](1,82)div: <div⏎→hx-on:click⏎→hx-on:htmx:abort⏎→hx-on::after-on-load⏎→hx-on:htmx:xhr:abort⏎>',
			'[3:2]>[3:13](7,18)onclick: hx-on:click',
			'  [2:5]>[3:2](5,7)bN: ⏎→',
			'  [3:2]>[3:13](7,18)name: hx-on:click',
			'  [3:13]>[3:13](18,18)bE: ',
			'  [3:13]>[3:13](18,18)equal: ',
			'  [3:13]>[3:13](18,18)aE: ',
			'  [3:13]>[3:13](18,18)sQ: ',
			'  [3:13]>[3:13](18,18)value: ',
			'  [3:13]>[3:13](18,18)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: true',
			'  potentialName: onclick',
			'[4:2]>[4:18](20,36)hx-on:htmx:abort: hx-on:htmx:abort',
			'  [3:13]>[4:2](18,20)bN: ⏎→',
			'  [4:2]>[4:18](20,36)name: hx-on:htmx:abort',
			'  [4:18]>[4:18](36,36)bE: ',
			'  [4:18]>[4:18](36,36)equal: ',
			'  [4:18]>[4:18](36,36)aE: ',
			'  [4:18]>[4:18](36,36)sQ: ',
			'  [4:18]>[4:18](36,36)value: ',
			'  [4:18]>[4:18](36,36)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: true',
			'  potentialName: hx-on:htmx:abort',
			'[5:2]>[5:22](38,58)hx-on:htmx:after-on-load: hx-on::after-on-load',
			'  [4:18]>[5:2](36,38)bN: ⏎→',
			'  [5:2]>[5:22](38,58)name: hx-on::after-on-load',
			'  [5:22]>[5:22](58,58)bE: ',
			'  [5:22]>[5:22](58,58)equal: ',
			'  [5:22]>[5:22](58,58)aE: ',
			'  [5:22]>[5:22](58,58)sQ: ',
			'  [5:22]>[5:22](58,58)value: ',
			'  [5:22]>[5:22](58,58)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: true',
			'  potentialName: hx-on:htmx:after-on-load',
			'[6:2]>[6:22](60,80)hx-on:htmx:xhr:abort: hx-on:htmx:xhr:abort',
			'  [5:22]>[6:2](58,60)bN: ⏎→',
			'  [6:2]>[6:22](60,80)name: hx-on:htmx:xhr:abort',
			'  [6:22]>[6:22](80,80)bE: ',
			'  [6:22]>[6:22](80,80)equal: ',
			'  [6:22]>[6:22](80,80)aE: ',
			'  [6:22]>[6:22](80,80)sQ: ',
			'  [6:22]>[6:22](80,80)value: ',
			'  [6:22]>[6:22](80,80)eQ: ',
			'  isDirective: true',
			'  isDynamicValue: true',
			'  potentialName: hx-on:htmx:xhr:abort',
			'[7:2]>[7:8](82,88)div: </div>',
		]);
	});
});
