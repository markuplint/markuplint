import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { test, expect } from 'vitest';

import { parser } from './sveltekit-parser.js';

const parse = parser.parse.bind(parser);

test('app.html', () => {
	expect(
		nodeListToDebugMaps(
			parse(`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width" />
		<link rel="icon" href="%sveltekit.assets%/favicon.svg" />
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		%sveltekit.body%
	</body>
</html>
`).nodeList,
		),
	).toStrictEqual([
		'[1:1]>[1:16](0,15)#doctype: <!doctype␣html>',
		'[1:16]>[2:1](15,16)#text: ⏎',
		'[2:1]>[2:17](16,32)html: <html␣lang="en">',
		'[2:17]>[3:2](32,34)#text: ⏎→',
		'[3:2]>[3:8](34,40)head: <head>',
		'[3:8]>[4:3](40,43)#text: ⏎→→',
		'[4:3]>[4:27](43,67)meta: <meta␣charset="utf-8"␣/>',
		'[4:27]>[5:3](67,70)#text: ⏎→→',
		'[5:3]>[5:56](70,123)meta: <meta␣name="viewport"␣content="width=device-width"␣/>',
		'[5:56]>[6:3](123,126)#text: ⏎→→',
		'[6:3]>[6:60](126,183)link: <link␣rel="icon"␣href="%sveltekit.assets%/favicon.svg"␣/>',
		'[6:60]>[7:3](183,186)#text: ⏎→→',
		'[7:3]>[7:19](186,202)#ps:sveltekit-placeholder: %sveltekit.head%',
		'[7:19]>[8:2](202,204)#text: ⏎→',
		'[8:2]>[8:9](204,211)head: </head>',
		'[8:9]>[9:2](211,213)#text: ⏎→',
		'[9:2]>[9:44](213,255)body: <body␣data-sveltekit-preload-data="hover">',
		'[9:44]>[10:3](255,258)#text: ⏎→→',
		'[10:3]>[10:19](258,274)#ps:sveltekit-placeholder: %sveltekit.body%',
		'[10:19]>[11:2](274,276)#text: ⏎→',
		'[11:2]>[11:9](276,283)body: </body>',
		'[11:9]>[12:1](283,284)#text: ⏎',
		'[12:1]>[12:8](284,291)html: </html>',
		'[12:8]>[13:1](291,292)#text: ⏎',
	]);
});
