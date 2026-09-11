import { describe, test, expectTypeOf, assertType } from 'vitest';

import { createRule } from './create-rule.js';

describe('createRule type inference (#808)', () => {
	// Scenario 4: No type args → T defaults to boolean → OK
	test('no type args: defaultValue is optional', () => {
		assertType(
			createRule({
				verify() {},
			}),
		);
	});

	// Scenario 3: Explicit boolean → defaultValue optional → OK
	test('boolean type: defaultValue is optional', () => {
		assertType(
			createRule<boolean>({
				verify() {},
			}),
		);

		assertType(
			createRule<boolean>({
				defaultValue: true,
				verify() {},
			}),
		);
	});

	// Scenario 2: Non-boolean without defaultValue → should ERROR
	test('non-boolean type: defaultValue is required', () => {
		// @ts-expect-error — Property 'defaultValue' is missing
		createRule<string | null>({ verify() {} });

		// @ts-expect-error — Property 'defaultValue' is missing
		createRule<string[]>({ verify() {} });

		// @ts-expect-error — Property 'defaultValue' is missing
		createRule<'lower' | 'upper'>({ verify() {} });

		// @ts-expect-error — Property 'defaultValue' is missing
		createRule<number>({ verify() {} });
	});

	// Scenario 1: Non-boolean with defaultValue: undefined → should ERROR
	test('non-boolean type: defaultValue cannot be undefined', () => {
		createRule<string | null>({
			// @ts-expect-error — Type 'undefined' is not assignable to type 'string | null'
			defaultValue: undefined,
			verify() {},
		});
	});

	// Non-boolean with proper defaultValue → OK
	test('non-boolean type: valid defaultValue compiles', () => {
		assertType(
			createRule<string | null>({
				defaultValue: 'hello',
				verify() {},
			}),
		);

		assertType(
			createRule<string | null>({
				defaultValue: null,
				verify() {},
			}),
		);

		assertType(
			createRule<string[]>({
				defaultValue: [],
				verify() {},
			}),
		);

		assertType(
			createRule<'lower' | 'upper'>({
				defaultValue: 'lower',
				verify() {},
			}),
		);

		assertType(
			createRule<number>({
				defaultValue: 42,
				verify() {},
			}),
		);
	});

	// With options — non-boolean still requires defaultValue
	test('non-boolean with options: defaultValue is required', () => {
		assertType(
			createRule<string[], { flag: boolean }>({
				defaultValue: [],
				defaultOptions: { flag: true },
				verify() {},
			}),
		);

		// @ts-expect-error — Property 'defaultValue' is missing
		createRule<string[], { flag: boolean }>({
			defaultOptions: { flag: true },
			verify() {},
		});
	});

	// With options — boolean does NOT require defaultValue
	test('boolean with options: defaultValue is optional', () => {
		assertType(
			createRule<boolean, { flag: boolean }>({
				defaultOptions: { flag: true },
				verify() {},
			}),
		);
	});

	// Return type preserves the seed shape (defaultValue is still optional on the type)
	test('return type is the seed', () => {
		const seed = createRule<string | null>({
			defaultValue: null,
			verify() {},
		});

		expectTypeOf(seed.defaultValue).toEqualTypeOf<string | null | undefined>();
	});
});
