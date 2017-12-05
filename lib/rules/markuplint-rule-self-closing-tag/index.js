"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_1 = require("../../rule");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'self-closing-tag';
    }
    verify(document, config, ruleset) {
        const reports = [];
        // document.walk((node) => {});
        return reports;
    }
}
exports.default = default_1;
