import type { Type, Result } from './types.js';
import type { ReadonlyDeep } from 'type-fest';

import { checkBase } from './check-base.js';
import { defs } from './defs.js';
import { cssDefs } from './css-defs.js';

export function check(value: string, type: ReadonlyDeep<Type>, ref?: string, cache = true): Result {
	return checkBase(value, type, { ...defs, ...cssDefs }, ref, cache);
}
