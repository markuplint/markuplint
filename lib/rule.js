"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Rule = /** @class */ (function () {
    function Rule(name) {
        this.name = name;
    }
    Rule.prototype.verify = function (document, ruleset) {
        return [];
    };
    return Rule;
}());
exports.default = Rule;
