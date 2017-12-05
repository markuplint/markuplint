"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
/**
 * `VerifyPermittedContents`
 *
 * *Core rule*
 */
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'permitted-contents';
    }
    verify(document, config, ruleset) {
        const reports = [];
        if (ruleset && ruleset.nodeRules) {
            for (const nodeRule of ruleset.nodeRules) {
                if (nodeRule.nodeType === '#root') {
                    if (nodeRule.permittedContent) {
                        reports.push(...checkPermittedContent(nodeRule.permittedContent, document.root.childNodes, nodeRule.nodeType));
                    }
                }
                document.walk((node) => {
                    if (node instanceof parser_1.Element && node.nodeName === nodeRule.nodeType) {
                        if (nodeRule.permittedContent) {
                            reports.push(...checkPermittedContent(nodeRule.permittedContent, node.childNodes, nodeRule.nodeType));
                        }
                    }
                });
            }
        }
        return reports;
    }
}
exports.default = default_1;
function checkPermittedContent(permittedContents, nodes, parentName) {
    const reports = [];
    for (const permittedContent of permittedContents) {
        const nodeName = permittedContent[0];
        const options = permittedContent[1];
        if (options && options.required) {
            let counter = 0;
            for (const node of nodes) {
                if (node.nodeName === nodeName) {
                    counter++;
                }
            }
            // console.log(`<${nodeName}>(${counter}) in <${parentName}>`);
            switch (options.times) {
                case 'once': {
                    if (counter !== 1) {
                        reports.push({
                            level: 'error',
                            message: `<${nodeName}> is required that is premitted content of <${parentName}>.`,
                            line: 0,
                            col: 0,
                            raw: '',
                        });
                    }
                    break;
                }
                case 'one or more': {
                    if (counter < 1) {
                        reports.push({
                            level: 'error',
                            message: `<${nodeName}> is required one or more, premitted content of <${parentName}>.`,
                            line: 0,
                            col: 0,
                            raw: '',
                        });
                    }
                    break;
                }
            }
        }
    }
    return reports;
}
