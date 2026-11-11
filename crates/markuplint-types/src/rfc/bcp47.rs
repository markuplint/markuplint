//! Port of `packages/@markuplint/types/src/rfc/is-bcp-47.ts`, with the parser of the `bcp-47` npm
//! package (`parse()`, default options) it relies on.
//!
//! <https://www.rfc-editor.org/info/bcp47>

use std::collections::HashSet;
use std::sync::LazyLock;

/// The subtag keys of the IANA Language Subtag Registry, one list per subtag type, taken from the
/// `language-subtag-registry` npm package the TS implementation reads (`data/README.md` says how
/// to regenerate it).
static REGISTRY_JSON: &str = include_str!("../../data/language-subtags.json");

/// Membership test against one subtag type of the registry (TS `createSubtagLookup`).
///
/// The registry keys every subtag in lower case. Private-use allocations are ranged keys
/// (`qaa..qtz` for languages, `qaaa..qabx` for scripts, `qm..qz` / `xa..xz` for regions), expanded
/// by lexicographic comparison. RFC 5646 §2.2.1 reserves the language subtags `qaa` through `qtz`
/// for private use.
///
/// <https://www.rfc-editor.org/rfc/rfc5646.html#section-2.2.1>
struct SubtagLookup {
    keys: HashSet<String>,
    ranges: Vec<(String, String)>,
}

impl SubtagLookup {
    fn new(keys: &[String]) -> Self {
        let ranges = keys
            .iter()
            .filter_map(|key| key.split_once("..").map(|(a, b)| (a.to_owned(), b.to_owned())))
            .collect();
        Self {
            keys: keys.iter().cloned().collect(),
            ranges,
        }
    }

    /// JS string comparison (`<=`) and `length` count UTF-16 code units; the registry keys are
    /// ASCII, so a byte comparison of a key against a subtag orders them the same way, and a
    /// subtag of the key's UTF-16 length that is not ASCII sorts after every key.
    fn contains(&self, subtag: &str) -> bool {
        let lowered = subtag.to_lowercase();
        if self.keys.contains(&lowered) {
            return true;
        }
        let len = lowered.encode_utf16().count();
        self.ranges.iter().any(|(start, end)| {
            len == start.len() && start.as_str() <= lowered.as_str() && lowered.as_str() <= end.as_str()
        })
    }
}

struct Registry {
    language: SubtagLookup,
    extlang: SubtagLookup,
    script: SubtagLookup,
    region: SubtagLookup,
    variant: SubtagLookup,
}

static REGISTRY: LazyLock<Registry> = LazyLock::new(|| {
    #[derive(serde::Deserialize)]
    struct Raw {
        language: Vec<String>,
        extlang: Vec<String>,
        script: Vec<String>,
        region: Vec<String>,
        variant: Vec<String>,
    }
    let raw: Raw = serde_json::from_str(REGISTRY_JSON).expect("data/language-subtags.json is valid");
    Registry {
        language: SubtagLookup::new(&raw.language),
        extlang: SubtagLookup::new(&raw.extlang),
        script: SubtagLookup::new(&raw.script),
        region: SubtagLookup::new(&raw.region),
        variant: SubtagLookup::new(&raw.variant),
    }
});

/// The `bcp-47` package's `normal` table: the 26 grandfathered tags, with the tag each one is
/// normalised to, or `None` when it has no replacement.
const NORMAL: &[(&str, Option<&str>)] = &[
    ("en-gb-oed", Some("en-GB-oxendict")),
    ("i-ami", Some("ami")),
    ("i-bnn", Some("bnn")),
    ("i-default", None),
    ("i-enochian", None),
    ("i-hak", Some("hak")),
    ("i-klingon", Some("tlh")),
    ("i-lux", Some("lb")),
    ("i-mingo", None),
    ("i-navajo", Some("nv")),
    ("i-pwn", Some("pwn")),
    ("i-tao", Some("tao")),
    ("i-tay", Some("tay")),
    ("i-tsu", Some("tsu")),
    ("sgn-be-fr", Some("sfb")),
    ("sgn-be-nl", Some("vgt")),
    ("sgn-ch-de", Some("sgg")),
    ("art-lojban", Some("jbo")),
    ("cel-gaulish", None),
    ("no-bok", Some("nb")),
    ("no-nyn", Some("nn")),
    ("zh-guoyu", Some("cmn")),
    ("zh-hakka", Some("hak")),
    ("zh-min", None),
    ("zh-min-nan", Some("nan")),
    ("zh-xiang", Some("hsn")),
];

