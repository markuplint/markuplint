import { translator } from './translator';

const ja = {
	locale: 'ja',
	...require('../locales/ja.json'),
};

test('Listup', () => {
	// const t1 = translator();
	// expect(t1(['1', '2', '3'])).toBe('"1", "2", "3"');
	const t2 = translator(ja);
	expect(t2(['1', '2', '3'])).toBe('「1」「2」「3」');
});

test('One keyword', () => {
	const t = translator(ja);

	expect(t('element')).toBe('要素');
	expect(t('attribute')).toBe('属性');
});

test('Complementize', () => {
	const t = translator(ja);

	expect(t('{0} is {1}', 'attribute', 'deprecated')).toBe('属性は非推奨です');
	expect(t('{0} is {1:c}', 'attribute', 'deprecated')).toBe('属性は非推奨です');
	expect(t('{0} is {1}', 'attribute', 'obsolete')).toBe('属性は廃止ずみです');
	expect(t('{0} is {1:c}', 'attribute', 'obsolete')).toBe('属性は廃止されています');
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
	expect(t('Never {0} {1}', 'declarate', 'obsolete doctype')).toBe('廃止された文書型を宣言しないでください');
	expect(
		t('{0} is {1:c}', t('{0} of {1}', t('the {0}', 'value'), t('the "{0}" {1}', 'id', 'attribute')), 'duplicated'),
	).toBe('属性「id」のその値が重複しています');
	expect(
		t('{0} is {1:c}', t('the "{0}" {1}', 'foo', 'attribute'), 'disallow') +
			t('. ') +
			t('Did you mean "{0}"?', 'bar'),
	).toBe('属性「foo」は許可されていません。「bar」ですか？');
	expect(
		t(
			'{0} must not be {1}',
			t('{0} of {1}', t('the {0}', 'value'), t('the "{0}" {1}', 'foo', 'attribute')),
			'empty string',
		),
	).toBe('属性「foo」のその値は空文字にするべきではありません');
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
	).toBe('HTMLの仕様において、要素「foo」のその内容は妥当ではありません');
	expect(t('{0} expects {1}', t('the "{0}" {1}', 'foo', 'attribute'), t('the "{0}" {1}', 'bar', 'element'))).toBe(
		'属性「foo」には要素「bar」が必要です',
	);
	expect(t('Require {0}', t('the "{0}" {1}', 'h1', 'element'))).toBe('要素「h1」が必要です');
	expect(t('{0} is {1:c}', t('the "{0}" {1}', 'h1', 'element'), 'duplicated')).toBe('要素「h1」が重複しています');
});
