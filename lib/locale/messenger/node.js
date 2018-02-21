"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const osLocale_1 = __importDefault(require("../osLocale"));
const _1 = __importDefault(require("./"));
const readTextFile_1 = __importDefault(require("../../util/readTextFile"));
async function default_1(locale) {
    if (!locale) {
        locale = await osLocale_1.default();
    }
    const localeId = locale.replace(/^([a-z]+).*/i, '$1').toLowerCase();
    if (localeId === 'en') {
        return _1.default.create(null);
    }
    let json = '{}';
    try {
        const filePath = path_1.default.join(__dirname, '..', 'i18n', `${localeId}.json`);
        json = await readTextFile_1.default(filePath);
    }
    catch (err) {
        console.warn(`⚠ [markuplint] Missing locale message file ${localeId}.json`);
    }
    const localeSet = await JSON.parse(json);
    return _1.default.create(localeSet);
}
exports.default = default_1;
