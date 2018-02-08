"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const readFile = util_1.default.promisify(fs_1.default.readFile);
const _1 = __importDefault(require("./"));
/**
 * TODO: use cosmiconfig?
 * TODO: support YAML
 * TODO: fetch from internet
 *
 * @param extendRule extend rule file
 */
async function extendsRuleResolver(extendRule, baseRuleFilePath) {
    let jsonStr;
    let ruleFilePath;
    if (/^markuplint\/[a-z0-9-]+(?:\.json)?$/.test(extendRule)) {
        const matched = extendRule.match(/^markuplint\/([a-z0-9-]+)(?:\.json)?$/);
        if (!matched || !matched[1]) {
            throw new Error(`Invalid rule name set extends "${extendRule}" in markuplint`);
        }
        const id = matched[1];
        const filePath = path_1.default.join(__dirname, '..', '..', 'rulesets', `${id}.json`);
        jsonStr = await readFile(filePath, 'utf-8');
        ruleFilePath = filePath;
    }
    else if (/^(?:https?:)?\/\//.test(extendRule)) {
        // TODO: fetch from internet
        throw new Error(`Unsupported external network. Can not fetch ${extendRule}`);
    }
    else {
        if (baseRuleFilePath === _1.default.NOFILE) {
            return {
                ruleConfig: null,
                ruleFilePath: _1.default.NOFILE,
            };
        }
        const dir = path_1.default.dirname(baseRuleFilePath);
        const filePath = path_1.default.resolve(path_1.default.join(dir, extendRule));
        try {
            jsonStr = await readFile(filePath, 'utf-8');
            ruleFilePath = filePath;
        }
        catch (err) {
            throw new Error(`Extended rc file "${filePath}" is not found`);
        }
    }
    const ruleConfig = JSON.parse(jsonStr);
    return { ruleConfig, ruleFilePath };
}
exports.default = extendsRuleResolver;
