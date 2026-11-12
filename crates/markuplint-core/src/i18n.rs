//! Port of `@markuplint/i18n` (`packages/@markuplint/i18n/src/translator.ts`): the `t()` that every
//! rule builds its message with.
//!
//! The dictionaries are the ones the TypeScript engine reads, `packages/@markuplint/i18n/locales/*.json`,
//! embedded by relative path: there is one dictionary file per language, not a Rust copy of it, so a
//! translation added there reaches both engines. The engine is told the locale NAME only (the TS side
//! resolves it from the option or the OS, as `packages/markuplint/src/i18n.ts` does); [`Translator::new`]
//! applies the same rule to a name (the part before `-`, and `en` when there is no dictionary for it).
//!
//! What the port covers, as `translator()` does: a template with `{0}` / `{0:c}` / `{0*}` placeholders
//! looked up in the sentences and keywords of the locale, a text with no placeholder (keyword first, then
//! sentence), the `%keyword%` no-translate mark and its `%%` escape, `c:` complement keywords, and the
//! quoting and joining of a list. A number argument is formatted as `Number#toLocaleString` formats it for
//! `en` and `ja` (grouped by thousands, at most three fraction digits).
//!
//! What it does not cover: the experimental tagged-template translator (`taggedTemplateTranslator`, which
//! has no Rust caller because Rust has no tagged templates), and locales other than the embedded `en` and
//! `ja` (a name without a dictionary falls back to `en`, as TS does).
//!
//! Lookups compare lowercase keys, so a sentence template is matched case-insensitively, and an
//! untranslated template is returned with the case it was written in. An English sentence that the
//! dictionary overrides (`locales/en.json`) is the way a sentence that follows another gets its capital.

use std::collections::HashMap;
use std::fmt;
use std::sync::OnceLock;

use serde::de::{MapAccess, Visitor};
use serde::{Deserialize, Deserializer};

const EN_JSON: &str = include_str!("../../../packages/@markuplint/i18n/locales/en.json");
const JA_JSON: &str = include_str!("../../../packages/@markuplint/i18n/locales/ja.json");

/// An argument of `t()`: TS `Primitive` (`string | number | boolean`).
#[derive(Debug, Clone, Copy)]
pub enum Primitive<'a> {
    /// A string (a keyword, or a dynamic value).
    S(&'a str),
    /// A number; it is formatted for the locale before it is looked up as a keyword.
    N(f64),
    /// A boolean; it is spelled `true` / `false`.
    B(bool),
}

impl Primitive<'_> {
    fn text(&self) -> String {
        match self {
            Primitive::S(s) => (*s).to_owned(),
            Primitive::N(n) => to_locale_string(*n),
            Primitive::B(b) => b.to_string(),
        }
    }
}

/// Formatting rules for a list (TS `ListFormat`).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFormat {
    pub quote_start: String,
    pub quote_end: String,
    pub separator: String,
    /// Before the last item; `separator` when it is omitted.
    #[serde(default)]
    pub last_separator: Option<String>,
}

impl Default for ListFormat {
    fn default() -> Self {
        Self {
            quote_start: "\"".to_owned(),
            quote_end: "\"".to_owned(),
            separator: ", ".to_owned(),
            last_separator: Some(" and ".to_owned()),
        }
    }
}

/// Key/value pairs of a JSON object in the order of the file (the first sentence that matches wins).
#[derive(Debug, Default)]
struct Pairs(Vec<(String, String)>);

impl<'de> Deserialize<'de> for Pairs {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        struct PairsVisitor;
        impl<'de> Visitor<'de> for PairsVisitor {
            type Value = Pairs;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("an object of strings")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Pairs, A::Error> {
                let mut pairs = Vec::new();
                while let Some((k, v)) = map.next_entry::<String, String>()? {
                    pairs.push((k, v));
                }
                Ok(Pairs(pairs))
            }
        }
        deserializer.deserialize_map(PairsVisitor)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawLocale {
    #[serde(default)]
    list_format: Option<ListFormat>,
    #[serde(default)]
    keywords: HashMap<String, String>,
    #[serde(default)]
    sentences: Pairs,
}

/// A locale: its translations and list format (TS `LocaleSet`).
#[derive(Debug, Clone, Default)]
pub struct LocaleSet {
    locale: String,
    list_format: Option<ListFormat>,
    keywords: HashMap<String, String>,
    /// Keyed by the lowercase sentence; the first of the file wins, as `Array#find` over the entries does.
    sentences: HashMap<String, String>,
}

impl LocaleSet {
    /// A locale set from its parts. The keys of `keywords` are matched against lowercase text, so they
    /// are expected to be lowercase; the keys of `sentences` are compared in lower case.
    #[must_use]
    pub fn new(
        locale: &str,
        list_format: Option<ListFormat>,
        keywords: impl IntoIterator<Item = (String, String)>,
        sentences: impl IntoIterator<Item = (String, String)>,
    ) -> Self {
        Self {
            locale: locale.to_owned(),
            list_format,
            keywords: keywords.into_iter().collect(),
            sentences: lowercase_first_wins(sentences),
        }
    }

