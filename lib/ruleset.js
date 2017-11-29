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
const fileSearch_1 = require("./util/fileSearch");
function getRuleset(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const rulesetFileNameList = [
            '.markuplintrc',
            'markuplintrc.json',
            'markuplint.config.json',
            'markuplint.json',
            'markuplint.config.js',
        ];
        const rulesetFilePath = yield fileSearch_1.default(rulesetFileNameList, dir);
        const ruleset = yield Promise.resolve().then(() => require(rulesetFilePath));
        return ruleset;
    });
}
exports.getRuleset = getRuleset;
