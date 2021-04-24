import * as markuplint from 'markuplint';
import { Config, RuleConfigValue, VerifiedResult } from '@markuplint/ml-config';
import { Document, Element, MLRule, convertRuleset } from '@markuplint/ml-core';
import { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';
import { parse } from '@markuplint/html-parser';

export function createElement(htmlFragmentString: string) {
	const ast = parse(htmlFragmentString.trim());
	const ruleset = convertRuleset({});
	const document = new Document(ast, ruleset, dummySchemas());
	const el = document.nodeList[0];
	if (el instanceof Element) {
		return el;
	}
	return null;
}

function dummySchemas() {
	// @ts-ignore
	return [{}, {}] as [MLMLSpec, ...ExtendedSpec[]];
}

export async function testAsyncAndSyncVerify(
	html: string,
	config: Config,
	rules: MLRule<RuleConfigValue, unknown>[],
	locale: string,
	result?: VerifiedResult[],
): Promise<void>
// eslint-disable-next-line no-redeclare
export async function testAsyncAndSyncVerify<T>(
	html: string,
	config: Config,
	rules: MLRule<RuleConfigValue, unknown>[],
	locale: string,
	result: T,
	mapper: (results: VerifiedResult[]) => T,
): Promise<void>
// eslint-disable-next-line no-redeclare
export async function testAsyncAndSyncVerify<T = VerifiedResult[]>(
	html: string,
	config: Config,
	rules: MLRule<RuleConfigValue, unknown>[],
	locale: string,
	result: T = ([] as unknown) as T,
	mapper?: (results: VerifiedResult[]) => T,
): Promise<void> {
	[await markuplint.verify(html, config, rules, locale), markuplint.verifySync(html, config, rules, locale)].forEach(
		results => {
			expect(mapper ? mapper(results) : results).toStrictEqual(result);
		},
	);
}

export async function testAsyncAndSyncFix(
	html: string,
	config: Config,
	rules: MLRule<RuleConfigValue, unknown>[],
	locale: string,
	result: string,
) {
	[await markuplint.fix(html, config, rules, locale), markuplint.fixSync(html, config, rules, locale)].forEach(
		fixed => {
			expect(fixed).toBe(result);
		},
	);
}