    /// Reads a dictionary file of `@markuplint/i18n` (`locales/*.json`).
    ///
    /// # Errors
    /// When `json` is not a dictionary.
    pub fn from_json(locale: &str, json: &str) -> Result<Self, serde_json::Error> {
        let raw: RawLocale = serde_json::from_str(json)?;
        Ok(Self {
            locale: locale.to_owned(),
            list_format: raw.list_format,
            keywords: raw.keywords,
            sentences: lowercase_first_wins(raw.sentences.0),
        })
    }

    /// The identifier of the locale (`en`, `ja`).
    #[must_use]
    pub fn locale(&self) -> &str {
        &self.locale
    }

    /// The translation of a keyword, or `None` when it has none (an empty translation is none).
    /// The `c:`-prefixed entry is tried first when `flag` is `c`.
    fn find_keyword(&self, keyword: &str, flag: &str) -> Option<&str> {
        let lower = keyword.to_lowercase();
        if !flag.is_empty()
            && let Some(v) = self.keywords.get(&format!("{flag}:{keyword}").to_lowercase())
            && !v.is_empty()
        {
            return Some(v);
        }
        self.keywords.get(&lower).map(String::as_str).filter(|v| !v.is_empty())
    }

    fn find_sentence(&self, sentence: &str) -> Option<&str> {
        self.sentences.get(&sentence.to_lowercase()).map(String::as_str)
    }
}

fn lowercase_first_wins(pairs: impl IntoIterator<Item = (String, String)>) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for (k, v) in pairs {
        map.entry(k.to_lowercase()).or_insert(v);
    }
    map
}

fn embedded(name: &str) -> &'static LocaleSet {
    static EN: OnceLock<LocaleSet> = OnceLock::new();
    static JA: OnceLock<LocaleSet> = OnceLock::new();
    // The embedded files are validated by the unit tests below, so a failure here is a broken build.
    if name == "ja" {
        JA.get_or_init(|| LocaleSet::from_json("ja", JA_JSON).expect("locales/ja.json is a dictionary"))
    } else {
        EN.get_or_init(|| LocaleSet::from_json("en", EN_JSON).expect("locales/en.json is a dictionary"))
    }
}

/// `t()`: translates and formats messages for one locale. Cheap to copy; it borrows the dictionary.
#[derive(Debug, Clone, Copy)]
pub struct Translator<'a> {
    locale_set: Option<&'a LocaleSet>,
}

impl Translator<'static> {
    /// The translator of a locale name (TS `i18n()`): the part before `-` picks the embedded
    /// dictionary, and a name without one (or none) is `en`.
    #[must_use]
    pub fn new(locale: Option<&str>) -> Self {
        let code = locale.and_then(|l| l.split('-').next()).unwrap_or("en");
        Self {
            locale_set: Some(embedded(code)),
        }
    }
}

impl Default for Translator<'static> {
    fn default() -> Self {
        Self::new(None)
    }
}

impl<'a> Translator<'a> {
    /// A translator over a locale set of the caller (TS `translator(localeSet)`).
    #[must_use]
    pub fn with_locale_set(locale_set: &'a LocaleSet) -> Self {
        Self {
            locale_set: Some(locale_set),
        }
    }

    /// TS `translator()` with no locale set: nothing is translated and a list uses the defaults.
    #[must_use]
    pub fn untranslated() -> Self {
        Self { locale_set: None }
    }

