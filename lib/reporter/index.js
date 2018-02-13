"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-magic-numbers
const path_1 = __importDefault(require("path"));
const url_1 = __importDefault(require("url"));
const cli_color_1 = __importDefault(require("cli-color"));
const stripAnsi = require('strip-ansi'); // tslint:disable-line
async function standardReporter(targetPath, results, rawSource, color = true) {
    if (!url_1.default.parse(targetPath).host) {
        targetPath = path_1.default.resolve(targetPath);
    }
    const out = [];
    const loggerError = cli_color_1.default.red;
    const loggerWarning = cli_color_1.default.xterm(208);
    const markuplint = `markup${cli_color_1.default.xterm(39)('lint')}`;
    if (results.length) {
        const lines = rawSource.split(/\r?\n/g);
        for (const result of results) {
            const prev = lines[result.line - 2] || '';
            const line = lines[result.line - 1] || '';
            const next = lines[result.line - 0] || '';
            const before = line.substring(0, result.col - 1);
            const after = line.substring(result.col - 1 + result.raw.length);
            const logger = result.severity === 'error' ? loggerError : loggerWarning;
            out.push(`<${markuplint}> ${logger(`${result.severity}: ${result.message} (${result.ruleId}) [${targetPath}:${result.line}:${result.col}]`)}`);
            if (result.line - 1 > 0) {
                out.push(`	${cli_color_1.default.cyan(`${result.line - 1}`.padStart(5))}: ${space(prev)}`);
            }
            out.push(`	${cli_color_1.default.cyan(`${result.line}`.padStart(5))}: ${space(before)}${cli_color_1.default.bgRed(result.raw)}${space(after)}`);
            if (!color) {
                out.push(`	       ${invisibleSpace(before)}${'^'.repeat(result.raw.length)}${invisibleSpace(after)}`);
            }
            out.push(`	${cli_color_1.default.cyan(`${result.line + 1}`.padStart(5))}: ${space(next)}`);
        }
    }
    else {
        out.push(`<${markuplint}> ${cli_color_1.default.green('passed')} [${targetPath}]`);
    }
    const outs = `${out.join('\n')}\n`;
    process.stdout.write(color ? outs : stripAnsi(outs));
}
exports.standardReporter = standardReporter;
async function simpleReporter(targetPath, results, rawSource) {
    const out = [];
    if (results.length) {
        out.push(`❌ : ${targetPath} [markuplint]`);
        for (const result of results) {
            out.push(`\t${targetPath}:${result.line}:${result.col} ${result.message} [markuplint]`);
        }
    }
    else {
        out.push(`✅ : ${targetPath} [markuplint]`);
    }
    process.stdout.write(`${out.join('\n')}\n`);
}
exports.simpleReporter = simpleReporter;
function space(str) {
    return str.replace(/\s+/g, ($0) => {
        return cli_color_1.default.xterm(8)($0);
    }).replace(/ /g, ($0) => `•`).replace(/\t/g, ($0) => `→   `);
}
function invisibleSpace(str) {
    return str.replace(/\t/g, ($0) => `    `).replace(/./g, ($0) => ` `);
}
