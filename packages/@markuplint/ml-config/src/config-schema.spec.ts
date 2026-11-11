import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, test, expect } from 'vitest';

type SchemaObject = {
	readonly properties?: Readonly<Record<string, unknown>>;
	readonly required?: readonly string[];
	readonly additionalProperties?: boolean;
};

const schema = JSON.parse(
	readFileSync(fileURLToPath(new URL('../../../../config.schema.json', import.meta.url)), 'utf8'),
) as {
	readonly definitions: {
		readonly pretender: SchemaObject;
		readonly pretenderAttr: {
			readonly properties: { readonly value: { readonly oneOf: readonly SchemaObject[] } };
		};
	};
};

describe('config.schema.json', () => {
	test('pretenderAttr accepts omitIfMissing next to fromAttr', () => {
		const fromAttrVariant = schema.definitions.pretenderAttr.properties.value.oneOf.find(variant =>
			variant.required?.includes('fromAttr'),
		);

		expect(fromAttrVariant?.additionalProperties).toBe(false);
		expect(Object.keys(fromAttrVariant?.properties ?? {})).toStrictEqual(['fromAttr', 'omitIfMissing']);
		expect(fromAttrVariant?.properties?.omitIfMissing).toStrictEqual({ const: true });
	});

	test('pretenderAttr accepts an expression that the attribute is written as', () => {
		const expressionVariant = schema.definitions.pretenderAttr.properties.value.oneOf.find(variant =>
			variant.required?.includes('expression'),
		);

		expect(expressionVariant?.additionalProperties).toBe(false);
		expect(expressionVariant?.required).toStrictEqual(['expression']);
		expect(expressionVariant?.properties).toStrictEqual({ expression: { type: 'string' } });
	});

	test('pretenderAttr still accepts a string, fromAttr and dynamic', () => {
		const variants = schema.definitions.pretenderAttr.properties.value.oneOf;

		expect(variants.some(variant => (variant as { type?: string }).type === 'string')).toBe(true);
		expect(variants.some(variant => variant.required?.includes('fromAttr'))).toBe(true);
		expect(variants.some(variant => variant.required?.includes('dynamic'))).toBe(true);
	});

	test('pretender accepts every property of `Pretender`, the ones the scanner writes included (issue #4289)', () => {
		const pretender = schema.definitions.pretender;

		expect(pretender.additionalProperties).toBe(false);
		expect(Object.keys(pretender.properties ?? {})).toStrictEqual(['selector', 'as', 'filePath', 'localName']);
	});
});
