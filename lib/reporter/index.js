"use strict";
// tslint:disable:no-magic-numbers
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const c = require("cli-color");
function standardReporter(targetPath, results, rawSource) {
    return __awaiter(this, void 0, void 0, function* () {
        const out = [];
        const loggerError = c.red;
        const loggerWarning = c.xterm(208);
        if (results.length) {
            const lines = rawSource.split(/\r?\n/g);
            for (const result of results) {
                const prev = lines[result.line - 2] || '';
                const line = lines[result.line - 1] || '';
                const next = lines[result.line - 0] || '';
                const before = line.substring(0, result.col);
                const after = line.substring(result.col + result.raw.length);
                const logger = result.level === 'error' ? loggerError : loggerWarning;
                out.push(`${logger(`markuplint ${result.level}: ${result.message} [${targetPath}:${result.line}:${result.col}]`)}
	${c.cyan(result.line - 1).padStart(5)}: ${space(prev)}
	${c.cyan(result.line).padStart(5)}: ${space(before)}${c.bgRed(result.raw)}${space(after)}
	${c.cyan(result.line + 1).padStart(5)}: ${space(next)}
`);
            }
        }
        else {
            out.push(`${c.green('markuplint passed')} [${targetPath}]`);
        }
        process.stdout.write(`${out.join('\n')}\n`);
    });
}
exports.standardReporter = standardReporter;
function simpleReporter(targetPath, results, rawSource) {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
exports.simpleReporter = simpleReporter;
function space(str) {
    return str.replace(/\s+/g, ($0) => {
        return c.xterm(8)($0);
    }).replace(/ /g, ($0) => `•`).replace(/\t/g, ($0) => `→   `);
}
