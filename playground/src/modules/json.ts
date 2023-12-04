import stripJsonComments from 'strip-json-comments';

type JsonPrimitive = boolean | number | string | null;
type JsonArray = readonly JsonPrimitive[] | readonly JsonObject[];
type JsonObject = Readonly<{
	[key: string]: JsonPrimitive | JsonObject | JsonArray;
}>;
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/** type safe JSON.parse */
export const parseJson = (json: string): JsonValue => {
	return JSON.parse(json);
};

export const isJsonArray = (json: JsonValue): json is JsonArray => {
	if (Array.isArray(json)) {
		return true;
	} else {
		return false;
	}
};

export const isJsonObject = (json: JsonValue): json is JsonObject => {
	if (typeof json === 'object' && json !== null && !isJsonArray(json)) {
		json satisfies JsonObject;
		return true;
	} else {
		return false;
	}
};

export const parseJsonc = (maybeJson: string): JsonObject | null => {
	try {
		const parsed = parseJson(stripJsonComments(maybeJson));
		if (isJsonObject(parsed)) {
			return parsed;
		} else {
			return null;
		}
	} catch {
		return null;
	}
};
