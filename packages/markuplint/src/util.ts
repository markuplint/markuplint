import type { Nullable } from './types';

import { v4 } from 'uuid';

export function nonNullableFilter<T>(item: Nullable<T>): item is T {
	return !!item;
}

export function uuid() {
	return v4();
}
