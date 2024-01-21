import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('Tags', () => {
	test('nunjucks-block', () => {
		expect(parse('{% any %}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-block');
	});

	test('nunjucks-output', () => {
		expect(parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-output');
	});

	test('nunjucks-comment', () => {
		expect(parse('{# any #}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-comment');
	});
});

describe('Issues', () => {
	test('#1349', () => {
		expect(
			nodeListToDebugMaps(
				parse(
					`<tag1>
	<tag2>
		{% SYNTAX %}
		<tag3>
			{% SYNTAX %}
			<a class="{{ smm_class }} btn-smm-li">Text</a>
			{% SYNTAX %}
		</tag3>
		{% SYNTAX %}
	</tag2>
</tag1>`,
				).nodeList,
			),
		).toStrictEqual([
			'[1:1]>[1:7](0,6)tag1: <tag1>',
			'[1:7]>[2:2](6,8)#text: ⏎→',
			'[2:2]>[2:8](8,14)tag2: <tag2>',
			'[2:8]>[3:3](14,17)#text: ⏎→→',
			'[3:3]>[3:15](17,29)#ps:nunjucks-block: {%␣SYNTAX␣%}',
			'[3:15]>[4:3](29,32)#text: ⏎→→',
			'[4:3]>[4:9](32,38)tag3: <tag3>',
			'[4:9]>[5:4](38,42)#text: ⏎→→→',
			'[5:4]>[5:16](42,54)#ps:nunjucks-block: {%␣SYNTAX␣%}',
			'[5:16]>[6:4](54,58)#text: ⏎→→→',
			'[6:4]>[6:42](58,96)a: <a␣class="{{␣smm_class␣}}␣btn-smm-li">',
			'[6:42]>[6:46](96,100)#text: Text',
			'[6:46]>[6:50](100,104)a: </a>',
			'[6:50]>[7:4](104,108)#text: ⏎→→→',
			'[7:4]>[7:16](108,120)#ps:nunjucks-block: {%␣SYNTAX␣%}',
			'[7:16]>[8:3](120,123)#text: ⏎→→',
			'[8:3]>[8:10](123,130)tag3: </tag3>',
			'[8:10]>[9:3](130,133)#text: ⏎→→',
			'[9:3]>[9:15](133,145)#ps:nunjucks-block: {%␣SYNTAX␣%}',
			'[9:15]>[10:2](145,147)#text: ⏎→',
			'[10:2]>[10:9](147,154)tag2: </tag2>',
			'[10:9]>[11:1](154,155)#text: ⏎',
			'[11:1]>[11:8](155,162)tag1: </tag1>',
		]);
	});
});
