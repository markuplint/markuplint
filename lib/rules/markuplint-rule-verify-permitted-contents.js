"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var parser_1 = require("../parser");
var rule_1 = require("../rule");
/**
 * `VerifyPermittedContents`
 *
 * *Core rule*
 */
var VerifyPermittedContents = /** @class */ (function (_super) {
    __extends(VerifyPermittedContents, _super);
    function VerifyPermittedContents() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VerifyPermittedContents.prototype.verify = function (document, ruleset) {
        var reports = [];
        if (ruleset && ruleset.nodeRules) {
            var _loop_1 = function (nodeRule) {
                if (nodeRule.nodeType === '#root') {
                    if (nodeRule.permittedContent) {
                        reports.push.apply(reports, checkPermittedContent(nodeRule.permittedContent, document.root.childNodes, nodeRule.nodeType));
                    }
                }
                document.walk(function (node) {
                    if (node instanceof parser_1.Element && node.nodeName === nodeRule.nodeType) {
                        if (nodeRule.permittedContent) {
                            reports.push.apply(reports, checkPermittedContent(nodeRule.permittedContent, node.childNodes, nodeRule.nodeType));
                        }
                    }
                });
            };
            for (var _i = 0, _a = ruleset.nodeRules; _i < _a.length; _i++) {
                var nodeRule = _a[_i];
                _loop_1(nodeRule);
            }
        }
        return reports;
    };
    return VerifyPermittedContents;
}(rule_1.default));
exports.VerifyPermittedContents = VerifyPermittedContents;
exports.default = new VerifyPermittedContents('verify-permitted-contents');
function checkPermittedContent(permittedContents, nodes, parentName) {
    var reports = [];
    for (var _i = 0, permittedContents_1 = permittedContents; _i < permittedContents_1.length; _i++) {
        var permittedContent = permittedContents_1[_i];
        var nodeName = permittedContent[0];
        var options = permittedContent[1];
        if (options && options.required) {
            var counter = 0;
            for (var _a = 0, nodes_1 = nodes; _a < nodes_1.length; _a++) {
                var node = nodes_1[_a];
                if (node.nodeName === nodeName) {
                    counter++;
                }
            }
            // console.log(`<${nodeName}>(${counter}) in <${parentName}>`);
            switch (options.times) {
                case 'once': {
                    if (counter !== 1) {
                        reports.push("<" + nodeName + "> is required that is premitted content of <" + parentName + ">.");
                    }
                    break;
                }
                case 'one or more': {
                    if (counter < 1) {
                        reports.push("<" + nodeName + "> is required one or more, premitted content of <" + parentName + ">.");
                    }
                    break;
                }
            }
        }
    }
    return reports;
}
