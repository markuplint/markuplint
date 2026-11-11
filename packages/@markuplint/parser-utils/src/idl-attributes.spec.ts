import { test, expect } from 'vitest';

import { searchIDLAttribute, suggestIDLAttribute } from './idl-attributes.js';

test('basic', () => {
	expect(searchIDLAttribute('class')).toStrictEqual({
		idlPropName: 'className',
		contentAttrName: 'class',
	});
	expect(searchIDLAttribute('for')).toStrictEqual({
		idlPropName: 'htmlFor',
		contentAttrName: 'for',
	});
	expect(searchIDLAttribute('className')).toStrictEqual({
		idlPropName: 'className',
		contentAttrName: 'class',
	});
	expect(searchIDLAttribute('htmlFor')).toStrictEqual({
		idlPropName: 'htmlFor',
		contentAttrName: 'for',
	});
	expect(searchIDLAttribute('tabindex')).toStrictEqual({
		idlPropName: 'tabIndex',
		contentAttrName: 'tabindex',
	});
	expect(searchIDLAttribute('tab-index')).toStrictEqual({
		idlPropName: undefined,
		contentAttrName: undefined,
	});
	expect(searchIDLAttribute('TabIndex')).toStrictEqual({
		idlPropName: undefined,
		contentAttrName: undefined,
	});
	expect(searchIDLAttribute('x')).toStrictEqual({
		idlPropName: 'x',
		contentAttrName: 'x',
	});
	expect(searchIDLAttribute('y')).toStrictEqual({
		idlPropName: 'y',
		contentAttrName: 'y',
	});
	expect(searchIDLAttribute('y1')).toStrictEqual({
		idlPropName: 'y1',
		contentAttrName: 'y1',
	});
	expect(searchIDLAttribute('y2')).toStrictEqual({
		idlPropName: 'y2',
		contentAttrName: 'y2',
	});
	expect(searchIDLAttribute('attribute-name')).toStrictEqual({
		idlPropName: undefined,
		contentAttrName: undefined,
	});
});

test('suggestIDLAttribute reads the spelling of a name without regard to case, to suggest the property', () => {
	expect(suggestIDLAttribute('tabIndex')).toBe('tabIndex');
	expect(suggestIDLAttribute('tabindex')).toBe('tabIndex');
	expect(suggestIDLAttribute('TABINDEX')).toBe('tabIndex');
	expect(suggestIDLAttribute('tab-index')).toBe('tabIndex');
	expect(suggestIDLAttribute('Stroke-Width')).toBe('strokeWidth');
	expect(suggestIDLAttribute('Y1')).toBe('y1');
	expect(suggestIDLAttribute('not-an-attribute')).toBeUndefined();
});

test('a name is mapped by its exact spelling, in the case it is written', () => {
	// The IDL name, and the content name
	expect(searchIDLAttribute('tabIndex')).toStrictEqual({ idlPropName: 'tabIndex', contentAttrName: 'tabindex' });
	expect(searchIDLAttribute('readOnly')).toStrictEqual({ idlPropName: 'readOnly', contentAttrName: 'readonly' });
	expect(searchIDLAttribute('readonly')).toStrictEqual({ idlPropName: 'readOnly', contentAttrName: 'readonly' });
	expect(searchIDLAttribute('strokeWidth')).toStrictEqual({
		idlPropName: 'strokeWidth',
		contentAttrName: 'stroke-width',
	});
	expect(searchIDLAttribute('stroke-width')).toStrictEqual({
		idlPropName: 'strokeWidth',
		contentAttrName: 'stroke-width',
	});
	// Another case is not that name: `TABINDEX`, `READONLY`, `Class` and `FOR` map to nothing
	const none = { idlPropName: undefined, contentAttrName: undefined };
	expect(searchIDLAttribute('TABINDEX')).toStrictEqual(none);
	expect(searchIDLAttribute('READONLY')).toStrictEqual(none);
	expect(searchIDLAttribute('Class')).toStrictEqual(none);
	expect(searchIDLAttribute('FOR')).toStrictEqual(none);
	expect(searchIDLAttribute('Y1')).toStrictEqual(none);
	// An event handler is its own name in lower case
	expect(searchIDLAttribute('onclick')).toStrictEqual({ idlPropName: 'onclick', contentAttrName: 'onclick' });
	expect(searchIDLAttribute('onClick')).toStrictEqual(none);
});

test('a content attribute of HTML that has a hyphen is mapped with its hyphen', () => {
	const acceptCharset = { idlPropName: 'acceptCharset', contentAttrName: 'accept-charset' };
	expect(searchIDLAttribute('acceptCharset')).toStrictEqual(acceptCharset);
	expect(searchIDLAttribute('accept-charset')).toStrictEqual(acceptCharset);
	const httpEquiv = { idlPropName: 'httpEquiv', contentAttrName: 'http-equiv' };
	expect(searchIDLAttribute('httpEquiv')).toStrictEqual(httpEquiv);
	expect(searchIDLAttribute('http-equiv')).toStrictEqual(httpEquiv);
	// The spelling without the hyphen is neither name
	const none = { idlPropName: undefined, contentAttrName: undefined };
	expect(searchIDLAttribute('acceptcharset')).toStrictEqual(none);
	expect(searchIDLAttribute('httpequiv')).toStrictEqual(none);
	// Either spelling of the content name suggests the property
	expect(suggestIDLAttribute('acceptcharset')).toBe('acceptCharset');
	expect(suggestIDLAttribute('accept-charset')).toBe('acceptCharset');
	expect(suggestIDLAttribute('httpequiv')).toBe('httpEquiv');
	expect(suggestIDLAttribute('http-equiv')).toBe('httpEquiv');
});
