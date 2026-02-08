import type { CustomParser } from './types.js';

// @ts-ignore
import { tokenize, parse } from 'espree';

/**
 * Tokenizes a JavaScript code string into an array of typed tokens using espree.
 * Each token contains its type (e.g., Identifier, Punctuator) and raw value.
 *
 * @param script - The JavaScript source code to tokenize
 * @returns An array of tokens with their type and string value
 */
export function scriptParser(script: string): ScriptTokenType[] {
	const tokens = tokenize(script, {
		ecmaVersion: 'latest',
		loc: false,
	});

	return tokens.map<ScriptTokenType>((token: any) => ({
		type: token.type,
		value: token.value,
	}));
}

/**
 * Attempts to extract the longest valid JavaScript prefix from a script string
 * that may contain trailing non-JS content (e.g., HTML after an inline expression).
 * Falls back to wrapping the script as an object literal or spread operator
 * if the initial parse fails.
 *
 * @param script - The potentially mixed script/markup string to parse
 * @param parse - A custom parse function to validate the script; defaults to espree with JSX support
 * @returns An object containing the `validScript` prefix and the remaining `leftover` string
 */
export function safeScriptParser(script: string, parse: CustomParser = defaultParse) {
	let { validScript, leftover } = safeParse(script, parse);

	// Support for object literal
	if (leftover.trim()) {
		const assignment = '$=';
		({ validScript } = safeParse(`${assignment}${script}`, parse));
		validScript = validScript.length > assignment.length ? validScript.slice(assignment.length) : '';
	}

	// Support for spread operator
	if (validScript.trim() === '') {
		const coverStart = '$={';
		const coverEnd = '}';
		({ validScript } = safeParse(`${coverStart}${script}${coverEnd}`, parse));
		const coverEndLastIndex = validScript.lastIndexOf(coverEnd);
		validScript =
			validScript.length > coverStart.length + coverEnd.length
				? validScript.slice(coverStart.length, coverEndLastIndex)
				: '';
	}

	leftover = script.slice(validScript.length);

	return {
		validScript,
		leftover,
	};
}

function safeParse(script: string, parse: CustomParser) {
	let validScript: string;
	let leftover: string;
	try {
		parse(script);
		validScript = script;
		leftover = '';
	} catch (error) {
		if (error instanceof SyntaxError && 'index' in error && typeof error.index === 'number') {
			let index = error.index;
			const unexpectedToken = script.slice(index);
			if (unexpectedToken.trim() === '') {
				index = script.search(/\S\s*$/);
			}
			validScript = script.slice(0, index);
			leftover = script.slice(index);
		} else {
			throw error;
		}
	}

	return {
		validScript,
		leftover,
	};
}

function defaultParse(script: string) {
	parse(script, {
		ecmaVersion: 'latest',
		ecmaFeatures: {
			jsx: true,
		},
	});
}

/**
 * A token produced by the script tokenizer, representing a single
 * lexical unit of JavaScript source code.
 */
export type ScriptTokenType = {
	type: 'Identifier' | 'Boolean' | 'Numeric' | 'String' | 'Template' | 'Punctuator';
	value: string;
};
