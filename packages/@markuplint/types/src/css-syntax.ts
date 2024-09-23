import type { CustomCssSyntax, CssSyntaxTokenizer, CSSSyntaxToken, GetNextToken, Result, CssSyntax } from './types.js';

import { fork } from 'css-tree';

import { log } from './debug.js';
import { tokenizers, overrides } from './defs.js';
import { matched } from './match-result.js';

const MIMIC_TAG_L = 'mimiccases---';
const MIMIC_TAG_R = '---mimiccases';
const MIMIC_LENGTH = (MIMIC_TAG_L + MIMIC_TAG_R).length;

export function cssSyntaxMatch(value: string, type: CssSyntax | CustomCssSyntax): Result {
	log('Search CSS Syntax: "%s"', type);

	const origin = value;
	let defName: `<${string}>`;
	const typesExtended: Record<string, string> = {};
	const typesCheckers: Record<string, CssSyntaxTokenizer> = {};
	let propsExtended: Record<string, string>;
	let ref: string | undefined = undefined;
	let caseSensitive = false;
	let ebnf: Record<string, string | readonly string[]> | null = null;

	if (typeof type === 'string') {
		defName = type;
		propsExtended = {};
	} else {
		defName = type.syntax.apply;
		ebnf = type.syntax.ebnf ?? null;

		if (ebnf) {
			// Work in progress
			return matched();
		}

		const types = {
			...tokenizers,
			...type.syntax.def,
		};
		for (const key of Object.keys(types)) {
			const valueOrChecker = types[key];
			if (typeof valueOrChecker === 'string') {
				typesExtended[key] = valueOrChecker;
			} else if (valueOrChecker) {
				typesCheckers[key] = valueOrChecker;
			}
		}
		propsExtended = { ...type.syntax.properties };
		if (type.caseSensitive) {
			caseSensitive = true;
			for (const key of Object.keys(typesExtended)) eachMimicCases(key, typesExtended);
			for (const key of Object.keys(propsExtended)) eachMimicCases(key, propsExtended);
			value = mimicCases(value);
		}
		ref = type.ref;
	}

	// @ts-ignore
	const lexer = fork({
		types: {
			...overrides,
			...typesExtended,
		},
		properties: propsExtended,
	}).lexer;

	for (const key of Object.keys(typesCheckers)) {
		const checker = typesCheckers[key];
		// @ts-ignore
		lexer.addType_(key, (token: CSSSyntaxToken, getNextToken: GetNextToken) =>
			checker?.(token, getNextToken, cssSyntaxMatch),
		);
	}

	const { isProp, name } = detectName(defName);

	// @ts-ignore
	const matcher = isProp ? lexer.properties[name] : lexer.types[name];
	if (!matcher) {
		log('"%s" CSS syntax not found', defName);
		throw new Error('MARKUPLINT_TYPE_NO_EXIST');
	}

	const refParam = isProp ? 'Property' : 'Type';
	ref = ref ?? `https://csstree.github.io/docs/syntax/#${refParam}:${name}`;

	// eslint-disable-next-line no-console
	const _w = console.warn;

	if (log.enabled) {
		// eslint-disable-next-line no-console
		console.warn = warn => log('WARNING: %s (by %s => %s)', warn, value, type);
	}

	const result = lexer.match(defName, value);

	log('css-tree/result: %O', result);
	// eslint-disable-next-line no-console
	console.warn = _w;

	if (!result.error) {
		return matched();
	}

	if (!('css' in result.error)) {
		if (result.error.message === 'Matching for a tree with var() is not supported') {
			// `var()` is not supported
			// So, return matched
			// @see https://github.com/csstree/csstree/issues/62
			return matched();
		}

		throw result.error;
	}

	const error = result.error;

	if (caseSensitive) {
		const offset = error.mismatchOffset % MIMIC_LENGTH;
		const diff = error.mismatchOffset - offset;
		error.message = deMimicCases(error.message).replace('-'.repeat(diff), '');
		error.syntax = deMimicCases(error.syntax);
		error.css = deMimicCases(error.css);
		error.mismatchOffset = offset;
		error.column = error.column % MIMIC_LENGTH;
		const mismatchLength = error.mismatchLength - MIMIC_LENGTH;
		error.mismatchLength = mismatchLength < 0 ? error.mismatchLength : mismatchLength;
	}

	log('css-tree/SyntaxMatchError: %O', error);

	return {
		matched: false,
		ref,
		raw: origin.slice(error.mismatchOffset, error.mismatchOffset + error.mismatchLength),
		offset: error.mismatchOffset,
		length: error.mismatchLength,
		line: error.line,
		column: error.column,
		expects: [
			{
				type: 'syntax',
				value: error.syntax,
			},
		],
		partName: error.mismatchOffset === 0 ? undefined : 'value',
		reason: 'syntax-error',
	};
}

function detectName(def: `<${string}>`) {
	const isProp = def.search("<'") === 0;
	const name = def.replaceAll(/^<'?|'?>$/g, '');
	return {
		isProp,
		name,
	};
}

/**
 *
 * @param key
 * @param obj
 * @modifies obj
 * @returns
 */
function eachMimicCases(
	key: string,
	// Mutable
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	obj: Record<string, string>,
) {
	const value = obj[key];
	if (!value) {
		return;
	}
	obj[key] = mimicCases(value);
}

function mimicCases(value: string) {
	return value.replaceAll(/[A-Z]/g, $0 => `${MIMIC_TAG_L}${$0}${MIMIC_TAG_R}`);
}

function deMimicCases(value: string) {
	return value.replaceAll(new RegExp(`${MIMIC_TAG_L}([A-Z])${MIMIC_TAG_R}`, 'g'), (_, $1) => $1);
}
