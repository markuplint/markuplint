"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const charLocator_1 = __importDefault(require("../../dom/parser/charLocator"));
class CustomRule {
    constructor(o) {
        this.name = o.name;
        this.defaultLevel = o.defaultLevel || 'error';
        this.defaultValue = o.defaultValue;
        this.defaultOptions = o.defaultOptions;
        this._v = o.verify;
    }
    static create(options) {
        return new CustomRule(options);
    }
    static charLocator(searches, text, currentLine, currentCol) {
        return charLocator_1.default(searches, text, currentLine, currentCol);
    }
    async verify(document, config, ruleset, messenger) {
        if (!this._v) {
            return [];
        }
        document.setRule(this);
        const results = await this._v(document, messenger.message());
        document.setRule(null);
        return results.map((result) => {
            return {
                severity: result.severity,
                level: result.severity,
                message: result.message,
                line: result.line,
                col: result.col,
                raw: result.raw,
                ruleId: result.ruleId ? `${this.name}/${result.ruleId}` : `${this.name}`,
            };
        });
    }
    optimizeOption(option) {
        if (typeof option === 'boolean') {
            return {
                disabled: !option,
                severity: this.defaultLevel,
                value: this.defaultValue,
                option: this.defaultOptions || null,
            };
        }
        if (Array.isArray(option)) {
            return {
                disabled: false,
                severity: option[0],
                value: option[1] || this.defaultValue,
                option: option[2] || this.defaultOptions || null,
            };
        }
        return {
            disabled: false,
            severity: this.defaultLevel,
            value: option == null ? this.defaultValue : option,
            option: this.defaultOptions || null,
        };
    }
}
exports.default = CustomRule;
