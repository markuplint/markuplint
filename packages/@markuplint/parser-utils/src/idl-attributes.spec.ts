import { test, expect } from 'vitest';

import { searchIDLAttribute } from './idl-attributes.js';

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
		idlPropName: 'tabIndex',
		contentAttrName: 'tabindex',
	});
	expect(searchIDLAttribute('TabIndex')).toStrictEqual({
		idlPropName: 'tabIndex',
		contentAttrName: 'tabindex',
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
		idlPropName: 'attributeName',
		contentAttrName: 'attributeName',
	});
});
