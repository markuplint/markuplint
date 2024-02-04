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

export type ScriptTokenType = {
	type: 'Identifier' | 'Boolean' | 'Numeric' | 'String' | 'Template' | 'Punctuator';
	value: string;
};
