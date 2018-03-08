"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'attr-equal-space-after',
    defaultLevel: 'warning',
    defaultValue: 'never',
    defaultOptions: null,
    async verify(document, messages) {
        const reports = [];
        const message = messages('error');
        document.syncWalkOn('Element', (node) => {
            for (const attr of node.attributes) {
                if (!attr.equal) {
                    continue;
                }
                const hasSpace = !!attr.spacesAfterEqual.raw;
                const hasLineBreak = /\r?\n/.test(attr.spacesAfterEqual.raw);
                let isBad = false;
                switch (node.rule.value) {
                    case 'always': {
                        isBad = !hasSpace;
                        break;
                    }
                    case 'never': {
                        isBad = hasSpace;
                        break;
                    }
                    case 'always-single-line': {
                        // or 'no-newline'
                        isBad = !hasSpace || hasLineBreak;
                        break;
                    }
                    case 'never-single-line': {
                        isBad = hasSpace && !hasLineBreak;
                        break;
                    }
                }
                if (isBad) {
                    reports.push({
                        severity: node.rule.severity,
                        level: node.rule.severity,
                        message: node.rule.value,
                        line: attr.spacesBeforeEqual.line,
                        col: attr.spacesBeforeEqual.col,
                        raw: attr.spacesBeforeEqual.raw + attr.equal.raw + attr.spacesAfterEqual.raw,
                    });
                }
            }
        });
        return reports;
    },
    async fix(document) {
        document.syncWalkOn('Element', (node) => {
            for (const attr of node.attributes) {
                if (!attr.equal) {
                    continue;
                }
                const hasSpace = !!attr.spacesAfterEqual.raw;
                const hasLineBreak = /\r?\n/.test(attr.spacesAfterEqual.raw);
                switch (node.rule.value) {
                    case 'always': {
                        if (!hasSpace) {
                            attr.spacesAfterEqual.fix(' ');
                        }
                        break;
                    }
                    case 'never': {
                        attr.spacesAfterEqual.fix('');
                        break;
                    }
                    case 'always-single-line': {
                        // or 'no-newline'
                        if (!hasSpace || hasLineBreak) {
                            attr.spacesAfterEqual.fix(' ');
                        }
                        break;
                    }
                    case 'never-single-line': {
                        if (hasSpace && !hasLineBreak) {
                            attr.spacesAfterEqual.fix('');
                        }
                        break;
                    }
                }
            }
        });
    },
});
