"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
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
            if (!node.rule || node.rule.disabled) {
                return;
            }
            if (node.indentation) {
                /**
                 * Validate tab type and length.
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
                        const exportWidth = node.rule.value === 'tab' ? 1 : node.rule.value;
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
                            if (diff !== exportWidth) {
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
});
