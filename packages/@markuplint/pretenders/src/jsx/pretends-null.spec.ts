import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { normalizePath } from '../import-resolver/resolve-module-file.js';

import { jsxScanner } from './index.js';

const DIR = path.resolve('/virtual', 'pretends-null');
const FILE = normalizePath(path.join(DIR, 'Component.tsx'));

function scan(jsDoc: string) {
	const source = `${jsDoc}\nexport function Component() {\n\treturn <div />;\n}`;
	return jsxScanner([FILE], { cwd: DIR, sources: new Map([[FILE, source]]) });
}

describe('`@pretends null` of the JSDoc of a component', () => {
	test.each([
		['a one-line comment', '/** @pretends null */'],
		['a multi-line comment', '/**\n * @pretends null\n */'],
		[
			'a multi-line comment with a description above the tag',
			'/**\n * Not a pretender.\n *\n * @pretends null\n */',
		],
		['a tag name in capitals', '/** @Pretends null */'],
		['CRLF line endings', '/**\r\n * @pretends null\r\n */'],
		['blanks around the comment', '/**   @pretends   null   */'],
		['another tag after it', '/**\n * @pretends null\n * @deprecated\n */'],
	])('opts the component out in %s', async (_, jsDoc) => {
		expect(await scan(jsDoc)).toStrictEqual([]);
	});

	test.each([
		['no JSDoc', ''],
		['a tag without a comment', '/** @pretends */'],
		['a comment that is more than `null`', '/** @pretends null for now */'],
		['a link in the comment', '/** @pretends {@link Other} */'],
		['another tag', '/** @deprecated null */'],
	])('does not opt the component out with %s', async (_, jsDoc) => {
		expect(await scan(jsDoc)).toMatchObject([{ localName: 'Component', as: { element: 'div' } }]);
	});
});
