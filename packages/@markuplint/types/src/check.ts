import type { Type, Result, List, CustomSyntax, CustomCssSyntax, Enum, KeywordDefinedType, Number } from './types';

import { log } from './debug';
import { checkEnum } from './enum';
import { checkKeywordType } from './keyword-type';
import { checkList } from './list';
import { checkNumber } from './number';

export function check(value: string, type: Type, ref?: string, cache = true): Result {
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
	log('Check number: %O', type);
	return checkNumber(value, type, ref);
}

export function isKeyword(type: Type): type is KeywordDefinedType {
	return typeof type === 'string';
}

export function isList(type: Type): type is List {
	return typeof type !== 'string' && 'token' in type;
}

export function isEnum(type: Type): type is Enum {
	return typeof type !== 'string' && 'enum' in type;
}

export function isNumber(type: Type): type is Number {
	return typeof type !== 'string' && 'enum' in type;
}

export function isCSSSyntax(type: CustomSyntax | CustomCssSyntax): type is CustomCssSyntax {
	return typeof type === 'string' || 'syntax' in type;
}

export function isCustomSyntax(type: CustomSyntax | CustomCssSyntax): type is CustomSyntax {
	return !isCSSSyntax(type);
}
