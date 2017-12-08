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
const parser_1 = require("../../parser");
const rule_1 = require("../../rule");
const messages_1 = require("../messages");
const quote = {
    double: '"',
    single: "'",
};
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'attr-value-quotes';
        this.defaultLevel = 'warning';
        this.defaultValue = 'double';
    }
    verify(document, config, ruleset, locale) {
        return __awaiter(this, void 0, void 0, function* () {
            const reports = [];
            const message = yield messages_1.default(locale, '{0} is must {1} on {2}', 'Attribute value', 'quote', `${config.value} quotation mark`);
            document.walk((node) => {
                if (node instanceof parser_1.Element) {
                    for (const attr of node.attributes) {
                        for (const rawAttr of attr.rawAttr) {
                            if (rawAttr.quote !== quote[config.value]) {
                                reports.push({
                                    level: this.defaultLevel,
                                    message,
                                    line: rawAttr.line + node.line,
                                    col: rawAttr.line === 0 ? rawAttr.col + node.col - 1 : rawAttr.col,
                                    raw: rawAttr.raw,
                                });
                            }
                        }
                    }
                }
            });
            return reports;
        });
    }
}
exports.default = default_1;
