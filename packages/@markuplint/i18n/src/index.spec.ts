import { I18n } from './';

test('Complementize', async () => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const ja = require('../locales/ja.json');
	const t = I18n.create(ja).translator();

	expect(t('{0} is {1}', 'attribute', 'deprecated')).toBe('属性は非推奨です');
	expect(t('{0} is {1:c}', 'attribute', 'deprecated')).toBe('属性は非推奨です');
	expect(t('{0} is {1}', 'attribute', 'obsolete')).toBe('属性は廃止ずみです');
	expect(t('{0} is {1:c}', 'attribute', 'obsolete')).toBe('属性は廃止されています');
});
