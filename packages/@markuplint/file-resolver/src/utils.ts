import type { Nullable } from './types';

import fs from 'fs';

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