/// The parts of a parsed tag `is_bcp47` reads (the `bcp-47` package's `Schema`). `grandfathered`
/// is its `irregular` / `regular`.
#[derive(Default)]
struct Schema {
    grandfathered: bool,
    language: Option<String>,
    extended_language_subtags: Vec<String>,
    script: Option<String>,
    region: Option<String>,
    variants: Vec<String>,
    singletons: Vec<String>,
    privateuse: Vec<String>,
}

/// `bcp-47` `parse(tag)` with the default options (not forgiving, normalising). A failure is the
/// empty schema.
///
/// The positions are UTF-16 code units, as in JS: `value` is the tag in lower case (JS
/// `toLowerCase`), read with `charCodeAt`, and the subtags are sliced from the tag as written.
#[allow(clippy::too_many_lines)]
fn parse(tag: &str) -> Schema {
    let lowered = tag.to_lowercase();
    if let Some((_, replacement)) = NORMAL.iter().find(|(key, _)| *key == lowered) {
        if let Some(replacement) = replacement {
            return parse(replacement);
        }
        return Schema {
            grandfathered: true,
            ..Schema::default()
        };
    }

    let source: Vec<u16> = tag.encode_utf16().collect();
    let value: Vec<u16> = lowered.encode_utf16().collect();
    // `charCodeAt` past the end is NaN, which no test accepts
    let at = |i: usize| value.get(i).copied();
    let is_alphabetical = |i: usize| at(i).is_some_and(|c| u8::try_from(c).is_ok_and(|b| b.is_ascii_alphabetic()));
    let is_decimal = |i: usize| at(i).is_some_and(|c| u8::try_from(c).is_ok_and(|b| b.is_ascii_digit()));
    let is_alphanumerical = |i: usize| is_alphabetical(i) || is_decimal(i);
    let is = |i: usize, c: u8| at(i) == Some(u16::from(c));
    let slice = |start: usize, end: usize| {
        let end = end.min(source.len());
        let start = start.min(end);
        String::from_utf16_lossy(&source[start..end])
    };
    let fail = Schema::default;

    let mut result = Schema::default();
    let mut index = 0;

    while is_alphabetical(index) && index < 9 {
        index += 1;
    }

    if index > 1 && index < 9 {
        result.language = Some(slice(0, index));

        if index < 4 {
            let mut groups = 0;
            while is(index, b'-')
                && is_alphabetical(index + 1)
                && is_alphabetical(index + 2)
                && is_alphabetical(index + 3)
                && !is_alphanumerical(index + 4)
            {
                if groups > 2 {
                    return fail();
                }
                result.extended_language_subtags.push(slice(index + 1, index + 4));
                index += 4;
                groups += 1;
            }
        }

        if is(index, b'-')
            && is_alphabetical(index + 1)
            && is_alphabetical(index + 2)
            && is_alphabetical(index + 3)
            && is_alphabetical(index + 4)
            && !is_alphanumerical(index + 5)
        {
            result.script = Some(slice(index + 1, index + 5));
            index += 5;
        }

        if is(index, b'-') {
            if is_alphabetical(index + 1) && is_alphabetical(index + 2) && !is_alphanumerical(index + 3) {
                result.region = Some(slice(index + 1, index + 3));
                index += 3;
            } else if is_decimal(index + 1)
                && is_decimal(index + 2)
                && is_decimal(index + 3)
                && !is_alphanumerical(index + 4)
            {
                result.region = Some(slice(index + 1, index + 4));
                index += 4;
            }
        }

        while is(index, b'-') {
            let start = index + 1;
            let mut offset = start;
            while is_alphanumerical(offset) {
                if offset - start > 7 {
                    return fail();
                }
                offset += 1;
            }
            if offset - start > 4 || (offset - start > 3 && is_decimal(start)) {
                result.variants.push(slice(start, offset));
                index = offset;
            } else {
                break;
            }
        }

        while is(index, b'-') {
            if is(index + 1, b'x')
                || !is_alphanumerical(index + 1)
                || !is(index + 2, b'-')
                || !is_alphanumerical(index + 3)
            {
                break;
            }

            let mut offset = index + 2;
            let mut groups = 0;
            while is(offset, b'-') && is_alphanumerical(offset + 1) && is_alphanumerical(offset + 2) {
                let start = offset + 1;
                offset = start + 2;
                groups += 1;
                while is_alphanumerical(offset) {
                    if offset - start > 7 {
                        return fail();
                    }
                    offset += 1;
                }
            }

            if groups == 0 {
                return fail();
            }

            result.singletons.push(slice(index + 1, index + 2));
            index = offset;
        }
    } else {
        index = 0;
    }

    if (index == 0 && is(index, b'x')) || (is(index, b'-') && is(index + 1, b'x')) {
        index = if index == 0 { 1 } else { index + 2 };
        let mut offset = index;

        while is(offset, b'-') && is_alphanumerical(offset + 1) {
            // `bcp-47` starts each subtag from `index`, not `offset`; kept as is
            let start = index + 1;
            offset = start;
            while is_alphanumerical(offset) {
                if offset - start > 7 {
                    return fail();
                }
                offset += 1;
            }
            result.privateuse.push(slice(index + 1, offset));
            index = offset;
        }

        if result.privateuse.is_empty() {
            return fail();
        }
    }

    if index != source.len() {
        return fail();
    }

    result
}

