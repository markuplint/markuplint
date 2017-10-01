"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parser_1 = require("./parser");
function verify(html, ruleset, rules) {
    var nodeTree = parser_1.default(html);
    var reports = [];
    if (ruleset && ruleset.rules && ruleset.rules.require) {
        var _loop_1 = function (require_1) {
            var isExist = false;
            nodeTree.walk(function (n) {
                if (n.nodeName === require_1) {
                    isExist = true;
                }
            });
            if (!isExist) {
                reports.push(require_1 + " is reqired.");
            }
        };
        for (var require_1 in ruleset.rules.require) {
            _loop_1(require_1);
        }
    }
    return reports;
}
exports.verify = verify;
