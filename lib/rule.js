"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Rule {
    constructor() {
        this.defaultLevel = 'error';
    }
    optimizeOption(option) {
        if (typeof option === 'boolean') {
            return {
                disabled: option,
                level: this.defaultLevel,
                value: this.defaultValue,
                option: null,
            };
        }
        return {
            disabled: true,
            level: option[0],
            value: option[1],
            option: option[2],
        };
    }
}
exports.default = Rule;
