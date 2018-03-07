"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Indentation {
    constructor(parentTextNode, raw, line) {
        this.node = parentTextNode;
        this.line = line;
        this._originRaw = raw;
        this._fixed = raw;
    }
    get type() {
        const raw = this._fixed;
        return raw === '' ? 'none' : /^\t+$/.test(raw) ? 'tab' : /^[^\t]+$/.test(raw) ? 'space' : 'mixed';
    }
    get width() {
        return this._fixed.length;
    }
    get raw() {
        return this._fixed;
    }
    fix(raw) {
        const current = this._fixed;
        this._fixed = raw;
        if (this.node) {
            const node = this.node;
            const line = node.line;
            const lines = node.raw.split(/\r?\n/);
            const index = this.line - line;
            if (lines[index] != null) {
                lines[index] = lines[index].replace(current, this._fixed);
            }
            // console.log({ori: this._originRaw, raw, line, lines, index});
            node.fix(lines.join('\n'));
        }
    }
}
exports.Indentation = Indentation;
