import { translator } from './translator';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ja = require('../locales/ja.json');

test('Listup', () => {
	// const t1 = translator();
	// expect(t1(['1', '2', '3'])).toBe('"1", "2", "3"');
	const t2 = translator(ja);
	expect(t2(['1', '2', '3'])).toBe('「1」「2」「3」');
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
});
