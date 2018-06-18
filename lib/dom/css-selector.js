"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const css_what_1 = __importDefault(require("css-what"));
class CSSSelector {
    constructor(selector) {
        this._rawSelector = selector;
        this._ruleset = css_what_1.default(selector) || [];
        // console.log(JSON.stringify(this._ruleset, null, 2));
    }
    match(element) {
        return match(element, this._ruleset, this._rawSelector);
    }
}
exports.CSSSelector = CSSSelector;
// tslint:disable-next-line:cyclomatic-complexity
function match(element, ruleset, rawSelector) {
    const orMatch = [];
    for (const selectorRules of ruleset) {
        const andMatch = [];
        for (const selectorRule of selectorRules) {
            switch (selectorRule.type) {
                case 'universal': {
                    // console.log(`true <= "*" in ${element.raw}`);
                    andMatch.push(true);
                    break;
                }
                case 'tag': {
                    const matched = element.nodeName.toLowerCase() ===
                        selectorRule.name.toLowerCase();
                    // console.log(`${matched} <= "${selectorRule.name}" in ${element.raw}`);
                    andMatch.push(matched);
                    break;
                }
                case 'pseudo': {
                    switch (selectorRule.name) {
                        case 'not': {
                            if (!selectorRule.data ||
                                typeof selectorRule.data === 'string') {
                                throw new Error(`Unexpected parameters in "not" pseudo selector in "${rawSelector}"`);
                            }
                            andMatch.push(!match(element, selectorRule.data, rawSelector));
                            break;
                        }
                        default: {
                            throw new Error(`Unsupport "${selectorRule.name}" pseudo selector in "${rawSelector}"`);
                        }
                    }
                    break;
                }
                case 'attribute': {
                    const attr = element.getAttribute(selectorRule.name);
                    if (!attr) {
                        andMatch.push(false);
                        continue;
                    }
                    const value = attr.value ? attr.value.value : '';
                    switch (selectorRule.action) {
                        case 'exists': {
                            andMatch.push(true);
                            break;
                        }
                        case 'equals': {
                            if (selectorRule.ignoreCase) {
                                andMatch.push(value === selectorRule.value);
                            }
                            else {
                                andMatch.push(value.toLowerCase() ===
                                    selectorRule.value.toLowerCase());
                            }
                            break;
                        }
                        case 'element': {
                            throw new Error(`Unsupport "[attr~=val]" attribute selector in "${rawSelector}"`);
                        }
                        case 'start': {
                            const re = new RegExp(`^${selectorRule.value}`, selectorRule.ignoreCase ? 'i' : undefined);
                            andMatch.push(re.test(value));
                            break;
                        }
                        case 'end': {
                            const re = new RegExp(`${selectorRule.value}$`, selectorRule.ignoreCase ? 'i' : undefined);
                            andMatch.push(re.test(value));
                            break;
                        }
                        case 'any': {
                            const re = new RegExp(selectorRule.value, selectorRule.ignoreCase ? 'i' : undefined);
                            andMatch.push(re.test(value));
                            break;
                        }
                        case 'not': {
                            throw new Error(`Unsupport "[attr!=val]" attribute selector in "${rawSelector}"`);
                        }
                        case 'hyphen': {
                            throw new Error(`Unsupport "[attr|=val]" attribute selector in "${rawSelector}"`);
                        }
                    }
                    break;
                }
                default: {
                    throw new Error(`Unsupport ${selectorRule.type} selector in "${rawSelector}"`);
                }
            }
        }
        orMatch.push(andMatch.every(b => b));
    }
    return orMatch.some(b => b);
}
function default_1(selector) {
    return new CSSSelector(selector);
}
exports.default = default_1;