    /// The identifier of the locale (`en` for [`Self::untranslated`]).
    #[must_use]
    pub fn locale(self) -> &'a str {
        self.locale_set.map_or("en", LocaleSet::locale)
    }

    /// TS `t(template, ...keywords)`. With no keyword, `template` is a single text: a keyword, else a
    /// sentence of the locale, else itself.
    #[must_use]
    pub fn t(self, template: &str, keywords: &[Primitive<'_>]) -> String {
        if keywords.is_empty() {
            if self.find_keyword(template, "").is_none()
                && let Some(sentence) = self.locale_set.and_then(|l| l.find_sentence(template))
            {
                return sentence.to_owned();
            }
            return self.translate_keyword(template, "");
        }

        let no_translate = no_translate_indices(template);
        let key = remove_no_translate_mark(template).to_lowercase();
        let found = self.locale_set.and_then(|l| l.find_sentence(&key));
        let translated = found.map_or(key, str::to_owned);
        let message_tmpl = if remove_no_translate_mark(&template.to_lowercase()) == translated {
            remove_no_translate_mark(template)
        } else {
            translated
        };

        replace_placeholders(&message_tmpl, |number, flag| {
            let keyword = number
                .parse::<usize>()
                .ok()
                .and_then(|n| keywords.get(n))
                .map(Primitive::text)
                .unwrap_or_default();
            if no_translate.iter().any(|n| n == number) {
                keyword
            } else {
                self.translate_keyword(&keyword, flag)
            }
        })
    }

    /// TS `t(list, useLastSeparator)`: each item quoted, joined with the separator of the locale
    /// (`and` before the last when `use_last_separator`, if the locale has one).
    #[must_use]
    pub fn t_list<S: AsRef<str>>(self, items: &[S], use_last_separator: bool) -> String {
        if items.is_empty() {
            return String::new();
        }
        let default = ListFormat::default();
        let format = self.locale_set.and_then(|l| l.list_format.as_ref()).unwrap_or(&default);
        let last_separator = if use_last_separator {
            format.last_separator.as_deref().unwrap_or(&format.separator)
        } else {
            &format.separator
        };
        let mut quoted: Vec<String> = items
            .iter()
            .map(|item| {
                format!(
                    "{}{}{}",
                    format.quote_start,
                    self.translate_keyword(item.as_ref(), ""),
                    format.quote_end
                )
            })
            .collect();
        let Some(last) = quoted.pop() else {
            return String::new();
        };
        if quoted.is_empty() {
            return last;
        }
        format!("{}{last_separator}{last}", quoted.join(&format.separator))
    }

    /// TS `finish` of `MLRuleContext`, which every reported message goes through: in English the
    /// first letter is capitalized when it is `a`-`z` (a template that starts with a placeholder
    /// starts with a lowercase keyword); in any other locale the message is left as it is.
    #[must_use]
    pub fn finish(self, message: &str) -> String {
        let mut chars = message.chars();
        match chars.next() {
            Some(c) if self.locale() == "en" && c.is_ascii_lowercase() => {
                format!("{}{}", c.to_ascii_uppercase(), chars.as_str())
            }
            _ => message.to_owned(),
        }
    }

    /// TS `translateKeyword`: `%word%` is not translated (its marks are removed), `%%` at either end
    /// escapes a `%`, and a keyword without a translation is returned as it is.
    fn translate_keyword(self, keyword: &str, flag: &str) -> String {
        if is_marked_no_translate(keyword) {
            return keyword[1..keyword.len() - 1].to_owned();
        }
        let keyword = unescape_percent(keyword);
        self.find_keyword(&keyword, flag).map_or(keyword.clone(), str::to_owned)
    }

    fn find_keyword(self, keyword: &str, flag: &str) -> Option<&'a str> {
        self.locale_set.and_then(|l| l.find_keyword(keyword, flag))
    }
}

/// Port of `noTranslate()` of `@markuplint/rules`: marks a value so that the translator shows it as
/// written.
///
/// The translator looks a placeholder's value up as a keyword (`list` is `リスト` with `locale: 'ja'`),
/// and so it does each item of a list. A placeholder written `{n*}` is not translated, but a list has
/// no such mark: an item that is data (a role name, an attribute value, a token the author wrote) is
/// wrapped in `%…%`, the translator's own form of "not a keyword".
///
/// The translator reads `%…%` around a whole value as that mark and `%%` at an end as one `%`, so a
/// value that has a `%` at an end is written with it doubled: `%list%` is shown as `%list%`, not
/// `list`. A `%` inside a value needs nothing, as no keyword has one. An empty value is returned as it
/// is: wrapped, `%%` would be read back as a stray `%`.
#[must_use]
pub fn no_translate(value: &str) -> String {
    if value.is_empty() {
        return String::new();
    }
    if !value.contains('%') {
        return format!("%{value}%");
    }
    // `%%` is the escaped form of one `%` at an end, so a lone `%` is a single escaped one
    if value == "%" {
        return "%%".to_owned();
    }
    let mut out = String::with_capacity(value.len() + 2);
    if value.starts_with('%') {
        out.push('%');
    }
    out.push_str(value);
    if value.ends_with('%') {
        out.push('%');
    }
    out
}

