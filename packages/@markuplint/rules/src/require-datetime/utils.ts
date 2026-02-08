import type { DateTime, DateTimeData, DateTimeKey, Lang } from './types.js';

import * as chrono from 'chrono-node';

/** Default set of languages to try when parsing natural language datetime text. */
const defaultLangs: Lang[] = ['en', 'ja', 'fr', 'nl', 'ru', 'de', 'pt', 'zh'];

/**
 * Parses natural language datetime text into structured datetime data.
 *
 * Tries multiple locale parsers and returns the first successful parse result
 * with only the certain (non-implied) date/time components included.
 *
 * @param content - The text content to parse as a datetime.
 * @param langs - Locale codes to attempt parsing with.
 * @param base - Optional reference date for relative date parsing (e.g., "tomorrow").
 * @returns Parsed datetime data with timezone, or `null` if parsing fails.
 */
export function parseADatetime(content: string, langs: readonly Lang[], base?: Readonly<Date>) {
	const date = parseTryMultipleLangs(content, langs, base);

	if (!date) {
		return null;
	}

	const data: DateTimeData = {};

	if (date.isCertain('year')) {
		data.year = date.get('year')!;
	}
	if (date.isCertain('month')) {
		data.month = date.get('month')!;
	}
	if (date.isCertain('day')) {
		data.day = date.get('day')!;
	}
	if (date.isCertain('hour')) {
		data.hour = date.get('hour')!;
	}
	if (date.isCertain('hour')) {
		data.minute = date.get('minute') ?? 0;
	}
	if (date.isCertain('second')) {
		data.second = date.get('second')!;
	}
	if (date.isCertain('millisecond')) {
		data.ms = date.get('millisecond')!;
	}

	const datetime: DateTime = {
		datetime: data,
	};

	if (date.isCertain('timezoneOffset')) {
		datetime.zone = date.get('timezoneOffset')!;
	}

	return datetime;
}

/**
 * Generates an HTML `datetime` attribute value from natural language text.
 *
 * Parses the text content using chrono-node and formats the result as an
 * ISO 8601-like datetime string suitable for the `datetime` attribute.
 *
 * @param content - The text content to parse.
 * @param langs - Locale codes to use for parsing. Defaults to all supported languages.
 * @returns A formatted datetime string, or `null` if the content cannot be parsed.
 */
export function getCandidateDatetimeString(content: string, langs: Lang[] = defaultLangs) {
	const date = parseADatetime(content, langs);

	if (!date) {
		return null;
	}

	let datetimeStr = toDatetimeString(date.datetime);

	if (!datetimeStr) {
		return null;
	}

	if (date.zone != null) {
		const plusMinus = date.zone < 0 ? '-' : '+';
		const hour = Math.floor(Math.abs(date.zone) / 60);
		const minute = Math.abs(date.zone) % 60;
		datetimeStr += `${plusMinus}${f(hour, 2)}${f(minute, 2)}`;
	}

	return datetimeStr;
}

/**
 * Converts parsed datetime data into an ISO 8601-like string.
 *
 * Produces different formats depending on which components are present
 * (e.g., date-only, time-only, or combined date-time).
 *
 * @param date - The parsed date/time component data.
 * @returns A formatted datetime string, or `null` if the components do not match any known format.
 */
function toDatetimeString(date: Readonly<DateTimeData>) {
	if (only(date, ['year', 'month'])) {
		return `${f(date.year, 4)}-${f(date.month, 2)}`;
	}

	if (only(date, ['year', 'month', 'day'])) {
		return `${f(date.year, 4)}-${f(date.month, 2)}-${f(date.day, 2)}`;
	}

	if (only(date, ['month', 'day'])) {
		return `${f(date.month, 2)}-${f(date.day, 2)}`;
	}

	if (only(date, ['hour', 'minute'])) {
		return `${f(date.hour, 2)}:${f(date.minute, 2)}`;
	}

	if (only(date, ['hour', 'minute', 'second'])) {
		return `${f(date.hour, 2)}:${f(date.minute, 2)}:${f(date.second, 2)}`;
	}

	if (only(date, ['hour', 'minute', 'second', 'ms'])) {
		return `${f(date.hour, 2)}:${f(date.minute, 2)}:${f(date.second, 2)}.${date.ms}`;
	}

	if (only(date, ['year', 'month', 'day', 'hour', 'minute'])) {
		return `${f(date.year, 4)}-${f(date.month, 2)}-${f(date.day, 2)}T${f(date.hour, 2)}:${f(date.minute, 2)}`;
	}

	if (only(date, ['year', 'month', 'day', 'hour', 'minute', 'second'])) {
		return `${f(date.year, 4)}-${f(date.month, 2)}-${f(date.day, 2)}T${f(date.hour, 2)}:${f(date.minute, 2)}:${f(
			date.second,
			2,
		)}`;
	}

	if (only(date, ['year', 'month', 'day', 'hour', 'minute', 'second', 'ms'])) {
		return `${f(date.year, 4)}-${f(date.month, 2)}-${f(date.day, 2)}T${f(date.hour, 2)}:${f(date.minute, 2)}:${f(
			date.second,
			2,
		)}.${date.ms}`;
	}

	return null;
}

/**
 * Attempts to parse datetime text using multiple locale parsers sequentially.
 *
 * Returns the parsed start component from the first locale that produces a
 * valid result (non-range, single datetime).
 *
 * @param content - The text content to parse.
 * @param langs - Locale codes to try in order.
 * @param base - Optional reference date for relative date parsing.
 * @returns The parsed start component, or `null` if no locale succeeds.
 */
function parseTryMultipleLangs(content: string, langs: readonly Lang[], base?: Readonly<Date>) {
	for (const lang of langs) {
		const results =
			// eslint-disable-next-line import-x/namespace
			chrono[lang].casual.parse(content, base);

		// Is not multiple datetime contents
		if (results.length === 0) {
			continue;
		}

		const result = results[0];

		if (!result) {
			continue;
		}

		// Is not a range or period
		if (result.end) {
			continue;
		}

		return result.start;
	}

	return null;
}

/**
 * Type guard that checks if the given datetime data contains only the specified keys.
 *
 * @template K - The array of datetime keys to check for.
 * @template U - Union of the key types.
 * @template R - The resulting narrowed type with required properties.
 * @param date - The datetime data to check.
 * @param keys - The keys that should be the only ones present.
 * @returns `true` if the date contains only the specified keys (and narrows the type).
 */
function only<K extends DateTimeKey[], U extends K[number], R extends Required<Pick<DateTimeData, U>>>(
	date: Readonly<DateTimeData>,
	keys: K,
): date is R {
	const list = Object.keys(date) as DateTimeKey[];
	for (const exists of list) {
		if (!keys.includes(exists)) {
			return false;
		}
	}
	return true;
}

/**
 * Formats a number with zero-padding to the specified width.
 *
 * @param n - The number to format.
 * @param pad - The minimum number of digits in the output string.
 * @returns The zero-padded string representation.
 */
function f(n: number, pad: number) {
	return n.toString(10).padStart(pad, '0');
}
