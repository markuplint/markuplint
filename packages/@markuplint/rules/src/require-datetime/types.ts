export type DateTimeKey = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'ms';

export type DateTimeData = Partial<Record<DateTimeKey, number>>;

export type DateTime = {
	datetime: DateTimeData;
	zone?: number;
};

/**
 * @see https://github.com/wanasit/chrono#locales
 */
export type Lang = 'en' | 'ja' | 'fr' | 'nl' | 'ru' | 'de' | 'pt' | 'zh';
