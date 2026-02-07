/** Union of possible date/time component keys used in parsed datetime data. */
export type DateTimeKey = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'ms';

/** A partial record mapping date/time component keys to their numeric values. */
export type DateTimeData = Partial<Record<DateTimeKey, number>>;

/** Represents a parsed date/time value with optional timezone offset. */
export type DateTime = {
	/** The parsed date/time component values. */
	datetime: DateTimeData;
	/** Timezone offset in minutes from UTC (e.g., -300 for UTC-5). */
	zone?: number;
};

/**
 * Supported locale codes for natural language date/time parsing.
 *
 * @see https://github.com/wanasit/chrono#locales
 */
export type Lang = 'en' | 'ja' | 'fr' | 'nl' | 'ru' | 'de' | 'pt' | 'zh';
