import type { JSONSchema4 } from 'json-schema';

export type Schema = JSONSchema4;

export async function getSchema(url: string) {
	const schema = await fetchSchema(url);
	const result = await a(schema, url);
	return result;
}

const defMap = new Map<string, JSONSchema4>();

async function a(object: JSONSchema4 | undefined, url: string): Promise<JSONSchema4 | undefined> {
	if (object == null) {
		return object;
	}

	delete object.$schema;

	const { origin, pathname } = new URL(url);
	const urlWithoutHash = `${origin}/${pathname}`;

	if (object.definitions) {
		const keys = Object.keys(object.definitions);
		for (const key of keys) {
			const obj = await a(object.definitions[key], url);
			if (!obj) {
				continue;
			}
			defMap.set(`${urlWithoutHash}#/definitions/${key}`, obj);
			object.definitions[key] = obj;
		}
		delete object.definitions;
	}

	object.properties = await recursive(object.properties, url);
	object.items = await items(object.items, url);
	object.oneOf = await all(object.oneOf, url);

	if (object.$ref) {
		const $ref = defMap.get(object.$ref) || defMap.get(`${urlWithoutHash}${object.$ref}`);
		if ($ref) {
			object = $ref;
			delete object.$ref;
		} else if (/^https?:\/\//i.test(object.$ref)) {
			const ref = await getSchema(object.$ref);
			if (ref) {
				object = ref;
			}
			delete object.$ref;
		} else {
			console.error(object, url);
			// object.__ref__ = `Failed: ${object.$ref}`;
			// object.__ref_url__ = url;
		}
	}

	return object;
}

async function recursive(properties: Record<string, JSONSchema4> | undefined, url: string) {
	if (properties == null) {
		return properties;
	}

	const keys = Object.keys(properties);
	for (const key of keys) {
		const obj = await a(properties[key], url);
		if (!obj) {
			continue;
		}
		properties[key] = obj;
	}

	return properties;
}

const jsonCache = new Map<string, JSONSchema4 | undefined>();

async function fetchSchema(url: string) {
	const { origin, pathname, hash } = new URL(url);
	const urlWithoutHash = `${origin}/${pathname}`;

	try {
		let schema: JSONSchema4 | undefined;

		if (jsonCache.has(url)) {
			schema = jsonCache.get(urlWithoutHash);
		} else {
			const res = await fetch(urlWithoutHash);
			schema = await res.json();
		}

		jsonCache.set(urlWithoutHash, schema);

		if (schema && /^#\/definitions\//i.test(hash)) {
			const key = hash.replace(/^#\/definitions\//i, '');
			return schema.definitions?.[key];
		}

		return schema;
	} catch (e) {
		return {
			error: String(e),
		};
	}
}

async function all(array: JSONSchema4[] | undefined, url: string) {
	if (!array) {
		return array;
	}
	const result: JSONSchema4[] = [];
	for (const item of array) {
		const item2 = await a(item, url);
		if (!item2) {
			continue;
		}
		result.push(item2);
	}
	return result;
}

async function items(array: JSONSchema4 | JSONSchema4[] | undefined, url: string) {
	if (!array) {
		return array;
	}
	if (Array.isArray(array)) {
		return all(array, url);
	}
	return a(array, url);
}
