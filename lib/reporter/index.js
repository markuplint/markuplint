"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-magic-numbers
const path_1 = __importDefault(require("path"));
const url_1 = __importDefault(require("url"));
const cli_color_1 = __importDefault(require("cli-color"));
const eaw = require('eastasianwidth'); // tslint:disable-line
const stripAnsi = require('strip-ansi'); // tslint:disable-line
const defaultConfig = {
    color: true,
    problemOnly: false,
    noStdOut: false,
};
const loggerError = cli_color_1.default.red;
const loggerWarning = cli_color_1.default.xterm(208);
const markuplint = `markup${cli_color_1.default.xterm(39)('lint')}`;
async function standardReporter(targetPath, results, rawSource, options) {
    const config = Object.assign({}, defaultConfig, options);
    if (!url_1.default.parse(targetPath).host) {
        targetPath = path_1.default.resolve(targetPath);
    }
    const sizes = {
        line: 0,
        col: 0,
        meg: 0,
    };
    for (const result of results) {
        sizes.line = Math.max(sizes.line, result.line.toString(10).length);
        sizes.col = Math.max(sizes.col, result.col.toString(10).length);
        sizes.meg = Math.max(sizes.meg, w(result.message));
    }
    const out = [];
    if (results.length) {
        const lines = rawSource.split(/\r?\n/g);
        for (const result of results) {
            const prev = lines[result.line - 2] || '';
            const line = lines[result.line - 1] || '';
            const next = lines[result.line - 0] || '';
            const before = line.substring(0, result.col - 1);
            const after = line.substring(result.col - 1 + result.raw.length);
            const logger = result.severity === 'error' ? loggerError : loggerWarning;
            out.push(`<${markuplint}> ${logger(`${result.severity}: ${result.message} (${result.ruleId}) ${cli_color_1.default.underline(`${targetPath}:${result.line}:${result.col}`)}`)}`);
            if (result.line - 1 > 0) {
                out.push(`  ${cli_color_1.default.cyan(p(result.line - 1, sizes.col, true))}: ${space(prev)}`);
            }
            out.push(`  ${cli_color_1.default.cyan(p(result.line, sizes.col, true))}: ${space(before)}${cli_color_1.default.bgRed(result.raw)}${space(after)}`);
            if (!config.color) {
                out.push(`         ${invisibleSpace(before)}${'^'.repeat(result.raw.length)}${invisibleSpace(after)}`);
            }
            out.push(`  ${cli_color_1.default.cyan(p(result.line + 1, sizes.col, true))}: ${space(next)}`);
        }
    }
    else if (!config.problemOnly) {
        out.push(`<${markuplint}> ${cli_color_1.default.green('passed')} ${cli_color_1.default.underline(targetPath)}`);
    }
    if (!config.noStdOut && out.length) {
        const outs = `${out.join('\n')}\n`;
        process.stdout.write(config.color ? outs : stripAnsi(outs));
    }
    return config.color ? out : out.map(stripAnsi);
}
exports.standardReporter = standardReporter;
async function simpleReporter(targetPath, results, rawSource, options) {
    const config = Object.assign({}, defaultConfig, options);
    if (!url_1.default.parse(targetPath).host) {
        targetPath = path_1.default.resolve(targetPath);
    }
    const sizes = {
        line: 0,
        col: 0,
        meg: 0,
    };
    for (const result of results) {
        sizes.line = Math.max(sizes.line, result.line.toString(10).length);
        sizes.col = Math.max(sizes.col, result.col.toString(10).length);
        sizes.meg = Math.max(sizes.meg, w(result.message));
    }
    const out = [];
    if (results.length) {
        out.push(`<${markuplint}> ${cli_color_1.default.underline(targetPath)}: ${cli_color_1.default.red('✗')}`);
        for (const result of results) {
            const s = result.severity === 'error' ? '❌' : '⚠️';
            out.push(`  ${cli_color_1.default.cyan(`${p(result.line, sizes.line, true)}:${p(result.col, sizes.col)}`)} ${s}  ${p(result.message, sizes.meg)} ${cli_color_1.default.xterm(8)(result.ruleId)} `);
        }
    }
    else if (!config.problemOnly) {
        out.push(`<${markuplint}> ${cli_color_1.default.underline(targetPath)}: ${cli_color_1.default.green('✓')}`);
    }
    if (!config.noStdOut && out.length) {
        const outs = `${out.join('\n')}\n`;
        process.stdout.write(config.color ? outs : stripAnsi(outs));
    }
    return config.color ? out : out.map(stripAnsi);
}
exports.simpleReporter = simpleReporter;
function p(s, pad, start = false) {
    const l = w(`${s}`.trim());
    const d = pad - l;
    const _ = ' '.repeat(d < 0 ? 0 : d);
    return start ? `${_}${s}` : `${s}${_}`;
}
function w(s) {
    return s.replace(/./g, _ => '0'.repeat(eaw.characterLength(_))).length;
}
function space(str) {
    return str
        .replace(/\s+/g, $0 => {
        return cli_color_1.default.xterm(8)($0);
    })
        .replace(/ /g, $0 => `•`)
        .replace(/\t/g, $0 => `→   `);
}
function invisibleSpace(str) {
    return str.replace(/\t/g, $0 => `    `).replace(/./g, $0 => ` `);
}
