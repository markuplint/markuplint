import { AnyMLRule, Document } from '@markuplint/ml-core';
import { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';
import { MLCore, MLParseError, Ruleset } from '@markuplint/ml-core';
import { ParserOptions, RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';
import { I18n } from '@markuplint/i18n';
import { MLFile } from '@markuplint/file-resolver';
import { MLMarkupLanguageParser } from '@markuplint/ml-ast';

export async function lintFile(
	parser: MLMarkupLanguageParser,
	sourceCode: string,
	ruleset: Ruleset,
	rules: AnyMLRule[],
	i18nSettings: I18n,
	schemas: readonly [MLMLSpec, ...ExtendedSpec[]],
	parserOptions: ParserOptions,
	file: MLFile,
	fix: boolean,
) {
	let results: VerifiedResult[] = [];
	let fixedCode = sourceCode;
	let document: Document<RuleConfigValue, unknown> | null = null;

	try {
		const core = new MLCore(parser, sourceCode, ruleset, rules, i18nSettings, schemas, parserOptions, file.path);
		results = await core.verify(fix);
		fixedCode = core.document.toString();
		document = core.document;
	} catch (err) {
		if (err instanceof MLParseError) {
			results = [
				{
					ruleId: 'parse-error',
					severity: 'error',
					message: err.message,
					col: err.col,
					line: err.line,
					raw: err.raw,
				},
			];
		} else {
			throw err;
		}
	}

	return {
		results,
		fixedCode,
		document,
	};
}
