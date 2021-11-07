import { translator } from './';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ja = require('../locales/ja.json');

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
