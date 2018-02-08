"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
}
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 * @param fileName A file name
 * @param dir A directory relative path from `__dirname` (`"lib/util/"`) on Node.js
 * @param base A directory path on browser
 */
async function default_1(fileName, dir, base) {
    let json;
    try {
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const util = await Promise.resolve().then(() => __importStar(require('util')));
        const Path = await Promise.resolve().then(() => __importStar(require('path')));
        const readFile = util.promisify(fs.readFile);
        const filePath = Path.join(__dirname, dir, fileName);
        const text = await readFile(filePath, 'utf-8');
        json = JSON.parse(text);
    }
    catch (err) {
        console.log(err);
        const url = new URL(fileName, base);
        const res = await fetch(url.toString());
        json = await res.json();
    }
    return json;
}
exports.default = default_1;
