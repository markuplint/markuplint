"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
function verify(html, ruleset, rules, locale) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!locale) {
            locale = '';
        }
        const nodeTree = parser_1.default(html);
        const reports = [];
        for (const rule of rules) {
            if (ruleset.rules && ruleset.rules[rule.name]) {
                const config = rule.optimizeOption(ruleset.rules[rule.name]);
                reports.push(...yield rule.verify(nodeTree, config, ruleset, locale));
            }
        }
        return reports;
    });
}
exports.verify = verify;
