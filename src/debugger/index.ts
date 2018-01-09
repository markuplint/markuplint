// tslint:disable:no-magic-numbers
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import * as c from 'cli-color';

import parser, { Node } from '../parser/';

const readFile = util.promisify(fs.readFile);

(async () => {

	const html = await readFile('src/test/003.html', 'utf-8');
	const d = parser(html);

	// process.stdout.write(d.toDebugMap().join('\n'));
	const coloredNodes = d.list.map((n) => {
		if (n instanceof Node) {
			switch (n.nodeName) {
				case '#doctype': return c.bgBlue.black(n.raw);
				case '#ws': return c.bgWhite.black(n.raw);
				case '#invalid': return c.bgBlack.white(n.raw);
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
