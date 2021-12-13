import { isAbsURL } from './is-abs-url';

const is = isAbsURL();

test('valid', () => {
	expect(is('https://markuplint.dev')).toBe(true);
	expect(is('markuplint.dev')).toBe(false);
});
