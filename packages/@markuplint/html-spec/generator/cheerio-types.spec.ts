import type * as cheerio from 'cheerio';
import { describe, expectTypeOf, test } from 'vitest';

import type { AnyNode, Element } from './cheerio-types.ts';

// Type-level only: `yarn test:types` is what enforces these assertions.
declare const $: cheerio.CheerioAPI;

describe('cheerio-types', () => {
	test('Element is the node type cheerio returns for a selector', () => {
		expectTypeOf<Element>().not.toBeNever();
		expectTypeOf<ReturnType<typeof $<AnyNode, 'li'>>>().toEqualTypeOf<cheerio.Cheerio<Element>>();
		expectTypeOf<Element>().toHaveProperty('attribs').toEqualTypeOf<Record<string, string>>();
	});

	test('AnyNode is the node type cheerio.load accepts', () => {
		expectTypeOf<AnyNode>().not.toBeNever();
		expectTypeOf<AnyNode>().toExtend<Parameters<typeof cheerio.load>[0]>();
		expectTypeOf<Element>().not.toEqualTypeOf<AnyNode>();
		expectTypeOf<Element>().toExtend<AnyNode>();
	});
});
