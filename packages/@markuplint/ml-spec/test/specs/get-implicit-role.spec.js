const specs = require('@markuplint/html-spec');
const { createSelector } = require('@markuplint/selector');
const { createJSDOMElement } = require('@markuplint/test-tools');

const { getImplicitRole } = require('../../lib/specs/get-implicit-role');

function c(html, version) {
	const el = createJSDOMElement(html);
	return getImplicitRole(
		specs,
		el.localName,
		el.namespaceURI,
		version,
		selector => createSelector(selector, specs).match(el) !== false,
	);
}

describe('getImplicitRole', () => {
	test('the a element', () => {
		expect(c('<a></a>', '1.2')).toBe(false);
		expect(c('<a name="foo"></a>', '1.2')).toBe(false);
		expect(c('<a href></a>', '1.2')).toBe('link');
		expect(c('<a href=""></a>', '1.2')).toBe('link');
		expect(c('<a href="path/to"></a>', '1.2')).toBe('link');
	});

	test('the area element', () => {
		expect(c('<area />', '1.2')).toBe('generic');
		expect(c('<area shape="rect" />', '1.2')).toBe('generic');
		expect(c('<area href />', '1.2')).toBe('link');
		expect(c('<area href="" />', '1.2')).toBe('link');
		expect(c('<area href="path/to" />', '1.2')).toBe('link');
	});

	test('the article element', () => {
		expect(c('<article></article>', '1.2')).toBe('article');
	});

	test('the aside element', () => {
		expect(c('<aside></aside>', '1.2')).toBe('complementary');
	});

	test('the audio element', () => {
		expect(c('<audio></audio>', '1.2')).toBe(false);
	});

	test('the h1 element', () => {
		expect(c('<h1></h1>', '1.2')).toBe('heading');
	});

	test('the header element', () => {
		expect(c('<header></header>', '1.2')).toBe('banner');
		expect(c('<header><article></article></header>', '1.2')).toBe('generic');
		expect(c('<header><article></article></header>', '1.1')).toBe(false);
		expect(c('<header><div></div></header>', '1.2')).toBe('banner');
		expect(c('<header><div role="article"></div></header>', '1.2')).toBe('generic');
		expect(c('<header><div role="article"></div></header>', '1.1')).toBe(false);
	});

	test('the img element', () => {
		expect(c('<img />', '1.2')).toBe('img');
		expect(c('<img alt />', '1.2')).toBe('presentation');
		expect(c('<img alt="" />', '1.2')).toBe('presentation');
		expect(c('<img alt="foo" />', '1.2')).toBe('img');
		expect(c('<img aria-label="foo" />', '1.2')).toBe('img');
	});

	test('the form element', () => {
		expect(c('<form></form>', '1.2')).toBe(false);
		expect(c('<form></form>', '1.1')).toBe(false);
		expect(c('<form aria-label="foo"></form>', '1.2')).toBe('form');
		expect(c('<form aria-label="foo"></form>', '1.1')).toBe('form');
	});

	test('the section element', () => {
		expect(c('<section></section>', '1.2')).toBe(false);
		expect(c('<section aria-label="foo"></section>', '1.2')).toBe('region');
	});
});
