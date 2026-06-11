import type { ListFormat, LocaleSet, Primitive, Translator } from './types.js';

const defaultListFormat: ListFormat = {
	quoteStart: '"',
	quoteEnd: '"',
	separator: ', ',
	lastSeparator: ' and ',
};

/**
 * Creates a {@link Translator} function bound to the given locale set.
 *
 * The returned translator supports two call signatures:
 * - **Message template**: `t("The {0} is {1}", keyword1, keyword2)` – interpolates keywords into
 *   a message template, looking up translations from the locale set's `sentences` and `keywords`.
 * - **List formatting**: `t(["apple", "banana", "cherry"], true)` – formats an array of strings
 *   into a human-readable list (e.g. `"apple", "banana" and "cherry"`).
 *
 * Placeholder flags carry translation intent:
 * - `{0:c}` resolves through a `c:`-prefixed keyword (complement form); see `translateKeyword` below.
 * - `{0*}` inserts the argument verbatim, for dynamic values such as attribute names or
 *   user input that must not go through keyword translation.
 *
 * @param localeSet - The locale configuration providing translations and formatting rules
 * @returns A translator function for producing localized messages
 */
export function translator(localeSet?: LocaleSet): Translator {
	return (messageTmpl, ...keywords) => {
		if (typeof messageTmpl !== 'string') {
			if (messageTmpl.length === 0) {
				return '';
			}
			const format = localeSet?.listFormat ?? defaultListFormat;
			const useLastSeparator = keywords[0] == null || keywords[0] == false ? false : true;
			const lastSeparator = useLastSeparator ? (format.lastSeparator ?? format.separator) : format.separator;
			const list = messageTmpl.map(
				keyword => format.quoteStart + translateKeyword(keyword, '', localeSet) + format.quoteEnd,
			);
			if (list.length === 1) {
				return list[0]!;
			}
			const last = list.pop();
			return list.join(format.separator) + lastSeparator + last;
		}

		const input = messageTmpl;

		if (keywords.length === 0) {
			return translateKeyword(messageTmpl, '', localeSet);
		}

		const noTranslateIndex = new Set(
			[
				...messageTmpl.matchAll(
					// eslint-disable-next-line regexp/strict
					/(?<={)\d+(?=\*})/g,
				),
			].map(m => m[0]),
		);
		const key = removeNoTranslateMark(messageTmpl).toLowerCase();

		const sentences = Object.entries(localeSet?.sentences ?? {});
		const sentence = sentences.find(([sentenceKey]) => sentenceKey.toLowerCase() === key)?.[1];

		messageTmpl = sentence ?? key;
		messageTmpl =
			removeNoTranslateMark(input.toLowerCase()) === messageTmpl ? removeNoTranslateMark(input) : messageTmpl;

		const message = messageTmpl.replaceAll(
			// eslint-disable-next-line regexp/strict
			/{(\d+)(?::(c))?}/g,
			($0, number, flag) => {
				const num = Number.parseInt(number);
				if (Number.isNaN(num)) {
					return $0;
				}
				const keyword = keywords[num] == null ? '' : toString(keywords[num], localeSet?.locale);
				// No translate
				if (noTranslateIndex.has(number)) {
					return keyword;
				}
				return translateKeyword(keyword, flag, localeSet);
			},
		);

		return message;
	};
}

/**
 * ```ts
 * const tt = taggedTemplateTranslator(localeSet);
 * const msg = tt`The ${name} is ${value}`;
 * ```
 *
 * @experimental
 */
export function taggedTemplateTranslator(localeSet?: LocaleSet) {
	const t = translator(localeSet);
	return (strings: Readonly<TemplateStringsArray>, ...keys: readonly Primitive[]) => {
		let i = 0;
		const template = strings.raw
			.map((place, index) => {
				if (index === strings.raw.length - 1) return place;
				const value = keys[i];
				const cFlag = (typeof value === 'string' ? value : '').startsWith('c:') ? ':c' : '';
				return `${place}{${i++}${cFlag}}`;
			})
			.join('');
		return t(template, ...keys);
	};
}

/**
 * Resolves a keyword to its translation in the locale set.
 *
 * When the `c` flag is given (from a `{n:c}` placeholder), the lookup tries the
 * `c:`-prefixed dictionary entry first. Complement (`c:`) keywords exist for languages
 * such as Japanese where the translation must be a predicate that attaches to the
 * preceding subject (e.g. `c:deprecated` → 「は非推奨です」, yielding 「〇〇は非推奨です」),
 * which cannot be produced from the plain keyword translation. The plain keyword
 * (without `c:`) may still exist as a separate dictionary entry for non-complement use.
 */
function translateKeyword(keyword: string, flag: string, localeSet?: LocaleSet) {
	// No translate
	if (/^%[^%]+%$/.test(keyword)) {
		return keyword.replaceAll(/^%|%$/g, '');
	}
	// "%" prefix and suffix escaped
	keyword = keyword.replaceAll(/^%%|%%$/g, '%');
	const key = flag ? `${flag}:${keyword}` : keyword;
	const replacedWord =
		// finding with flag
		localeSet?.keywords?.[key.toLowerCase()] ||
		// finding without flag
		localeSet?.keywords?.[keyword.toLowerCase()];
	return replacedWord || keyword;
}

function toString(value: Primitive, locale = 'en') {
	switch (typeof value) {
		case 'string': {
			return value;
		}
		case 'number': {
			return toLocaleString(value, locale);
		}
		case 'boolean': {
			return `${value}`;
		}
	}
}

function toLocaleString(value: number, locale: string) {
	try {
		return value.toLocaleString(locale);
	} catch (error: unknown) {
		if (error instanceof RangeError) {
			try {
				return value.toLocaleString('en');
			} catch {
				// void
			}
		}
	}
	return value.toString(10);
}

function removeNoTranslateMark(message: string) {
	return message.replaceAll(
		// eslint-disable-next-line regexp/strict
		/(?<={\d+)\*(?=})/g,
		'',
	);
}
