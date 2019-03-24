import { MLCore, convertRuleset } from '../../../packages/@markuplint/ml-core/src';
import * as Parser from '../../../packages/@markuplint/html-parser/src';
import { Config } from '../../../packages/@markuplint/ml-config/src';
import rules from '../../../packages/@markuplint/rules/src';
import { LocaleSet, Messenger } from '../../../packages/@markuplint/i18n/src';

const defaultConfig: Config = {
	rules: {
		indentation: 'tab',
		'self-closing-tag': true,
		'omitted-closing-tag': true,
		'attr-value-quotes': true,
		'case-sensitive-tag-name': true,
		'case-sensitive-attr-name': true,
		'attr-spasing': true,
		'attr-equal-space-before': true,
		'attr-equal-space-after': true,
		'multiline-tag': true,
		'multiline-attr': true,
		'indentation-attr': true,
		'void-element-closing': true,
		'comment-spasing': true,
		path: true,
		'data-attr-naming': true,
		'event-attr': true,
		'parse-error': true,
		'character-reference': true,
		doctype: true,
		'required-element': true,
		'deprecated-element': true,
		'permitted-contents': true,
		'permitted-role': true,
		'attr-duplication': true,
		'required-attr': true,
		'deprecated-attr': true,
		'deprecated-global-attr': true,
		'deprecated-aria-attr': true,
		'id-duplication': true,
		comment: true,
		'external-link': true,
		'required-h1': true,
		'heading-levels-skipping': true,
		'heading-in-sectioning-content': true,
		'heading-in-sectioning-root': true,
		'landmark-roles': true,
		labels: true,
		'empty-alt-attr': true,
		'role-structure-tab': true,
		'async-attr-in-script': true,
		'class-naming': true,
		'required-class-elements': true,
		'custom-element-naming': true,
		'textlint/textlint': false,
	},
	nodeRules: [
		{
			tagName: 'head',
			rules: {
				indentation: {
					value: 'tab',
					severity: 'warning',
					option: { align: true, 'indent-nested-nodes': false },
				},
			},
		},
		{
			tagName: 'body',
			rules: {
				indentation: false,
			},
		},
	],
};

export default async function lint(code: string) {
	const ruleset = convertRuleset(defaultConfig);
	const messenger = await getMessenger(navigator.language);
	const ml = new MLCore(Parser, code, ruleset, rules, messenger);
	const result = await ml.verify();
	return result;
}

export async function getMessenger(locale?: string) {
	locale = locale || 'ja';
	const localeSet: LocaleSet | null = locale
		? await import(`@markuplint/i18n/locales/${locale}`).catch(() => null)
		: null;
	return Messenger.create(localeSet);
}
