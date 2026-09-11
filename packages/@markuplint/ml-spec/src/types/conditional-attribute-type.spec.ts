import type { AttributeJSON, ConditionalAttributeType } from './attributes.js';
import type { Attribute } from './index.js';

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, test, expect } from 'vitest';

/**
 * Tests for the `ConditionalAttributeType` type (#3685).
 *
 * v5.0 ships the type-only extension — validation logic lands in follow-up
 * issues (#3598, #3189). The authoritative contract is the TypeScript types
 * generated from `attributes.schema.json`; downstream packages consume those
 * types, not the schema file itself.
 *
 * - The schema-level check below is a smoke test only, to guard against the
 *   single source of truth dropping the definition.
 * - The shape tests exercise the real contract: if `json2ts` ever produces
 *   drifted output, these tests fail at build time (TypeScript compile error)
 *   rather than passing silently.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, '../../schemas/attributes.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as {
	readonly definitions: Record<string, unknown>;
};

describe('attributes.schema.json — schema-level smoke test (#3685)', () => {
	test('declares ConditionalAttributeType under #/definitions', () => {
		expect(schema.definitions).toHaveProperty('ConditionalAttributeType');
	});
});

describe('generated types — ConditionalAttributeType shape (#3685)', () => {
	test('ConditionalAttributeType accepts a single AttributeType', () => {
		const entry: ConditionalAttributeType = {
			condition: "[type='color' i]",
			type: "<'color'>",
		};
		expect(entry.condition).toBe("[type='color' i]");
		expect(entry.type).toBe("<'color'>");
	});

	test('ConditionalAttributeType accepts a non-empty tuple of AttributeTypes', () => {
		const entry: ConditionalAttributeType = {
			condition: "[type='number' i]",
			type: ['Number', 'Any'],
		};
		expect(Array.isArray(entry.type)).toBe(true);
		expect((entry.type as readonly string[]).length).toBe(2);
	});

	test('ConditionalAttributeType.condition accepts an array of selectors', () => {
		const entry: ConditionalAttributeType = {
			condition: ["[type='url' i]", "[type='email' i]"],
			type: 'URL',
		};
		expect(Array.isArray(entry.condition)).toBe(true);
	});

	test('AttributeJSON.type accepts a ConditionalAttributeType[] variant', () => {
		const spec: AttributeJSON = {
			type: [
				{ condition: "[type='color' i]", type: "<'color'>" },
				{ condition: "[type='url' i]", type: 'URL' },
				{ condition: "[type='number' i]", type: [{ type: 'integer' }] },
			],
		};
		expect(Array.isArray(spec.type)).toBe(true);
		expect((spec.type as readonly ConditionalAttributeType[])[0]?.condition).toBe("[type='color' i]");
	});

	test('AttributeJSON.type still accepts a single AttributeType (backward compatible)', () => {
		const spec: AttributeJSON = { type: 'URL' };
		expect(spec.type).toBe('URL');
	});

	test('AttributeJSON.type still accepts an AttributeType tuple (backward compatible)', () => {
		const spec: AttributeJSON = { type: ['URL', 'Any'] };
		expect(Array.isArray(spec.type)).toBe(true);
		expect((spec.type as readonly string[])[0]).toBe('URL');
	});

	test('merged Attribute.type accepts a ConditionalAttributeType[] variant', () => {
		const attr: Attribute = {
			name: 'value',
			type: [{ condition: "[type='color' i]", type: "<'color'>" }],
		};
		expect(attr.name).toBe('value');
		expect(Array.isArray(attr.type)).toBe(true);
	});

	test('merged Attribute.type still accepts a scalar AttributeType', () => {
		const attr: Attribute = { name: 'href', type: 'URL' };
		expect(attr.type).toBe('URL');
	});
});
