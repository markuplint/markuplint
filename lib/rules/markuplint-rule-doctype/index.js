"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const doctype_1 = __importDefault(require("../../dom/doctype"));
const custom_rule_1 = __importDefault(require("../../rule/custom-rule"));
exports.default = custom_rule_1.default.create({
    name: 'doctype',
    defaultValue: 'always',
    defaultOptions: null,
    async verify(document, messages) {
        const reports = [];
        const message = messages('error');
        let has = false;
        await document.walkOn('Node', async (node) => {
            if (node instanceof doctype_1.default) {
                has = true;
            }
        });
        // if (!has) {
        // 	reports.push({
        // 		level: document.rule.servery,
        // 		message,
        // 		line: 1,
        // 		col: 1,
        // 		raw: '',
        // 	});
        // }
        return reports;
    },
});
