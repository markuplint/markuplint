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
const rule_1 = require("../../rule");
class default_1 extends rule_1.default {
    constructor() {
        super(...arguments);
        this.name = 'empty-alt-attr';
    }
    verify(document, config, ruleset) {
        return __awaiter(this, void 0, void 0, function* () {
            const reports = [];
            // document.walk((node) => {});
            return reports;
        });
    }
}
exports.default = default_1;
