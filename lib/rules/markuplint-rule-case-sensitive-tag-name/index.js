"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const element_1 = __importDefault(require("../../dom/element"));
const end_tag_node_1 = __importDefault(require("../../dom/end-tag-node"));
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'case-sensitive-tag-name',
    defaultLevel: 'warning',
    defaultValue: 'lower',
    defaultOptions: null,
    async verify(document, messages) {
        const reports = [];
        await document.walk(async (node) => {
            if ((node instanceof element_1.default && node.namespaceURI === 'http://www.w3.org/1999/xhtml')
                ||
                    node instanceof end_tag_node_1.default) {
                const ms = node.rule.severity === 'error' ? 'must' : 'should';
                const deny = node.rule.value === 'lower' ? /[A-Z]/ : /[a-z]/;
                const message = messages(`{0} of {1} ${ms} be {2}`, 'Tag name', 'HTML', `${node.rule.value}case`);
                if (deny.test(node.nodeName)) {
                    reports.push({
                        severity: node.rule.severity,
                        message,
                        line: node.line,
                        col: node instanceof element_1.default
                            ?
                                node.col + 1 // remove "<" char.
                            :
                                node.col + 2,
                        raw: node.nodeName,
                    });
                }
            }
        });
        return reports;
    },
});
