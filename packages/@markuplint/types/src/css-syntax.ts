import type { CustomCssSyntax, CssSyntaxTokenizer, CSSSyntaxToken, GetNextToken, Result, CssSyntax } from './types';

// @ts-ignore
import csstree from 'css-tree';
// @ts-ignore
import { SyntaxMatchError } from 'css-tree/lib/lexer/error.js';
// @ts-ignore
import { matchAsTree } from 'css-tree/lib/lexer/match.js';
// @ts-ignore
import prepareTokens from 'css-tree/lib/lexer/prepare-tokens.js';

import { log } from './debug';
import { tokenizers } from './defs';
import { matched } from './match-result';

// eslint-disable-next-line no-redeclare
interface SyntaxMatchError {
	message: string;
	rawMessage: 'Mismatch';
	syntax: string;
	css: string;
	mismatchOffset: number;
	mismatchLength: number;
	offset: number;
	line: number;
	column: number;
	loc: {
		source: '<unknown>';
		start: { offset: number; line: number; column: number };
		end: { offset: number; line: number; column: number };
	};
}

export function cssSyntaxMatch(value: string, type: CssSyntax | CustomCssSyntax): Result {
	log('Search CSS Syntax: "%s"', type);

	const origin = value;
	let defName: `<${string}>`;
	const typesExtended: Record<string, string> = {};
	const typesCheckers: Record<string, CssSyntaxTokenizer> = {};
	let propsExtended: Record<string, string>;
	let ref: string | undefined = undefined;
	let caseSensitive = false;
	let ebnf: Record<string, string | string[]> | null = null;

	if (typeof type === 'string') {
		defName = type;
		propsExtended = {};
	} else {
		defName = type.syntax.apply;
		ebnf = type.syntax.ebnf || null;

		if (ebnf) {
			// Work in progress
			return matched();
		}

		const types = {
			...tokenizers,
			...type.syntax.def,
		};
		Object.keys(types).forEach(key => {
			const valueOrChecker = types[key];
			if (typeof valueOrChecker === 'string') {
				typesExtended[key] = valueOrChecker;
			} else {
				typesCheckers[key] = valueOrChecker;
			}
		});
		propsExtended = { ...type.syntax.properties };
		if (type.caseSensitive) {
			caseSensitive = true;
			Object.keys(typesExtended).forEach(key => eachMimicCases(key, typesExtended));
			Object.keys(propsExtended).forEach(key => eachMimicCases(key, propsExtended));
			value = mimicCases(value);
		}
		ref = type.ref;
	}

	// @ts-ignore
	const lexer = csstree.fork({
		types: typesExtended,
		properties: propsExtended,
	}).lexer;

	Object.keys(typesCheckers).forEach(key => {
		const checker = typesCheckers[key];
		lexer.addType_(key, (token: CSSSyntaxToken, getNextToken: GetNextToken) =>
			checker(token, getNextToken, cssSyntaxMatch),
		);
	});

	const { isProp, name, matcher } = defToMatcher(lexer, defName);
	const refParam = isProp ? 'Property' : 'Type';
	ref = ref || `https://csstree.github.io/docs/syntax/#${refParam}:${name}`;

	// eslint-disable-next-line no-console
	const _w = console.warn;

	if (log.enabled) {
		// eslint-disable-next-line no-console
		console.warn = warn => log('WARNING: %s (by %s => %s)', warn, value, type);
	}

	const tokens = prepareTokens(value, lexer.syntax);
	const result = matchAsTree(tokens, matcher.match, lexer);

	if (caseSensitive) {
		if (result.tokens && Array.isArray(result.tokens)) {
			let reducer = 0;
			result.tokens = result.tokens.map((token: CSSSyntaxToken) => {
				const value = token.value;
				const originValue = deMimicCases(value || '');
				const isMimiced = value !== originValue;
				reducer += isMimiced ? 'mimiccases------mimiccases'.length : 0;
				token.value = originValue;
				token.balance = token.balance - reducer;
				return token;
			});
		}
	}

	log('css-tree/result: %O', result);
	// eslint-disable-next-line no-console
	console.warn = _w;

	if (result.match) {
		if (log.enabled) {
			log('css-tree/result.match: %s', JSON.stringify(result.match, null, 2));
		}
		return matched();
	}

	const error: SyntaxMatchError = new SyntaxMatchError(result.reason, matcher.syntax, value, result);

	if (caseSensitive) {
		error.message = deMimicCases(error.message);
		error.syntax = deMimicCases(error.syntax);
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

function defToMatcher(lexer: any, def: `<${string}>`) {
	const isProp = def.search("<'") === 0;
	const name = def.replace(/^<'?|'?>$/g, '');
	const matcher = isProp ? lexer.properties[name] : lexer.types[name];
	if (!matcher) {
		log('"%s" CSS syntax not found', def);
		throw new Error('MARKUPLINT_TYPE_NO_EXIST');
	}
	return {
		isProp,
		name,
		matcher,
	};
}

function eachMimicCases(key: string, obj: Record<string, string>) {
	const value = obj[key];
	obj[key] = mimicCases(value);
}

function mimicCases(value: string) {
	return value.replace(/[A-Z]/g, $0 => `mimiccases---${$0}---mimiccases`);
}

function deMimicCases(value: string) {
	return value.replace(/mimiccases---([A-Z])---mimiccases/g, (_, $1) => $1);
}
