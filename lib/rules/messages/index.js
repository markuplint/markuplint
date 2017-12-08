"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const stripJsonComments = require("strip-json-comments");
const readFile = util.promisify(fs.readFile);
function default_1(locale, messageTmpl, ...keywords) {
    return __awaiter(this, void 0, void 0, function* () {
        const localeId = locale.replace(/^([a-z]+).*/i, '$1').toLowerCase();
        const localeSet = yield getLocaleSet(localeId);
        let message = messageTmpl;
        if (localeSet) {
            const t = localeSet[messageTmpl];
            if (typeof t === 'string') {
                messageTmpl = t;
            }
        }
        else if (localeId !== 'en') {
            console.warn(`⚠ [markuplint] Undefined "${messageTmpl}" in locale(${locale}) message file`);
        }
        message = messageTmpl.replace(/\{([0-9]+)\}/g, ($0, $1) => {
            const keyword = keywords[+$1] || '';
            if (localeSet) {
                return localeSet.keywords[keyword] || keyword;
            }
            return keyword;
        });
        return message;
    });
}
exports.default = default_1;
function getLocaleSet(localeId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (localeId === 'en') {
            return null;
        }
        let json;
        try {
            json = yield readFile(`${__dirname}/${localeId}.json`, 'utf-8');
        }
        catch (err) {
            console.warn(`⚠ [markuplint] Missing locale message file ${localeId}.json`);
            return null;
        }
        const localeSet = yield JSON.parse(stripJsonComments(json));
        return localeSet;
    });
}
