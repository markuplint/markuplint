"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const osLocale_1 = __importDefault(require("./osLocale"));
const messenger_1 = __importDefault(require("./messenger"));
const readFile = util_1.default.promisify(fs_1.default.readFile);
async function getLocaleSet(locale) {
    if (!locale) {
        locale = await osLocale_1.default();
    }
    const localeId = locale.replace(/^([a-z]+).*/i, '$1').toLowerCase();
    if (localeId === 'en') {
        return messenger_1.default.create(null);
    }
    let json = '{}';
    try {
        json = await readFile(`${__dirname}/${localeId}.json`, 'utf-8');
    }
    catch (err) {
        console.warn(`⚠ [markuplint] Missing locale message file ${localeId}.json`);
    }
    const localeSet = await JSON.parse(json);
    return messenger_1.default.create(localeSet);
}
exports.default = getLocaleSet;
