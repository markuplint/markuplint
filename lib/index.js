"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parser_1 = require("./parser");
function verify(html, ruleset, rules) {
    var nodeTree = parser_1.default(html);
    var reports = [];
    for (var _i = 0, rules_1 = rules; _i < rules_1.length; _i++) {
        var rule = rules_1[_i];
        if (ruleset.rules[rule.name]) {
            reports.push.apply(reports, rule.verify(nodeTree, ruleset));
        }
    }
    return reports;
}
exports.verify = verify;
