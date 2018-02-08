"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const osLocale_1 = __importDefault(require("../osLocale"));
const _1 = __importDefault(require("./"));
const readFile = util_1.default.promisify(fs_1.default.readFile);
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
        json = await readFile(filePath, 'utf-8');
    }
    catch (err) {
        console.warn(`⚠ [markuplint] Missing locale message file ${localeId}.json`);
    }
    const localeSet = await JSON.parse(json);
    return _1.default.create(localeSet);
}
exports.default = default_1;
