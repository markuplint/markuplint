// @ts-ignore
import { tokenize } from 'espree';

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

export function removeQuote(str: string) {
	const quote = str[0];
	if (quote !== '"' && quote !== "'" && quote !== '`') {
		return str;
	}
	if (str.at(-1) !== quote) {
		return str;
	}
	return str.slice(1, -1);
}

export type ScriptTokenType = {
	type: 'Identifier' | 'Boolean' | 'Numeric' | 'String' | 'Template' | 'Punctuator';
	value: string;
};
