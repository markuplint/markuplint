import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const map = (code: string) => nodeListToDebugMaps(parser.parse(code).nodeList);

/**
 * Characterizes how an expression that contains elements is split. An expression that ends
 * with an element has that element's markup in its closing `MustacheTag` (`<b></b>}`), the same
 * layout the `#739` spec in `parser.spec.ts` pins down for `<input type={type} />}`.
 */
describe('expressions that contain elements', () => {
	test('an expression that is only an element is a single MustacheTag around it', () => {
		expect(map('<p>{<b></b>}</p>')).toEqual([
			'[1:1]>[1:4](0,3)p: <p>',
			'[1:4]>[1:13](3,12)#ps:MustacheTag: {<b></b>}',
			'[1:5]>[1:8](4,7)b: <b>',
			'[1:8]>[1:12](7,11)b: </b>',
			'[1:13]>[1:17](12,16)p: </p>',
		]);
	});

	test('a conditional expression with two elements', () => {
		expect(map('<p>{cond ? <a></a> : <b></b>}</p>')).toEqual([
			'[1:1]>[1:4](0,3)p: <p>',
			'[1:4]>[1:12](3,11)#ps:MustacheTag: {cond␣?␣',
			'[1:12]>[1:15](11,14)a: <a>',
			'[1:15]>[1:19](14,18)a: </a>',
			'[1:22]>[1:25](21,24)b: <b>',
			'[1:22]>[1:30](21,29)#ps:MustacheTag: <b></b>}',
			'[1:25]>[1:29](24,28)b: </b>',
			'[1:30]>[1:34](29,33)p: </p>',
		]);
	});

	test('a logical expression with an element', () => {
		expect(map('<p>{cond && <b></b>}</p>')).toEqual([
			'[1:1]>[1:4](0,3)p: <p>',
			'[1:4]>[1:13](3,12)#ps:MustacheTag: {cond␣&&␣',
			'[1:13]>[1:16](12,15)b: <b>',
			'[1:13]>[1:21](12,20)#ps:MustacheTag: <b></b>}',
			'[1:16]>[1:20](15,19)b: </b>',
			'[1:21]>[1:25](20,24)p: </p>',
		]);
	});

	test('a self-closing script produces no text node', () => {
		expect(map('<script />')).toEqual(['[1:1]>[1:11](0,10)script: <script␣/>']);
	});
});
