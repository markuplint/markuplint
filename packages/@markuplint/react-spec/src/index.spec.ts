import { describe, test, expect } from 'vitest';

import spec from './index.js';
import react18 from './react-18.js';

describe('the specs of React', () => {
	// `index.ts` spreads `react-18.ts` and then sets the field, so one declared in `react-18.ts` would be
	// overwritten there, and the two specs would differ without any error
	test('the spec for a React that outputs elements where they are written does not declare movedToHead', () => {
		expect(react18.movedToHead).toBeUndefined();
	});

	test('the default spec declares movedToHead and keeps what the other spec has', () => {
		expect(spec.movedToHead).not.toHaveLength(0);
		expect(spec.acceptedAttrNames).toBe(react18.acceptedAttrNames);
		expect(spec.literalValues).toStrictEqual(react18.literalValues);
		expect(spec.def).toStrictEqual(react18.def);
	});

	test('the default spec has the attributes that ask React to move an element, and the other spec does not', () => {
		const names = (s: typeof spec, element: string) =>
			Object.keys(s.specs?.find(el => el.name === element)?.attributes ?? {});
		expect(names(spec, 'style')).toStrictEqual(['href', 'precedence']);
		expect(names(spec, 'link')).toStrictEqual(['precedence']);
		expect(names(react18, 'style')).toStrictEqual([]);
		expect(names(react18, 'link')).toStrictEqual([]);
	});
});