/// TS `isBCP47()`: **validity**, not just well-formedness, per RFC 5646 §2.2.9.
///
/// > Either the tag is in the list of grandfathered tags or all of its primary language, extended
/// > language, script, region, and variant subtags appear in the IANA Language Subtag Registry as
/// > of the particular registry date.
///
/// > There are no duplicate variant subtags.
///
/// > There are no duplicate singleton (extension) subtags.
///
/// Extension subtags are not registry-checked; deprecated subtags (`mo`) remain registered and
/// valid. A privateuse-only tag (`x-default`) is valid: BCP 47's `Language-Tag` production is
/// `langtag / privateuse / grandfathered`.
///
/// <https://www.rfc-editor.org/rfc/rfc5646.html#section-2.2.9>
///
/// # Examples
///
/// ```
/// use markuplint_types::rfc::bcp47::is_bcp47;
///
/// assert!(is_bcp47("ja-JP"));
/// assert!(is_bcp47("x-default"));
/// assert!(!is_bcp47("zzz"));
/// assert!(!is_bcp47(""));
/// ```
#[must_use]
pub fn is_bcp47(value: &str) -> bool {
    let schema = parse(value);
    if schema.grandfathered {
        return true;
    }
    let Some(language) = &schema.language else {
        return !schema.privateuse.is_empty();
    };
    let registry = &*REGISTRY;
    if !registry.language.contains(language) {
        return false;
    }
    if !schema
        .extended_language_subtags
        .iter()
        .all(|s| registry.extlang.contains(s))
    {
        return false;
    }
    if schema.script.as_ref().is_some_and(|s| !registry.script.contains(s)) {
        return false;
    }
    if schema.region.as_ref().is_some_and(|s| !registry.region.contains(s)) {
        return false;
    }
    if !schema.variants.iter().all(|s| registry.variant.contains(s)) {
        return false;
    }
    let lowered_variants: Vec<String> = schema.variants.iter().map(|s| s.to_lowercase()).collect();
    if lowered_variants.iter().collect::<HashSet<_>>().len() != lowered_variants.len() {
        return false;
    }
    let singletons: Vec<String> = schema.singletons.iter().map(|s| s.to_lowercase()).collect();
    singletons.iter().collect::<HashSet<_>>().len() == singletons.len()
}
