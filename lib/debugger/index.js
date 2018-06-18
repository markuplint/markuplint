"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli_color_1 = __importDefault(require("cli-color"));
const node_1 = __importDefault(require("../dom/node"));
const parser_1 = __importDefault(require("../dom/parser"));
const read_text_file_1 = __importDefault(require("../util/read-text-file"));
(async () => {
    const html = await read_text_file_1.default('src/test/003.html');
    const d = parser_1.default(html);
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
