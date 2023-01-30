import type { Nullable } from './types';

import fs from 'node:fs';
import { promisify } from 'node:util';

import glob from 'glob';

const aGlob = promisify(glob);

export function nonNullableFilter<T>(item: Nullable<T>): item is T {
	return !!item;
}

let uuidNum = 0;

export function uuid() {
	const out = `${uuidNum}`;
	uuidNum++;
	return out;
}

export function fileExists(filePath: string) {
	return fs.existsSync(filePath);
}

export function asyncGlob(pattern: string) {
	return aGlob(pattern);
}

export function toRegexp(pattern: string) {
	const matched = pattern.match(/^\/(.+)\/([ig]*)$/i);
	if (matched) {
		return new RegExp(matched[1], matched[2]);
	}
	return pattern;
}
