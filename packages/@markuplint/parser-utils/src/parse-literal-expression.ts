// @ts-ignore
import { parse } from 'espree';

import { scriptParser } from './script-parser.js';

/**
 * A JavaScript expression that is nothing but a literal, as {@link parseLiteralExpression} reads it.
 */
export type LiteralExpression =
	| {
			readonly type: 'string';
			readonly value: string;
			readonly key: string;
	  }
	| {
			readonly type: 'number';
			readonly value: number;
			readonly key: string;
	  }
	| {
			readonly type: 'boolean';
			readonly value: boolean;
			readonly key: 'true' | 'false';
	  }
	| {
			readonly type: 'null';
			readonly value: null;
			readonly key: 'null';
	  }
	| {
			readonly type: 'undefined';
			readonly value: undefined;
			readonly key: 'undefined';
	  };

/**
 * The characters a literal can start with: a quote, a digit, a dot (`.5`), a minus sign, an opening
 * parenthesis, and the first letters of `true` / `false` / `null` / `undefined`. An expression that
 * starts with anything else cannot be a literal, which spares the tokenizer for the many that are
 * identifiers or calls.
 */
const LITERAL_START = /^\s*["'`\d.\-(tfnu]/;

/**
 * Reads a JavaScript expression and tells whether it is nothing but a literal: a string, a template
 * literal without a substitution, a number, `true`, `false`, `null` or `undefined`, with a leading
 * minus sign for a number, any number of balanced parentheses, and a TypeScript `as` / `satisfies`
 * assertion after it. An identifier, a call, an object, an array, a template literal with a
 * substitution, a regular expression, an operator, or `NaN` is not.
 *
 * The result carries the value that the code evaluates to, and `key`, the normal form of the literal:
 * two literals of one value and one type have the same key however they are written (`'x'`, `"x"`
 * and `` `x` ``; `0x0`, `-0` and `0`), and literals that differ in value or in type do not
 * (`true` and `"true"`, `0` and `"0"` and `false`). A string's key is its JSON, a number's key is
 * `String(value)`, and the rest are their keyword. The keys are those of `literalValues` of a spec.
 *
 * The code is expected to be an expression that a parser has already read, but a template language
 * hands over whatever its author wrote (a Vue `:x="a b"`), so a code that is not JavaScript is
 * `null` as well.
 *
 * JavaScript is parsed once and its tree says whether it is a literal. What only TypeScript has (`as` and
 * `satisfies` after the literal) is not JavaScript, so a code that does not parse is read by its tokens
 * ({@link parseLiteralByTokens}), which give the same answer for the code that does parse.
 *
 * The catches in this file do not use `isFatalError`: espree reports the code that it is given, which is
 * the author's own, by a `SyntaxError`, and that is the answer "not a literal" here. Anything else is
 * thrown again.
 *
 * @param code - The text of the expression, without the braces or quotes around it
 * @returns The literal, or `null` when the code is not a literal
 */
export function parseLiteralExpression(code: string): LiteralExpression | null {
	if (!LITERAL_START.test(code)) {
		return null;
	}

	const fromTree = parseLiteralByTree(code);
	return fromTree === undefined ? parseLiteralByTokens(code) : fromTree;
}

/**
 * Reads the code as a JavaScript expression, in parentheses so that an object literal or a function is an
 * expression too, and a line comment at the end does not take the parenthesis.
 *
 * @returns The literal, `null` when the code is JavaScript and is not a literal, or `undefined` when it is
 * not JavaScript
 */
function parseLiteralByTree(code: string): LiteralExpression | null | undefined {
	let program: any;
	try {
		program = parse(`(${code}\n)`, { ecmaVersion: 'latest' });
	} catch (error) {
		if (error instanceof SyntaxError) {
			return undefined;
		}
		throw error;
	}
	const statement = program.body.length === 1 ? program.body[0] : null;
	return statement?.type === 'ExpressionStatement' ? literalOfNode(statement.expression) : null;
}

function literalOfNode(node: any): LiteralExpression | null {
	switch (node.type) {
		case 'Literal': {
			return literalOfValue(node, false);
		}
		case 'UnaryExpression': {
			return node.operator === '-' && node.argument.type === 'Literal'
				? literalOfValue(node.argument, true)
				: null;
		}
		case 'TemplateLiteral': {
			const cooked = node.expressions.length === 0 ? node.quasis[0]?.value.cooked : undefined;
			return typeof cooked === 'string' ? stringLiteral(cooked) : null;
		}
		case 'Identifier': {
			return node.name === 'undefined' ? { type: 'undefined', value: undefined, key: 'undefined' } : null;
		}
		default: {
			return null;
		}
	}
}

function literalOfValue(
	node: { readonly value: unknown; readonly regex?: unknown },
	negative: boolean,
): LiteralExpression | null {
	const { value } = node;
	if (node.regex !== undefined) {
		return null;
	}
	if (typeof value === 'number' || typeof value === 'bigint') {
		return numberLiteral(value, negative);
	}
	if (negative) {
		return null;
	}
	switch (typeof value) {
		case 'string': {
			return stringLiteral(value);
		}
		case 'boolean': {
			return value
				? { type: 'boolean', value: true, key: 'true' }
				: { type: 'boolean', value: false, key: 'false' };
		}
		default: {
			return value === null ? { type: 'null', value: null, key: 'null' } : null;
		}
	}
}

/**
 * Reads the code by its tokens: any number of `(`, one literal, any number of `)`, and a TypeScript
 * `as` / `satisfies` assertion after it, which a parser of JavaScript does not read.
 *
 * It is what {@link parseLiteralExpression} falls back on, and is exported to be compared with the reading
 * of the tree.
 *
 * @param code - The text of the expression
 * @returns The literal, or `null` when the code is not a literal
 */
export function parseLiteralByTokens(code: string): LiteralExpression | null {
	let tokens: ReturnType<typeof scriptParser>;
	try {
		tokens = scriptParser(code);
	} catch (error) {
		if (error instanceof SyntaxError) {
			return null;
		}
		throw error;
	}

	let index = 0;
	let opened = 0;
	while (tokens[index]?.value === '(' && tokens[index]?.type === 'Punctuator') {
		opened++;
		index++;
	}

	const negative = tokens[index]?.type === 'Punctuator' && tokens[index]?.value === '-';
	if (negative) {
		index++;
	}

	const token = tokens[index];
	if (!token) {
		return null;
	}
	index++;

	const literal = readLiteral(token.type as string, token.value, negative);
	if (!literal) {
		return null;
	}

	let closed = 0;
	while (tokens[index]?.value === ')' && tokens[index]?.type === 'Punctuator') {
		closed++;
		index++;
	}

	const rest = tokens[index];
	if (rest) {
		// Tokens after an `as` / `satisfies` are a type and not an expression, which has to end the code
		const isAssertion = rest.type === 'Identifier' && (rest.value === 'as' || rest.value === 'satisfies');
		return isAssertion && isType(tokens.slice(index + 1), opened - closed) ? literal : null;
	}

	return closed === opened ? literal : null;
}

/**
 * Tokens that a type is made of: names, keywords, literal types, and the punctuation of unions, generics,
 * arrays, objects and parentheses. An operator (`+`, `||`, `?`, `,`) makes it code that goes on after the
 * assertion, which is not a literal. `:` and `;` are the punctuation of an object type, so they are only
 * inside its braces: `"x" as A : b` is not a type.
 */
const TYPE_PUNCTUATORS = new Set(['|', '&', '<', '>', '>>', '[', ']', '.', '{', '}']);
const OBJECT_TYPE_PUNCTUATORS = new Set([':', ';']);

/**
 * @param tokens - The tokens after `as` / `satisfies`
 * @param depth - The number of parentheses that are still open
 * @returns `true` if the tokens are a type that closes the parentheses that are open, and nothing else
 */
function isType(tokens: ReturnType<typeof scriptParser>, depth: number): boolean {
	if (tokens.length === 0) {
		return false;
	}
	let open = depth;
	let braces = 0;
	for (const token of tokens) {
		if (token.type !== 'Punctuator') {
			continue;
		}
		if (token.value === '(') {
			open++;
		} else if (token.value === ')') {
			open--;
			if (open < 0) {
				return false;
			}
		} else if (token.value === '{') {
			braces++;
		} else if (token.value === '}') {
			braces--;
			if (braces < 0) {
				return false;
			}
		} else if (!TYPE_PUNCTUATORS.has(token.value) && !(braces > 0 && OBJECT_TYPE_PUNCTUATORS.has(token.value))) {
			return false;
		}
	}
	return open === 0 && braces === 0;
}

function readLiteral(type: string, value: string, negative: boolean): LiteralExpression | null {
	if (negative) {
		if (type !== 'Numeric') {
			return null;
		}
		return readNumber(value, true);
	}

	switch (type) {
		case 'String': {
			const literal = evaluate(value);
			return typeof literal === 'string' ? stringLiteral(literal) : null;
		}
		case 'Template': {
			// A template literal with a substitution is split into several tokens, and its first one does not end with a backquote
			if (value.length < 2 || !value.startsWith('`') || !value.endsWith('`')) {
				return null;
			}
			const cooked = evaluate(value);
			return typeof cooked === 'string' ? stringLiteral(cooked) : null;
		}
		case 'Numeric': {
			return readNumber(value, false);
		}
		case 'Boolean': {
			return value === 'true'
				? { type: 'boolean', value: true, key: 'true' }
				: { type: 'boolean', value: false, key: 'false' };
		}
		case 'Null': {
			return { type: 'null', value: null, key: 'null' };
		}
		case 'Identifier': {
			return value === 'undefined' ? { type: 'undefined', value: undefined, key: 'undefined' } : null;
		}
		default: {
			return null;
		}
	}
}

function readNumber(source: string, negative: boolean): LiteralExpression | null {
	const evaluated = evaluate(source);
	return typeof evaluated === 'number' || typeof evaluated === 'bigint' ? numberLiteral(evaluated, negative) : null;
}

function numberLiteral(evaluated: number | bigint, negative: boolean): LiteralExpression {
	if (typeof evaluated === 'bigint') {
		// A BigInt keeps its digits: the number is only the approximation of it
		const signed = negative ? -evaluated : evaluated;
		return { type: 'number', value: Number(signed), key: signed.toString() };
	}
	const value = negative ? -evaluated : evaluated;
	// `String(-0)` is `'0'`, which is what the key of `0` is
	return { type: 'number', value, key: String(value) };
}

function stringLiteral(value: string): LiteralExpression {
	return { type: 'string', value, key: JSON.stringify(value) };
}

/**
 * Evaluates the source of one literal token with the parser of the language, which resolves the
 * escapes (`\n`, `\x41`, `A`) and the notations of a number (`0x10`, `1e3`, `1_000`).
 *
 * The catch does not use `isFatalError`, for the reason that is given at {@link parseLiteralExpression}:
 * the `SyntaxError` of espree is the answer "not a literal".
 *
 * @returns The value of the literal, or `undefined` when the source is not a single literal whose
 * value the parser could tell (a template literal with an invalid escape has no cooked value)
 */
function evaluate(source: string): unknown {
	let program: any;
	try {
		program = parse(`(${source})`, { ecmaVersion: 'latest' });
	} catch (error) {
		if (error instanceof SyntaxError) {
			return undefined;
		}
		throw error;
	}
	const statement = program.body[0];
	const expression = statement?.type === 'ExpressionStatement' ? statement.expression : null;
	if (expression?.type === 'Literal') {
		return expression.value;
	}
	if (expression?.type === 'TemplateLiteral' && expression.expressions.length === 0) {
		return expression.quasis[0]?.value.cooked ?? undefined;
	}
	return undefined;
}
