"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-magic-numbers
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const cli_color_1 = __importDefault(require("cli-color"));
const node_1 = __importDefault(require("../dom/node"));
const _1 = __importDefault(require("../parser/"));
const readFile = util_1.default.promisify(fs_1.default.readFile);
(async () => {
    const html = await readFile('src/test/003.html', 'utf-8');
    const d = _1.default(html);
    // process.stdout.write(d.toDebugMap().join('\n'));
    const coloredNodes = d.list.map((n) => {
        if (n instanceof node_1.default) {
            switch (n.nodeName) {
                case '#doctype': return cli_color_1.default.bgBlue.black(n.raw);
                case '#ws': return cli_color_1.default.bgWhite.black(n.raw);
                case '#invalid': return cli_color_1.default.bgRed.white(n.raw);
                case '#text': return n.raw;
                case '#eof': return cli_color_1.default.bgWhite.black(n.raw);
                case '#comment': return cli_color_1.default.bgYellow.black(n.raw);
                default: return cli_color_1.default.bgGreen.black(n.raw);
            }
        }
        return '';
    });
    const result = coloredNodes.map((s) => s.replace(/\t/g, '→').replace(/ /g, '␣')).join('');
    console.log(result);
})();
