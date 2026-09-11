// @ts-nocheck

// This script OVERWRITES `schemas/global-attributes.schema.json` and
// `schemas/attributes.schema.json`. Never hand-edit those two files — JSON
// cannot carry a "DO NOT MODIFY" header, and any manual change is blown away
// the next time this runs (`schema:json` / `yarn up:schema`). All edits must
// live in this file (or in ./global-attribute.data.ts for category and
// attribute lists).
//
// The `AttributeType` definition below `$ref`s `@markuplint/types`'s
// `types.schema.json`, which that package must generate first. When
// cross-package references may be stale, run `yarn up:schema` from the
// repository root (it regenerates packages in dependency order) instead of
// this package's `schema` script.

import fs from 'node:fs';
import path from 'node:path';

import { globalAttrs } from './global-attribute.data.js';

const defs = {};
const properties = {};
const select = {};
for (const key of Object.keys(globalAttrs)) {
	const _key = key.replace('#', '');
	const value = globalAttrs[key];
	defs[_key] = {
		type: 'string',
		enum: value.attrs,
	};
	properties[key] = {
		description: value.description,
		type: 'object',
		required: value.attrs,
		propertyNames: {
			$ref: `#/definitions/${_key}`,
		},
		patternProperties: {
			'.+': {
				$ref: './attributes.schema.json#/definitions/AttributeJSON',
			},
		},
	};
	switch (key) {
		case '#HTMLGlobalAttrs':
		case '#ARIAAttrs': {
			select[key] = {
				type: 'boolean',
			};
			break;
		}
		case '#GlobalEventAttrs': {
			select[key] = {
				oneOf: [
					{
						type: 'boolean',
					},
					{
						type: 'array',
						minItems: 0,
						uniqueItems: true,
						items: {
							$ref: `./global-attributes.schema.json#/definitions/${_key}`,
						},
					},
				],
			};
			break;
		}
		default: {
			select[key] = {
				type: 'array',
				minItems: 0,
				uniqueItems: true,
				items: {
					$ref: `./global-attributes.schema.json#/definitions/${_key}`,
				},
			};
		}
	}
}

fs.writeFileSync(
	path.resolve(import.meta.dirname, '..', 'schemas', 'global-attributes.schema.json'),
	JSON.stringify({
		definitions: {
			category: {
				type: 'string',
				enum: Object.keys(globalAttrs),
			},
			...defs,
		},
		type: 'object',
		additionalProperties: false,
		propertyNames: {
			$ref: '#/definitions/category',
		},
		required: Object.keys(globalAttrs),
		properties,
	}),
);

fs.writeFileSync(
	path.resolve(import.meta.dirname, '..', 'schemas', 'attributes.schema.json'),
	JSON.stringify({
		definitions: {
			AttributeName: {
				type: 'string',
				pattern: '^(?:(xml|xlink):)?[a-z][a-zA-Z0-9-]*$',
			},
			AttributeCondition: {
				$ref: '#/definitions/Selectors',
			},
			Selectors: {
				oneOf: [
					{
						type: 'string',
					},
					{
						type: 'array',
						minItems: 2,
						items: {
							type: 'string',
						},
					},
				],
			},
			AttributeType: {
				$ref: '../../types/types.schema.json#/definitions/type',
			},
			// #3685: ConditionalAttributeType lets an attribute declare different
			// value types depending on another attribute's value (e.g. `input[value]`
			// is a color when `type=color`, a URL when `type=url`). The type shipped
			// in v5.0 (#3685); runtime resolution is implemented in
			// `@markuplint/rules` (`input[value]` by `type` in #3598, `link[as]` by
			// `rel` in #3189).
			ConditionalAttributeType: {
				description:
					"Declares that an attribute value type depends on a condition (a CSS selector) matched against the owning element. Used when an attribute's valid values differ based on the value of another attribute — for example, `<input value>` is `<'color'>` when `type=color`, or a `URL` when `type=url`. Shipped type-only in v5.0 (#3685); validation logic is deferred to #3598 and #3189.",
				type: 'object',
				additionalProperties: false,
				required: ['condition', 'type'],
				properties: {
					condition: {
						$ref: '#/definitions/AttributeCondition',
					},
					type: {
						oneOf: [
							{
								$ref: '#/definitions/AttributeType',
							},
							{
								type: 'array',
								minItems: 1,
								uniqueItems: true,
								items: {
									$ref: '#/definitions/AttributeType',
								},
							},
						],
					},
				},
			},
			AttributeJSON: {
				type: 'object',
				additionalProperties: false,
				minProperties: 1,
				properties: {
					type: {
						oneOf: [
							{
								$ref: '#/definitions/AttributeType',
							},
							{
								type: 'array',
								minItems: 1,
								uniqueItems: true,
								items: {
									$ref: '#/definitions/AttributeType',
								},
							},
							{
								type: 'array',
								minItems: 1,
								uniqueItems: true,
								items: {
									$ref: '#/definitions/ConditionalAttributeType',
								},
							},
						],
					},
					defaultValue: { type: 'string' },
					// Status-flag semantics (deprecated/experimental here; obsolete and
					// nonStandard exist only on the TS types) are documented on
					// `ElementSpec`/`Attribute` in ../src/types/index.ts.
					deprecated: { type: 'boolean' },
					required: {
						oneOf: [
							{
								type: 'boolean',
							},
							{
								$ref: '#/definitions/AttributeCondition',
							},
						],
					},
					requiredEither: {
						type: 'array',
						items: {
							type: 'string',
						},
					},
					noUse: {
						type: 'boolean',
					},
					condition: {
						$ref: '#/definitions/AttributeCondition',
					},
					ineffective: {
						$ref: '#/definitions/Selectors',
					},
					animatable: {
						type: 'boolean',
					},
					experimental: {
						type: 'boolean',
					},
				},
			},
			GlobalAttributes: {
				type: 'object',
				additionalProperties: false,
				propertyNames: {
					type: 'string',
					enum: Object.keys(globalAttrs),
				},
				properties: {
					...select,
				},
			},
			Attributes: {
				type: 'object',
				additionalProperties: false,
				propertyNames: {
					$ref: '#/definitions/AttributeName',
				},
				patternProperties: {
					'.*': {
						$ref: '#/definitions/AttributeJSON',
					},
				},
			},
		},
		type: 'object',
		additionalProperties: false,
		required: ['tag', 'attributes'],
		properties: {
			tag: { type: 'string' },
			global: {
				$ref: '#/definitions/GlobalAttributes',
			},
			attributes: {
				$ref: '#/definitions/Attributes',
			},
		},
	}),
);
