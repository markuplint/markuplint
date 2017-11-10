"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Rule {
    constructor(name) {
        this.name = name;
    }
    verify(document, ruleset) {
        return [];
    }
}
exports.default = Rule;
