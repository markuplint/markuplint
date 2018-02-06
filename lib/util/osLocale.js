"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const os_locale_1 = __importDefault(require("os-locale"));
let cachedLocale = null;
async function default_1() {
    if (!cachedLocale) {
        cachedLocale = await os_locale_1.default({ spawn: true });
    }
    return cachedLocale;
}
exports.default = default_1;
