// tslint:disable:no-magic-numbers
import path from 'path';

import c from 'cli-color';

import Node from '../dom/node';
import parser from '../dom/parser/';

import readTextFile from '../util/read-text-file';

(async () => {

	const html = await readTextFile('src/test/003.html');
	const d = parser(html);

	// process.stdout.write(d.toDebugMap().join('\n'));
	const coloredNodes = d.list.map((n) => {
		if (n instanceof Node) {
			switch (n.nodeName) {
				case '#doctype': return c.bgBlue.black(n.raw);
				case '#ws': return c.bgWhite.black(n.raw);
				case '#invalid': return c.bgRed.white(n.raw);
				case '#text': return n.raw;
				case '#eof': return c.bgWhite.black(n.raw);
				case '#comment': return c.bgYellow.black(n.raw);
				default: return c.bgGreen.black(n.raw);
			}
		}
		return '';
	});

	const result = coloredNodes.map((s) => s.replace(/\t/g, '→').replace(/ /g, '␣')).join('');

	console.log(result);
})();
