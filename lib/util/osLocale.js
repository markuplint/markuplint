"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const osLocale = require("os-locale");
let cachedLocale = null;
async function default_1() {
    if (!cachedLocale) {
        cachedLocale = await osLocale({ spawn: true });
    }
    return cachedLocale;
}
exports.default = default_1;
