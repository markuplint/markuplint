import { createRequire } from 'node:module';

import { test, expect } from 'vitest';

import { taggedTemplateTranslator, translator } from './translator.js';

const require = createRequire(import.meta.url);

const ja = {
	locale: 'ja',
	...require('../locales/ja.json'),
};

test('Listup', () => {
	const t1 = translator();
	expect(t1(['1'])).toBe('"1"');
	expect(t1(['1', '2'])).toBe('"1", "2"');
	expect(t1(['1', '2', '3'])).toBe('"1", "2", "3"');
	expect(t1(['1'], true)).toBe('"1"');
	expect(t1(['1', '2'], true)).toBe('"1" and "2"');
	expect(t1(['1', '2', '3'], true)).toBe('"1", "2" and "3"');
	const t2 = translator(ja);
	expect(t2(['1', '2', '3'])).toBe('「1」「2」「3」');
	expect(t2(['1', '2', '3'], true)).toBe('「1」「2」「3」');
	expect(t2(['element', 'attribute', 'value'])).toBe('「要素」「属性」「値」');
});

test('One keyword', () => {
	const t = translator(ja);

	expect(t('element')).toBe('要素');
	expect(t('attribute')).toBe('属性');
});

test('No translate (EN is not affect)', () => {
	const t = translator();

	expect(t('the "{0}" {1}', 'autocomplete', 'attribute')).toBe('the "autocomplete" attribute');
	expect(t('the "{0*}" {1}', 'autocomplete', 'attribute')).toBe('the "autocomplete" attribute');
	expect(t('the "{0*}" {1*}', 'autocomplete', 'attribute')).toBe('the "autocomplete" attribute');
	expect(t('the "{0}" {1*}', 'autocomplete', 'attribute')).toBe('the "autocomplete" attribute');
	// It is an illegal syntax
	expect(t('the "{0**}" {1**}', 'autocomplete', 'attribute')).toBe('the "{0**}" {1**}');

	expect(t('element')).toBe('element');
	expect(t('%element%')).toBe('element');
	expect(t('%element%%')).toBe('%element%');
	expect(t('%%element%')).toBe('%element%');
	expect(t('%%element%%')).toBe('%element%');
	expect(t('element%%')).toBe('element%');
});

test('Complementize', () => {
	const t = translator(ja);

	expect(t('{0} is {1}', 'attribute', 'deprecated')).toBe('属性は非推奨です');
	expect(t('{0} is {1:c}', 'attribute', 'deprecated')).toBe('属性は非推奨です');
	expect(t('{0} is {1}', 'attribute', 'obsolete')).toBe('属性は廃止ずみです');
	expect(t('{0} is {1:c}', 'attribute', 'obsolete')).toBe('属性は廃止されています');
});

test('Complementize (EN is not affect)', () => {
	const t = translator();

	expect(t('{0} is {1}', 'attribute', 'deprecated')).toBe('attribute is deprecated');
	expect(t('{0} is {1:c}', 'attribute', 'deprecated')).toBe('attribute is deprecated');
	expect(t('{0} is {1}', 'attribute', 'obsolete')).toBe('attribute is obsolete');
	expect(t('{0} is {1:c}', 'attribute', 'obsolete')).toBe('attribute is obsolete');
});

test('Nesting', () => {
	const t = translator();
	expect(t('{0} must be {1}', t('{0} of {1}', 'attribute names', 'HTML elements'), 'lowercase')).toBe(
		'attribute names of HTML elements must be lowercase',
	);

	const t2 = translator(ja);
	expect(t2('{0} must be {1}', t2('{0} of {1}', 'attribute names', 'HTML elements'), 'lowercase')).toBe(
		'HTML要素の属性名は小文字にするべきです',
	);
});

test('Upper/Lowser Case', () => {
	const t = translator();
	expect(t("It doesn't need {0}", t('the {0}', 'attribute'))).toBe("It doesn't need the attribute");
	expect(t('"{0*}" ID', 'foo')).toBe('"foo" ID');
});

test('Tagged template version (@experimental)', () => {
	const _ = taggedTemplateTranslator(ja);
	expect(
		_`${
			//
			_`${
				//
				_`the ${'value'}`
			} of ${
				//
				_`the "${'id'}" ${'attribute'}`
			}`
		} is ${
			//
			'c:duplicated'
		}`,
	).toBe('属性「id」の値が重複しています');
});

