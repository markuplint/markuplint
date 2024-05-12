import type {
	Type,
	Result,
	List,
	CustomSyntax,
	CustomCssSyntax,
	Enum,
	KeywordDefinedType,
	Number,
	Directive,
} from './types.js';
import type { ReadonlyDeep } from 'type-fest';

import { log } from './debug.js';
import { checkDirective } from './directive.js';
import { checkEnum } from './enum.js';
import { checkKeywordType } from './keyword-type.js';
import { checkList } from './list.js';
import { checkNumber } from './number.js';

export function check(value: string, type: ReadonlyDeep<Type>, ref?: string, cache = true): Result {
	if (isKeyword(type)) {
		log('Check keyword: %s', type);
		return checkKeywordType(value, type, cache);
	}
	if (isList(type)) {
		log('Check list: %O', type);
		return checkList(value, type, ref, cache);
	}
	if (isEnum(type)) {
		log('Check enum: %O', type);
		return checkEnum(value, type, ref);
	}
	if (isNumber(type)) {
		log('Check number: %O', type);
		return checkNumber(value, type, ref);
	}
	if (isDirective(type)) {
		log('Check directive: %O', type);
		return checkDirective(value, type, ref);
	}
	throw new Error('Unknown type');
}

export function isKeyword(type: ReadonlyDeep<Type>): type is ReadonlyDeep<KeywordDefinedType> {
	return typeof type === 'string';
}

export function isList(type: ReadonlyDeep<Type>): type is ReadonlyDeep<List> {
	return typeof type !== 'string' && 'separator' in type;
}

export function isEnum(type: ReadonlyDeep<Type>): type is ReadonlyDeep<Enum> {
	return typeof type !== 'string' && 'enum' in type;
}

export function isNumber(type: ReadonlyDeep<Type>): type is ReadonlyDeep<Number> {
	return typeof type !== 'string' && 'type' in type && (type.type === 'float' || type.type === 'integer');
}

export function isDirective(type: ReadonlyDeep<Type>): type is ReadonlyDeep<Directive> {
	return typeof type !== 'string' && 'directive' in type;
}

export function isCSSSyntax(type: CustomSyntax | CustomCssSyntax): type is CustomCssSyntax {
	return typeof type === 'string' || 'syntax' in type;
}

export function isCustomSyntax(type: CustomSyntax | CustomCssSyntax): type is CustomSyntax {
	return !isCSSSyntax(type);
}
