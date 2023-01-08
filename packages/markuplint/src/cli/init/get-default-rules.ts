import type { DefaultRules } from './types';

import matter from 'gray-matter';
import fetch from 'node-fetch';

const RULES_SCHEMA_URL =
	'https://raw.githubusercontent.com/markuplint/markuplint/[VERSION]/packages/@markuplint/rules/schema.json';
const RULES_README_URL =
	'https://raw.githubusercontent.com/markuplint/markuplint/[VERSION]/packages/@markuplint/rules/src/[NAME]/README.md';

export async function getDefaultRules(version: string) {
	const json = await safeFetch(RULES_SCHEMA_URL, version);
	const rules: DefaultRules = {};
	await Promise.all(
		Object.entries(json.definitions.rules.properties).map(async ([name, rule]: [string, any]) => {
			const json = await safeFetch(rule.$ref.replace('/main/', '/[VERSION]/'), version);
			let severity = (Array.isArray(json.oneOf) ? json.oneOf : []).find((val: any) => val.properties)?.properties
				?.severity?.default;
			let category = json._category;

			if (severity == null || category == null) {
				const data = await getCatAndSeverityFromLegacy(version, name);
				severity = data.severity;
				category = data.category;
			}

			const defaultValue = severity === 'warning' ? false : json.definitions.value.default ?? true;

			rules[name] = {
				defaultValue,
				category,
			};
		}),
	);

	return rules;
}

async function safeFetch<T = Record<string, any>>(
	baseUrl: string,
	version: string,
	type: 'json' | 'md' = 'json',
): Promise<T> {
	const url = baseUrl.replace('[VERSION]', `v${version}`);
	const res = await fetch(url);

	if (!res.ok) {
		return safeFetch(baseUrl, '3.0.0', type);
	}

	if (type === 'json') {
		return (await res.json()) as T;
	}

	const md = await res.text();
	const { data } = matter(md);
	return data as T;
}

/**
 * Fallback fetching until 3.0.x
 *
 * @param version
 * @param name
 * @returns
 */
async function getCatAndSeverityFromLegacy(version: string, name: string) {
	const data = await safeFetch(RULES_README_URL.replace('[NAME]', name), version, 'md');
	return {
		category: data.category,
		severity: data.severity,
	};
}
