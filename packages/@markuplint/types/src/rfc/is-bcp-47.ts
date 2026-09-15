import type { FormattedPrimitiveTypeCreator } from '../types.js';

import { parse } from 'bcp-47';
import extlangIndex from 'language-subtag-registry/data/json/extlang.json' with { type: 'json' };
import languageIndex from 'language-subtag-registry/data/json/language.json' with { type: 'json' };
import regionIndex from 'language-subtag-registry/data/json/region.json' with { type: 'json' };
import scriptIndex from 'language-subtag-registry/data/json/script.json' with { type: 'json' };
import variantIndex from 'language-subtag-registry/data/json/variant.json' with { type: 'json' };

/**
 * Membership test against one subtag type of the IANA Language Subtag
 * Registry (vendored as the `language-subtag-registry` npm package, which
 * tracks the official registry; updating the dependency refreshes the data).
 *
 * The index files key every registered subtag in lowercase. Private-use
 * allocations are recorded as ranged keys (`qaa..qtz` for languages,
 * `qaaa..qabx` for scripts, `qm..qz` / `xa..xz` for regions) and are
 * expanded here by lexicographic comparison — a subtag inside a range is
 * registered per RFC 5646 §3.1.2 ("Private use subtags ... 'qaa..qtz'"
 * range notation).
 *
 * @see https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
 */
function createSubtagLookup(index: Readonly<Record<string, number>>): (subtag: string) => boolean {
	const ranges = Object.keys(index)
		.filter(key => key.includes('..'))
		.map(key => key.split('..') as [string, string]);
	return subtag => {
		const lowered = subtag.toLowerCase();
		if (Object.hasOwn(index, lowered)) {
			return true;
		}
		return ranges.some(([start, end]) => lowered.length === start.length && start <= lowered && lowered <= end);
	};
}

const isRegisteredLanguage = createSubtagLookup(languageIndex);
const isRegisteredExtlang = createSubtagLookup(extlangIndex);
const isRegisteredScript = createSubtagLookup(scriptIndex);
const isRegisteredRegion = createSubtagLookup(regionIndex);
const isRegisteredVariant = createSubtagLookup(variantIndex);

/**
 * Checks **validity**, not just well-formedness, per RFC 5646 §2.2.9:
 * "Either the tag is in the list of grandfathered tags or all of its
 * primary language, extended language, script, region, and variant subtags
 * appear in the IANA Language Subtag Registry as of the particular registry
 * date", "There are no duplicate variant subtags", and "There are no
 * duplicate singleton (extension) subtags". Extension subtags themselves
 * are not registry-checked — §2.2.9 defines that as validity *for a given
 * extension* (governed by the extension's own RFC), a stricter class than
 * plain validity.
 *
 * Deprecated subtags (e.g. `mo`) remain registered, so they stay valid —
 * §2.2.9 draws no distinction; deprecation is advisory only.
 *
 * The `bcp-47` parser (with its default normalization) resolves the 26
 * grandfathered tags: those with a modern replacement (e.g. `i-klingon` →
 * `tlh`) come back as ordinary subtags that pass the registry test, and
 * those without one (e.g. `i-default`) come back flagged `irregular` /
 * `regular` and are accepted via the grandfathered branch of §2.2.9.
 *
 * Accepts privateuse-only tags (e.g. `x-default`, common in `hreflang`)
 * in addition to ordinary language tags, because BCP 47's `Language-Tag`
 * production is `langtag / privateuse / grandfathered` — a tag with no
 * `language` subtag is still valid when it is entirely private use.
 *
 * @see https://tools.ietf.org/rfc/bcp/bcp47.html
 * @see https://www.rfc-editor.org/rfc/rfc5646.html#section-2.2.9
 */
export const isBCP47: FormattedPrimitiveTypeCreator = () => {
	return value => {
		const {
			language,
			extendedLanguageSubtags,
			script,
			region,
			variants,
			extensions,
			privateuse,
			irregular,
			regular,
		} = parse(value);
		if (irregular != null || regular != null) {
			return true;
		}
		if (!language) {
			return privateuse.length > 0;
		}
		if (!isRegisteredLanguage(language)) {
			return false;
		}
		if (!extendedLanguageSubtags.every(subtag => isRegisteredExtlang(subtag))) {
			return false;
		}
		if (script != null && !isRegisteredScript(script)) {
			return false;
		}
		if (region != null && !isRegisteredRegion(region)) {
			return false;
		}
		if (!variants.every(subtag => isRegisteredVariant(subtag))) {
			return false;
		}
		const loweredVariants = variants.map(subtag => subtag.toLowerCase());
		if (new Set(loweredVariants).size !== loweredVariants.length) {
			return false;
		}
		const singletons = extensions.map(extension => extension.singleton.toLowerCase());
		return new Set(singletons).size === singletons.length;
	};
};
