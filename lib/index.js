"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parser_1 = require("./parser");
function verify(html, ruleset, rules) {
    var nodeTree = parser_1.default(html);
    var reports = [];
    var permittedContentStacks = [];
    if (ruleset && ruleset.nodeRules) {
        var _loop_1 = function (nodeRule) {
            if (nodeRule.nodeType === '#root') {
                if (nodeRule.permittedContent) {
                    for (var _i = 0, _a = nodeRule.permittedContent; _i < _a.length; _i++) {
                        var permittedContent = _a[_i];
                        var nodeName = permittedContent[0];
                        var options = permittedContent[1];
                        if (options && options.required) {
                            permittedContentStacks.push(nodeName);
                        }
                    }
                }
            }
            nodeTree.walk(function (n) {
                if (n.nodeName === nodeRule.nodeType) {
                    // console.log({[nodeRule.nodeType]: nodeRule});
                    if (permittedContentStacks.includes(n.nodeName)) {
                        var i = permittedContentStacks.lastIndexOf(n.nodeName);
                        permittedContentStacks.splice(i, 1);
                        console.log(permittedContentStacks, n.nodeName, i);
                    }
                    if (nodeRule.permittedContent) {
                        for (var _i = 0, _a = nodeRule.permittedContent; _i < _a.length; _i++) {
                            var permittedContent = _a[_i];
                            var nodeName = permittedContent[0];
                            var options = permittedContent[1];
                            if (options && options.required) {
                                permittedContentStacks.push(nodeName);
                            }
                        }
                    }
                }
            });
        };
        for (var _i = 0, _a = ruleset.nodeRules; _i < _a.length; _i++) {
            var nodeRule = _a[_i];
            _loop_1(nodeRule);
        }
    }
    for (var _b = 0, permittedContentStacks_1 = permittedContentStacks; _b < permittedContentStacks_1.length; _b++) {
        var stack = permittedContentStacks_1[_b];
        reports.push(stack + " is required.");
    }
    if (ruleset && ruleset.rules && ruleset.rules.require) {
        // for (const require in ruleset.rules.require) {
        // 	if (ruleset.rules.require.hasOwnProperty(require)) {
        // 		let isExist = false;
        // 		nodeTree.walk((n) => {
        // 			if (n.nodeName === require) {
        // 				isExist = true;
        // 			}
        // 		});
        // 		if (!isExist) {
        // 			reports.push(`${require} is reqired.`)
        // 		}
        // 	}
        // }
    }
    return reports;
}
exports.verify = verify;
