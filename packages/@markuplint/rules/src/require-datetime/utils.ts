import type { DateTime, DateTimeData, DateTimeKey, Lang } from './types.js';

import * as chrono from 'chrono-node';

const defaultLangs: Lang[] = ['en', 'ja', 'fr', 'nl', 'ru', 'de', 'pt', 'zh'];

/**
 * Datetime-ish text to a datetime data
 *
 * @param content
 * @param langs
 * @param base Reference date for a test
 * @returns
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
 * Formatter
 *
 * @param n
 * @param pad zero padding
 * @returns
 */
function f(n: number, pad: number) {
	return n.toString(10).padStart(pad, '0');
}
