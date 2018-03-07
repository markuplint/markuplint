"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'indentation',
    defaultLevel: 'warning',
    defaultValue: 2,
    defaultOptions: {
        alignment: true,
        'indent-nested-nodes': true,
    },
    async verify(document, messages) {
        const reports = [];
        // tslint:disable-next-line:cyclomatic-complexity
        await document.walkOn('Node', async (node) => {
            // console.log(node.raw, node.rule);
            if (node.rule.disabled) {
                return;
            }
            if (node.indentation) {
                /**
                 * Validate indent type and length.
                 */
                if (node.indentation.type !== 'none') {
                    const ms = node.rule.severity === 'error' ? 'must' : 'should';
                    let spec = null;
                    if (node.rule.value === 'tab' && node.indentation.type !== 'tab') {
                        spec = 'tab';
                    }
                    else if (typeof node.rule.value === 'number' && node.indentation.type !== 'space') {
                        spec = 'space';
                    }
                    else if (typeof node.rule.value === 'number' && node.indentation.type === 'space' && node.indentation.width % node.rule.value) {
                        spec = messages(`{0} width spaces`, `${node.rule.value}`);
                    }
                    if (spec) {
                        const message = messages(`{0} ${ms} be {1}`, 'Indentation', spec);
                        reports.push({
                            severity: node.rule.severity,
                            message,
                            line: node.indentation.line,
                            col: 1,
                            raw: node.indentation.raw,
                        });
                        return;
                    }
                }
                /**
                 * Validate nested parent-children nodes.
                 */
                const nested = node.rule.option['indent-nested-nodes'];
                if (!nested) {
                    return;
                }
                if (node.parentNode) {
                    const parent = node.syntaxicalParentNode;
                    // console.log(node.raw, parent);
                    if (parent && parent.indentation) {
                        const parentIndentWidth = parent.indentation.width;
                        const childIndentWidth = node.indentation.width;
                        const expectedWidth = node.rule.value === 'tab' ? 1 : node.rule.value;
                        const diff = childIndentWidth - parentIndentWidth;
                        // console.log({ parentIndentWidth, childIndentWidth, exportWidth });
                        if (nested === 'never') {
                            if (diff !== 0) {
                                const message = messages(diff < 1 ? `インデントを下げてください` : `インデントを上げてください`);
                                reports.push({
                                    severity: node.rule.severity,
                                    message,
                                    line: node.indentation.line,
                                    col: 1,
                                    raw: node.indentation.raw,
                                });
                            }
                        }
                        else {
                            if (diff !== expectedWidth) {
                                const message = messages(diff < 1 ? `インデントを下げてください` : `インデントを上げてください`);
                                reports.push({
                                    severity: node.rule.severity,
                                    message,
                                    line: node.indentation.line,
                                    col: 1,
                                    raw: node.indentation.raw,
                                });
                            }
                        }
                    }
                }
            }
        });
        await document.walkOn('EndTag', async (endTag) => {
            if (!endTag.rule || !endTag.rule.option) {
                return;
            }
            if (!endTag.rule.option.alignment) {
                return;
            }
            /**
             * Validate alignment end-tags.
             */
            if (endTag.indentation && endTag.startTagNode.indentation) {
                // console.log(
                // 	endTag.startTagNode.indentation,
                // 	endTag.indentation,
                // );
                const endTagIndentationWidth = endTag.indentation.width;
                const startTagIndentationWidth = endTag.startTagNode.indentation.width;
                if (startTagIndentationWidth !== endTagIndentationWidth) {
                    const message = messages(`終了タグと開始タグのインデント位置が揃っていません。`);
                    reports.push({
                        severity: endTag.rule.severity,
                        message,
                        line: endTag.indentation.line,
                        col: 1,
                        raw: endTag.indentation.raw,
                    });
                }
            }
        });
        return reports;
    },
    async fix(document) {
        /**
         * Validate indent type and length.
         */
        document.syncWalkOn('Node', (node) => {
            if (!node.rule.disabled && node.indentation) {
                if (node.indentation.type !== 'none') {
                    const spec = node.rule.value === 'tab' ? '\t' : ' ';
                    const baseWidth = node.rule.value === 'tab' ? 4 : node.rule.value;
                    let width;
                    if (node.rule.value === 'tab') {
                        width = node.indentation.type === 'tab' ? node.indentation.width : Math.ceil(node.indentation.width / baseWidth);
                    }
                    else {
                        width = node.indentation.type === 'tab' ? node.indentation.width * baseWidth : Math.ceil(node.indentation.width / baseWidth) * baseWidth;
                    }
                    const raw = node.indentation.raw;
                    const fixed = spec.repeat(width);
                    // console.log({spec, width});
                    if (raw !== fixed) {
                        // console.log('step1', {
                        // 	raw: space(raw),
                        // 	fix: space(fixed),
                        // });
                        node.indentation.fix(fixed);
                    }
                }
            }
        });
        await document.walkOn('Node', async (node) => {
            if (node.rule.disabled) {
                return;
            }
            if (node.indentation) {
                /**
                 * Validate nested parent-children nodes.
                 */
                const nested = node.rule.option['indent-nested-nodes'];
                if (!nested) {
                    return;
                }
                if (node.parentNode) {
                    const parent = node.syntaxicalParentNode;
                    // console.log(node.raw, parent);
                    if (parent && parent.indentation) {
                        const parentIndentWidth = parent.indentation.width;
                        const childIndentWidth = node.indentation.width;
                        const expectedWidth = node.rule.value === 'tab' ? 1 : node.rule.value;
                        const diff = childIndentWidth - parentIndentWidth;
                        // console.log({ parentIndentWidth, childIndentWidth, expectedWidth, diff });
                        if (nested === 'never') {
                            if (diff !== 0) {
                                // const message = messages(diff < 1 ? `インデントを下げてください` : `インデントを上げてください`);
                                const raw = node.indentation.raw;
                                const fixed = parent.indentation.raw;
                                // console.log('step2-A', {
                                // 	raw: space(raw),
                                // 	fix: space(fixed),
                                // });
                                node.indentation.fix(fixed);
                            }
                        }
                        else {
                            if (diff !== expectedWidth) {
                                // const message = messages(diff < 1 ? `インデントを下げてください` : `インデントを上げてください`);
                                const raw = node.indentation.raw;
                                const fixed = (node.rule.value === 'tab' ? '\t' : ' ').repeat(parentIndentWidth + expectedWidth);
                                // console.log('step2-B', {
                                // 	raw: space(raw),
                                // 	fix: space(fixed),
                                // });
                                node.indentation.fix(fixed);
                            }
                        }
                    }
                }
            }
        });
        /**
         * Validate alignment end-tags.
         */
        await document.walkOn('EndTag', async (endTag) => {
            if (!endTag.rule || !endTag.rule.option) {
                return;
            }
            if (!endTag.rule.option.alignment) {
                return;
            }
            if (endTag.indentation && endTag.startTagNode.indentation) {
                const endTagIndentationWidth = endTag.indentation.width;
                const startTagIndentationWidth = endTag.startTagNode.indentation.width;
                if (startTagIndentationWidth !== endTagIndentationWidth) {
                    const raw = endTag.indentation.raw;
                    const fixed = endTag.startTagNode.indentation.raw;
                    // console.log('step3', {
                    // 	raw: space(raw),
                    // 	fix: space(fixed),
                    // });
                    endTag.indentation.fix(fixed);
                }
            }
        });
    },
});
function space(str) {
    return str.replace(/ /g, ($0) => `•`).replace(/\t/g, ($0) => `→   `);
}