/// `/^%[^%]+%$/`.
fn is_marked_no_translate(keyword: &str) -> bool {
    keyword.len() > 2
        && keyword.starts_with('%')
        && keyword.ends_with('%')
        && !keyword[1..keyword.len() - 1].contains('%')
}

/// `keyword.replaceAll(/^%%|%%$/g, '%')`: the matches do not overlap, so the end is replaced only when
/// it is not the pair the start already consumed.
fn unescape_percent(keyword: &str) -> String {
    let start = keyword.starts_with("%%");
    let end = keyword.ends_with("%%") && (!start || keyword.len() >= 4);
    let mut s = keyword;
    let mut out = String::new();
    if start {
        out.push('%');
        s = &s[2..];
    }
    if end {
        let body = &s[..s.len() - 2];
        out.push_str(body);
        out.push('%');
    } else {
        out.push_str(s);
    }
    out
}

/// The numbers `n` of the placeholders `{n*}` in a template, as written (`/(?<={)\d+(?=\*})/g`).
fn no_translate_indices(template: &str) -> Vec<String> {
    let bytes = template.as_bytes();
    let mut out = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'{' {
            let start = i + 1;
            let mut j = start;
            while j < bytes.len() && bytes[j].is_ascii_digit() {
                j += 1;
            }
            if j > start && bytes.get(j) == Some(&b'*') && bytes.get(j + 1) == Some(&b'}') {
                out.push(template[start..j].to_owned());
            }
        }
        i += 1;
    }
    out
}

/// `message.replaceAll(/(?<={\d+)\*(?=})/g, '')`: `{0*}` becomes `{0}`.
fn remove_no_translate_mark(message: &str) -> String {
    let bytes = message.as_bytes();
    let mut out = String::with_capacity(message.len());
    let mut last = 0;
    for (i, _) in message.match_indices('*') {
        if bytes.get(i + 1) != Some(&b'}') {
            continue;
        }
        let mut j = i;
        while j > 0 && bytes[j - 1].is_ascii_digit() {
            j -= 1;
        }
        if j < i && j > 0 && bytes[j - 1] == b'{' {
            out.push_str(&message[last..i]);
            last = i + 1;
        }
    }
    out.push_str(&message[last..]);
    out
}

/// `message.replaceAll(/{(\d+)(?::(c))?}/g, ...)`: `f` gets the digits and the flag (`c` or empty).
fn replace_placeholders(message: &str, mut f: impl FnMut(&str, &str) -> String) -> String {
    let bytes = message.as_bytes();
    let mut out = String::with_capacity(message.len());
    let mut last = 0;
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'{' {
            let start = i + 1;
            let mut j = start;
            while j < bytes.len() && bytes[j].is_ascii_digit() {
                j += 1;
            }
            if j > start {
                let digits_end = j;
                let mut flag = "";
                if bytes.get(j) == Some(&b':') && bytes.get(j + 1) == Some(&b'c') {
                    flag = "c";
                    j += 2;
                }
                if bytes.get(j) == Some(&b'}') {
                    out.push_str(&message[last..i]);
                    out.push_str(&f(&message[start..digits_end], flag));
                    last = j + 1;
                    i = j + 1;
                    continue;
                }
            }
        }
        i += 1;
    }
    out.push_str(&message[last..]);
    out
}

/// JS `n.toLocaleString('en' | 'ja')`: grouped by thousands, at most three fraction digits.
fn to_locale_string(n: f64) -> String {
    if !n.is_finite() {
        return if n.is_nan() {
            "NaN".to_owned()
        } else if n > 0.0 {
            "∞".to_owned()
        } else {
            "-∞".to_owned()
        };
    }
    let rounded = (n * 1000.0).round() / 1000.0;
    let negative = rounded < 0.0;
    let abs = rounded.abs();
    let s = format!("{abs}");
    let (int_part, frac_part) = s.split_once('.').map_or((s.as_str(), None), |(i, f)| (i, Some(f)));
    let mut grouped = String::new();
    for (i, c) in int_part.chars().enumerate() {
        if i > 0 && (int_part.len() - i) % 3 == 0 {
            grouped.push(',');
        }
        grouped.push(c);
    }
    let mut out = if negative && abs != 0.0 {
        format!("-{grouped}")
    } else {
        grouped
    };
    if let Some(f) = frac_part {
        out.push('.');
        out.push_str(f);
    }
    out
}

#[cfg(test)]
mod tests;