test('ja', () => {
	const t = translator(ja);

	expect(
		t('{0} is unmatched with the below patterns: {1}', t('the "{0}" {1}', 'foo', 'class name'), '"bar", "boo"'),
	).toBe('クラス名「foo」は次のパターンにマッチしませんでした "bar", "boo"');
	expect(t('{0} is {1:c}', t('the "{0}" {1}', 'color', 'attribute'), 'obsolete')).toBe(
		'属性「color」は廃止されています',
	);
	expect(t('{0} is {1:c}', t('the "{0}" {1}', 'foo', 'element'), 'non-standard')).toBe('要素「foo」は非標準です');
	expect(t('Require {0}', 'doctype')).toBe('文書型が必要です');
	expect(t('Never {0} {1}', 'declare', 'obsolete doctype')).toBe('廃止された文書型を宣言しないでください');
	expect(
		t('{0} is {1:c}', t('{0} of {1}', t('the {0}', 'value'), t('the "{0}" {1}', 'id', 'attribute')), 'duplicated'),
	).toBe('属性「id」の値が重複しています');
	expect(
		t('{0} is {1:c}', t('the "{0}" {1}', 'foo', 'attribute'), 'disallowed') +
			t('. ') +
			t('Did you mean "{0}"?', 'bar'),
	).toBe('属性「foo」は許可されていません。「bar」ではありませんか？');
	expect(
		t(
			'{0} must not be {1}',
			t('{0} of {1}', t('the {0}', 'value'), t('the "{0}" {1}', 'foo', 'attribute')),
			'empty string',
		),
	).toBe('属性「foo」の値は空文字にするべきではありません');
	expect(
		t(
			'{0} expects {1}',
			t('the "{0}" {1}', 'foo', 'attribute'),
			t('{0} greater than {1}', 'floating-point number', 'zero'),
		),
	).toBe('属性「foo」にはゼロより大きい浮動小数点数が必要です');
	expect(
		t(
			'{0} expects {1:c}',
			t('the "{0}" {1}', 'foo', 'attribute'),
			t('in the range between {0} and {1}', 'zero', 'one'),
		),
	).toBe('属性「foo」はゼロから1の範囲である必要があります');
	expect(
		t(
			'{0} expects {1:c}',
			t('the "{0}" {1}', 'foo', 'attribute'),
			t(
				'{0:c} and {1:c}',
				t('{0} greater than {1}', 'non-negative integer', 'zero'),
				t('less than or equal to {0}', 1000),
			),
		),
	).toBe('属性「foo」はゼロより大きい正の整数且つ、1,000以下である必要があります');
	expect(
		t('{0} behaves the same as {1} if {2}', t('the "{0}" {1}', 'foo', 'attribute'), '-1', t('less than {0}', '-1')),
	).toBe('属性「foo」は-1未満の場合、-1と同じ振る舞いをします');
	expect(
		t('{0} expects {1:c}', t('the "{0}" {1}', 'foo', 'attribute'), t('either {0}', t(['A', 'B', 'C', 'D']))),
	).toBe('属性「foo」は「A」「B」「C」「D」のいずれかである必要があります');
	expect(t('{0} expects {1:c}', t('the "{0}" {1}', 'foo', 'attribute'), t('valid {0}', 'hash-name reference'))).toBe(
		'属性「foo」は妥当なハッシュ名参照である必要があります',
	);
	expect(t('{0} expects {1}', t('the "{0}" {1}', 'foo', 'attribute'), 'angle')).toBe('属性「foo」には角度が必要です');
	expect(
		t(
			'{0} expects {1:c}',
			t('the "{0}" {1}', 'foo', 'attribute'),
			t('{0} as {1}', t('{0} to {1}', '0%', '100%'), 'alpha channel value'),
		),
	).toBe('属性「foo」は不透明度として0%から100%である必要があります');
	expect(t('{0} should be {1}', t('the "{0}" {1}', 'foo', 'role'), 'top level')).toBe(
		'ロール「foo」はトップレベルにしたほうがよいです',
	);
	expect(t('Require {0}', t('unique {0}', 'accessible name'))).toBe('一意のアクセシブルな名前が必要です');
	expect(
		t(
			'{0} must be {1}',
			t('the "{0}" {1}', 'foo', 'element'),
			t('{0} of {1}', 'descendant', t('the "{0}" {1}', 'bar', 'element')),
		),
	).toBe('要素「foo」は要素「bar」の子孫にするべきです');
	expect(
		t(
			'{0} according to {1}',
			t(
				'{0} is {1:c}',
				t('{0} of {1}', t('the {0}', 'contents'), t('the "{0}" {1}', 'foo', 'element')),
				'invalid',
			),
			'the html specification',
		),
	).toBe('HTMLの仕様において、要素「foo」の内容は妥当ではありません');
	expect(t('{0} expects {1}', t('the "{0}" {1}', 'foo', 'attribute'), t('the "{0}" {1}', 'bar', 'element'))).toBe(
		'属性「foo」には要素「bar」が必要です',
	);
	expect(t('Require {0}', t('the "{0}" {1}', 'h1', 'element'))).toBe('要素「h1」が必要です');
	expect(t('{0} is {1:c}', t('the "{0}" {1}', 'h1', 'element'), 'duplicated')).toBe('要素「h1」が重複しています');
	expect(
		t(
			'{0} according to {1}',
			t('{0} does not exist', t('the "{0}" {1}', 'foo', 'role')),
			'the WAI-ARIA specification',
		),
	).toBe('WAI-ARIAの仕様において、ロール「foo」は存在しません');
	expect(t('{0} is {1}', t('the "{0}" {1}', 'foo', 'role'), 'the abstract role')).toBe(
		'ロール「foo」は抽象ロールです',
	);
	expect(
		t(
			'{0} is {1}',
			t('the "{0}" {1}', 'foo', 'role'),
			t('{0} of {1}', 'the implicit role', t('the "{0}" {1}', 'bar', 'element')),
		),
	).toBe('ロール「foo」は要素「bar」の暗黙のロールです');
	expect(
		t(
			'{0} according to {1}',
			t('Cannot overwrite {0}', t('{0} of {1}', t('the {0}', 'role'), t('the "{0}" {1}', 'foo', 'element'))),
			'ARIA in HTML specification',
		),
	).toBe('ARIA in HTMLの仕様において、要素「foo」のロールを上書きすることはできません');
	expect(
		t(
			'{0} according to {1}',
			t('Cannot overwrite {0} to {1}', t('the "{0}" {1}', 'foo', 'role'), t('the "{0}" {1}', 'bar', 'element')),
			'ARIA in HTML specification',
		),
	).toBe('ARIA in HTMLの仕様において、ロール「foo」を要素「bar」に上書きすることはできません');
	expect(
		t(
			'{0:c} on {1}',
			t('{0} is {1:c}', t('the "{0}" {1}', 'foo', 'ARIA property'), 'deprecated'),
			t('the "{0}" {1}', 'bar', 'role'),
		),
	).toBe('ロール「bar」では、ARIAプロパティ「foo」は非推奨です');
	expect(
		t(
			'{0:c} on {1}',
			t('{0} is {1:c}', t('the "{0}" {1}', 'foo', 'ARIA state'), 'disallowed'),
			t('the "{0}" {1}', 'bar', 'role'),
		),
	).toBe('ロール「bar」では、ARIAステート「foo」は許可されていません');
	expect(
		t('{0:c} on {1}', t('Require {0}', t('the "{0}" {1}', 'foo', 'ARIA state')), t('the "{0}" {1}', 'bar', 'role')),
	).toBe('ロール「bar」では、ARIAステート「foo」が必要です');
	expect(t('{0} is not {1}', t('the "{0}" {1}', 'foo', 'ARIA property'), 'global property')).toBe(
		'ARIAプロパティ「foo」はグローバルプロパティではありません',
	);
	expect(
		t(
			'{0} has {1}',
			t('the "{0}" {1}', 'foo', 'ARIA property'),
			t(
				'the same {0} as {1}',
				'semantics',
				t(
					'{0} or {1}',
					t('the current "{0}" {1}', 'bar', 'attribute'),
					t('the implicit "{0}" {1}', 'bar', 'attribute'),
				),
			),
		),
	).toBe('ARIAプロパティ「foo」は現在の属性「bar」もしくは暗黙の属性「bar」と同等のセマンティクスを持っています');
	expect(
		t(
			'{0} contradicts {1}',
			t('the "{0}" {1}', 'foo', 'ARIA state'),
			t('the current "{0}" {1}', 'bar', 'attribute'),
		),
	).toBe('ARIAステート「foo」は現在の属性「bar」と矛盾しています');
	expect(
		t(
			'{0} contradicts {1}',
			t('the "{0}" {1}', 'foo', 'ARIA property'),
			t('the implicit "{0}" {1}', 'bar', 'attribute'),
		),
	).toBe('ARIAプロパティ「foo」は暗黙の属性「bar」と矛盾しています');
	expect(t('It is {0}', 'default value')).toBe('デフォルト値です');
	expect(t('{0}. Or, {1}', 'A', 'B')).toBe('A。または、B');
});
