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
});
