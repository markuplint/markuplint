const { resolveNamespace } = require('../../lib/utils/resolve-namespace');

test('tag', () => {
	expect(resolveNamespace('a')).toStrictEqual({
		localName: 'a',
		localNameWithNS: 'a',
		namespace: 'html',
		namespaceURI: 'http://www.w3.org/1999/xhtml',
	});
	expect(resolveNamespace('svg:a')).toStrictEqual({
		localName: 'a',
		localNameWithNS: 'svg:a',
		namespace: 'svg',
		namespaceURI: 'http://www.w3.org/2000/svg',
	});
});

test('attr', () => {
	expect(resolveNamespace('href', 'http://www.w3.org/1999/xhtml')).toStrictEqual({
		localName: 'href',
		localNameWithNS: 'href',
		namespace: 'html',
		namespaceURI: 'http://www.w3.org/1999/xhtml',
	});
	expect(resolveNamespace('href', 'http://www.w3.org/2000/svg')).toStrictEqual({
		localName: 'href',
		localNameWithNS: 'svg:href',
		namespace: 'svg',
		namespaceURI: 'http://www.w3.org/2000/svg',
	});
	expect(resolveNamespace('xlink:href', 'http://www.w3.org/2000/svg')).toStrictEqual({
		localName: 'href',
		localNameWithNS: 'xlink:href',
		namespace: 'xlink',
		namespaceURI: 'http://www.w3.org/1999/xlink',
	});
});
