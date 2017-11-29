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
const path = require("path");
const util = require("util");
const readdir = util.promisify(fs.readdir);
class Rule {
    constructor() {
        this.defaultLevel = 'error';
    }
    optimizeOption(option) {
        if (typeof option === 'boolean') {
            return {
                disabled: option,
                level: this.defaultLevel,
                value: this.defaultValue,
                option: null,
            };
        }
        return {
            disabled: true,
            level: option[0],
            value: option[1],
            option: option[2],
        };
    }
}
exports.default = Rule;
function getRuleModules() {
    return __awaiter(this, void 0, void 0, function* () {
        const rules = [];
        const ruleDir = path.resolve(__dirname, './rules');
        const ruleFiles = yield readdir(ruleDir);
        for (const filePath of ruleFiles) {
            if (/^markuplint-rule-[a-z\-]+\.js$/i.test(filePath)) {
                const mod = yield Promise.resolve().then(() => require(path.resolve(ruleDir, filePath)));
                const CustomRule /* Subclass of Rule */ = mod.default;
                rules.push(new CustomRule());
            }
        }
        return rules;
    });
}
exports.getRuleModules = getRuleModules;
