import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
export type JSONSchema = JSONSchema7;

export const isJSONSchema = (value: JSONSchema7Definition | undefined): value is JSONSchema => {
	if (value != null && typeof value !== 'boolean') {
		value satisfies JSONSchema;
		return true;
	} else {
		return false;
	}
};

const definitionMap = new Map<string, Readonly<JSONSchema | JSONSchema7Definition>>();
const jsonCache = new Map<string, JSONSchema>();
const dereferencingSet = new Set<string>();

/**
 * Fetch JSON Schema or JSON Schema Definition
 * (Schema URL: https://example.com/.../config.schema.json )
 * (Schema Definition URL: https://example.com/.../config.schema.json#/definitions/rules )
 */
async function fetchSchema(urlString: string): Promise<JSONSchema | JSONSchema7Definition | undefined> {
	const url = new URL(urlString);
	const { hash } = url;
	const [urlWithoutHash] = urlString.split('#');

	try {
		let schema: JSONSchema | undefined;

		if (jsonCache.has(urlWithoutHash)) {
			schema = jsonCache.get(urlWithoutHash);
		} else {
			const res = await fetch(urlWithoutHash);
			schema = await res.json();
			if (schema === undefined) {
				return undefined;
			} else {
				jsonCache.set(urlWithoutHash, schema);
			}
		}

		if (schema && /^#\/definitions\//i.test(hash)) {
			const key = hash.replace(/^#\/definitions\//i, '');
			const def = schema.definitions?.[key];
			return def;
		}

		return schema;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(error);
	}
}

export async function fetchDereferencedSchema(url: URL) {
	const dereferencingSetKey = url.toString();
	// Avoid circular reference
	if (dereferencingSet.has(dereferencingSetKey)) {
		return;
	} else {
		dereferencingSet.add(dereferencingSetKey);
	}

	const schema = await fetchSchema(url.toString());
	if (schema === undefined) {
		return schema;
	}
	const result = await dereference(schema, url);

	dereferencingSet.delete(dereferencingSetKey);
	return result;
}

const isURLString = (value: string) => {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
};

export async function dereference(
	schema: JSONSchema | JSONSchema7Definition,
	url: URL,
): Promise<JSONSchema | JSONSchema7Definition> {
	// Already dereferenced
	if (schema == null || typeof schema === 'boolean') {
		return schema;
	}

	const { origin, pathname } = url;
	const urlWithoutHash = `${origin}${pathname}`;

	// Store the definitions
	if (schema.definitions) {
		for (const [key, definition] of Object.entries(schema.definitions)) {
			const definitionUrlString = `${urlWithoutHash}#/definitions/${key}`;
			const definitionUrl = new URL(definitionUrlString);
			const dereferenced = await dereference(definition, definitionUrl);
			if (dereferenced !== undefined) {
				definitionMap.set(definitionUrlString, dereferenced);
				schema.definitions[key] = dereferenced;
			}
		}
		delete schema.definitions;
	}

	// Dereference $ref
	if (schema.$ref) {
		const { $ref } = schema;
		const cachedRef = definitionMap.get($ref) ?? definitionMap.get(`${urlWithoutHash}${$ref}`);
		let ref = cachedRef;
		if (cachedRef === undefined) {
			if (isURLString(schema.$ref)) {
				// external reference
				ref = await fetchDereferencedSchema(new URL(schema.$ref));
			} else if (schema.$ref.startsWith('#/definitions/')) {
				// internal reference
				if (url.hash === schema.$ref) {
					// FIXME: circular reference is not supported
					ref = undefined;
				} else {
					ref = await fetchDereferencedSchema(new URL(`${urlWithoutHash}${schema.$ref}`));
				}
			}
		}

		delete schema.$ref;
		if (ref !== undefined) {
			Object.assign(schema, ref);
		}
	}

	if (typeof schema === 'boolean') {
		return schema;
	}

	if (schema.items !== undefined) {
		schema.items = Array.isArray(schema.items)
			? await Promise.all(schema.items.map(async item => await dereference(item, url)))
			: await dereference(schema.items, url);
	}
	if (schema.oneOf !== undefined) {
		schema.oneOf = await Promise.all(schema.oneOf.map(async item => await dereference(item, url)));
	}
	if (schema.properties !== undefined) {
		schema.properties = await recursive(schema.properties, url);
	}

	return schema;
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- intentionally mutable
async function recursive(properties: Record<string, JSONSchema7Definition>, url: URL) {
	const keys = Object.keys(properties);
	for (const key of keys) {
		properties[key] = await dereference(properties[key], url);
	}
	return properties;
}
