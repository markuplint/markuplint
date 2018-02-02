"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-magic-numbers
const fs = require("fs");
const util = require("util");
const c = require("cli-color");
const node_1 = require("../dom/node");
const _1 = require("../parser/");
const readFile = util.promisify(fs.readFile);
(async () => {
    const html = await readFile('src/test/003.html', 'utf-8');
    const d = _1.default(html);
    // process.stdout.write(d.toDebugMap().join('\n'));
    const coloredNodes = d.list.map((n) => {
        if (n instanceof node_1.default) {
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
