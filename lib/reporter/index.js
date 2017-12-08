"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-magic-numbers
const path = require("path");
const c = require("cli-color");
async function standardReporter(targetPath, results, rawSource) {
    targetPath = path.resolve(targetPath);
    const out = [];
    const loggerError = c.red;
    const loggerWarning = c.xterm(208);
    const markuplint = `markup${c.xterm(39)('lint')}`;
    if (results.length) {
        const lines = rawSource.split(/\r?\n/g);
        for (const result of results) {
            const prev = lines[result.line - 2] || '';
            const line = lines[result.line - 1] || '';
            const next = lines[result.line - 0] || '';
            const before = line.substring(0, result.col);
            const after = line.substring(result.col + result.raw.length);
            const logger = result.level === 'error' ? loggerError : loggerWarning;
            out.push(`<${markuplint}> ${logger(`${result.level}: ${result.message} [${targetPath}:${result.line}:${result.col}]`)}
	${c.cyan(result.line - 1).padStart(5)}: ${space(prev)}
	${c.cyan(result.line).padStart(5)}: ${space(before)}${c.bgRed(result.raw)}${space(after)}
	${c.cyan(result.line + 1).padStart(5)}: ${space(next)}
`);
        }
    }
    else {
        out.push(`<${markuplint}> ${c.green('passed')} [${targetPath}]`);
    }
    process.stdout.write(`${out.join('\n')}\n`);
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
        return c.xterm(8)($0);
    }).replace(/ /g, ($0) => `•`).replace(/\t/g, ($0) => `→   `);
}
