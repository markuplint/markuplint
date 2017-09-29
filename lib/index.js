"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parse5 = require("parse5");
function verify(html) {
    var doc = parse5.parse(html, { locationInfo: true });
}
exports.verify = verify;
