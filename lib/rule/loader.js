"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const find_node_modules_1 = __importDefault(require("find-node-modules"));
const path_1 = __importDefault(require("path"));
const custom_rule_1 = __importDefault(require("./custom-rule"));
const readdir_1 = __importDefault(require("../util/readdir"));
async function ruleModulesLoader() {
    const rules = [];
    rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path_1.default.resolve(__dirname, '../rules')));
    rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path_1.default.resolve(process.cwd(), './rules')));
    rules.push(...await resolveRuleModules(/^markuplint-plugin-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, nearNodeModules()));
    return rules;
}
exports.default = ruleModulesLoader;
async function resolveRuleModules(pattern, ruleDir) {
    const rules = [];
    if (!ruleDir) {
        return rules;
    }
    try {
        const ruleFiles = await readdir_1.default(ruleDir);
        for (const filePath of ruleFiles) {
            if (pattern.test(filePath)) {
                const rule = await resolveRuleModule(path_1.default.resolve(ruleDir, filePath));
                if (rule) {
                    rules.push(rule);
                }
            }
        }
    }
    catch (e) {
        // @ts-ignore
        if (!(e instanceof Error && e.code === 'ENOENT')) {
            throw e;
        }
    }
    return rules;
}
async function resolveRuleModule(modulePath) {
    try {
        const mod = await Promise.resolve().then(() => __importStar(require(modulePath)));
        const modRule /* Subclass of Rule */ = mod.default;
        const rule = modRule.rule ? new custom_rule_1.default(modRule.rule) : modRule;
        return rule;
    }
    catch (err) {
        // @ts-ignore
        if (err instanceof Error && err.code === 'MODULE_NOT_FOUND') {
            console.warn(`[markuplint] Cannot find rule module: ${modulePath} (${err.message})`);
        }
        else {
            throw err;
        }
    }
}
function nearNodeModules() {
    const moduleDirs = find_node_modules_1.default({ cwd: process.cwd() }).map((dir) => path_1.default.resolve(dir));
    const moduleDir = moduleDirs[0];
    return moduleDir || '';
}
