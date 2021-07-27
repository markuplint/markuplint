import { Nullable } from './types';

export function nonNullableFilter<T>(item: Nullable<T>): item is T {
	return !!item;
}

let uuidNum = 0;

export function uuid() {
	const out = `${uuidNum}`;
	uuidNum++;
	return out;
}
