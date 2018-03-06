"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// export interface Indentation {
// 	type: 'tab' | 'space' | 'mixed' | 'none';
// 	width: number;
// 	raw: string;
// 	line: number;
// }
class Indentation {
    constructor(parentTextNode, raw, line) {
        Indentation.set(this, raw);
        this.parentTextNode = parentTextNode;
        this.line = line;
        this._fix = raw;
    }
    static set(ind, raw) {
        ind.type = raw === '' ? 'none' : /^\t+$/.test(raw) ? 'tab' : /^[^\t]+$/.test(raw) ? 'space' : 'mixed',
            ind.width = raw.length;
        ind.raw = raw;
    }
    set fix(ind) {
        this._fix = ind;
        if (this.parentTextNode) {
            const node = this.parentTextNode;
            const line = node.line;
            const lines = node.fixed.split(/\r?\n/);
            const index = this.line - line;
            if (lines[index] != null) {
                lines[index] = lines[index].replace(this.raw, this._fix);
            }
            // console.log({line, lines, index});
            node.fixed = lines.join('\n');
        }
    }
    get fix() {
        return this._fix;
    }
}
exports.Indentation = Indentation;
