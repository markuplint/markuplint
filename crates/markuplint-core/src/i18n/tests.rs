//! Ports of the tests of `packages/@markuplint/i18n/src/index.spec.ts`, with the same inputs and
//! expectations (the tagged-template test is not ported: it is `@experimental` and Rust has no tagged
//! templates). Their TS test names are in the doc comments.

use super::{LocaleSet, Primitive, Translator, no_translate};
use Primitive::{N, S};

fn en() -> &'static LocaleSet {
    static EN: std::sync::OnceLock<LocaleSet> = std::sync::OnceLock::new();
    EN.get_or_init(|| LocaleSet::from_json("en", super::EN_JSON).unwrap())
}

fn ja() -> &'static LocaleSet {
    static JA: std::sync::OnceLock<LocaleSet> = std::sync::OnceLock::new();
    JA.get_or_init(|| LocaleSet::from_json("ja", super::JA_JSON).unwrap())
}

fn xx(keywords: &[(&str, &str)], sentences: &[(&str, &str)]) -> LocaleSet {
    let owned = |pairs: &[(&str, &str)]| {
        pairs
            .iter()
            .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
            .collect::<Vec<_>>()
    };
    LocaleSet::new("xx", None, owned(keywords), owned(sentences))
}

/// TS: A sentence that follows another one starts with a capital in English, and falls back to its own key without the locale
#[test]
fn sentence_that_follows_another_starts_with_a_capital_in_english() {
    assert_eq!(
        Translator::with_locale_set(en()).t("the max number of elements required is {0}", &[S("2")]),
        "The max number of elements required is two"
    );
    assert_eq!(
        Translator::untranslated().t("the max number of elements required is {0}", &[S("5")]),
        "the max number of elements required is 5"
    );
}

/// TS: Listup
#[test]
fn listup() {
    let t1 = Translator::untranslated();
    assert_eq!(t1.t_list(&["1"], false), "\"1\"");
    assert_eq!(t1.t_list(&["1", "2"], false), "\"1\", \"2\"");
    assert_eq!(t1.t_list(&["1", "2", "3"], false), "\"1\", \"2\", \"3\"");
    assert_eq!(t1.t_list(&["1"], true), "\"1\"");
    assert_eq!(t1.t_list(&["1", "2"], true), "\"1\" and \"2\"");
    assert_eq!(t1.t_list(&["1", "2", "3"], true), "\"1\", \"2\" and \"3\"");
    let t2 = Translator::with_locale_set(ja());
    assert_eq!(t2.t_list(&["1", "2", "3"], false), "「1」「2」「3」");
    assert_eq!(t2.t_list(&["1", "2", "3"], true), "「1」「2」「3」");
    assert_eq!(
        t2.t_list(&["element", "attribute", "value"], false),
        "「要素」「属性」「値」"
    );
    assert_eq!(t2.t_list::<&str>(&[], true), "");
}

/// TS: One keyword
#[test]
fn one_keyword() {
    let t = Translator::with_locale_set(ja());
    assert_eq!(t.t("element", &[]), "要素");
    assert_eq!(t.t("attribute", &[]), "属性");
}

/// TS: No translate (EN is not affect)
#[test]
fn no_translate_en_is_not_affected() {
    let t = Translator::untranslated();
    assert_eq!(
        t.t("the \"{0}\" {1}", &[S("autocomplete"), S("attribute")]),
        "the \"autocomplete\" attribute"
    );
    assert_eq!(
        t.t("the \"{0*}\" {1}", &[S("autocomplete"), S("attribute")]),
        "the \"autocomplete\" attribute"
    );
    assert_eq!(
        t.t("the \"{0*}\" {1*}", &[S("autocomplete"), S("attribute")]),
        "the \"autocomplete\" attribute"
    );
    assert_eq!(
        t.t("the \"{0}\" {1*}", &[S("autocomplete"), S("attribute")]),
        "the \"autocomplete\" attribute"
    );
    // It is an illegal syntax
    assert_eq!(
        t.t("the \"{0**}\" {1**}", &[S("autocomplete"), S("attribute")]),
        "the \"{0**}\" {1**}"
    );

    assert_eq!(t.t("element", &[]), "element");
    assert_eq!(t.t("%element%", &[]), "element");
    assert_eq!(t.t("%element%%", &[]), "%element%");
    assert_eq!(t.t("%%element%", &[]), "%element%");
    assert_eq!(t.t("%%element%%", &[]), "%element%");
    assert_eq!(t.t("element%%", &[]), "element%");
}

/// TS: Complementize
#[test]
fn complementize() {
    let t = Translator::with_locale_set(ja());
    assert_eq!(
        t.t("{0} is {1}", &[S("attribute"), S("deprecated")]),
        "属性は非推奨です"
    );
    assert_eq!(
        t.t("{0} is {1:c}", &[S("attribute"), S("deprecated")]),
        "属性は非推奨です"
    );
    assert_eq!(
        t.t("{0} is {1}", &[S("attribute"), S("obsolete")]),
        "属性は廃止ずみです"
    );
    assert_eq!(
        t.t("{0} is {1:c}", &[S("attribute"), S("obsolete")]),
        "属性は廃止されています"
    );
}

/// TS: Complementize (EN is not affect)
#[test]
fn complementize_en_is_not_affected() {
    let t = Translator::untranslated();
    assert_eq!(
        t.t("{0} is {1}", &[S("attribute"), S("deprecated")]),
        "attribute is deprecated"
    );
    assert_eq!(
        t.t("{0} is {1:c}", &[S("attribute"), S("deprecated")]),
        "attribute is deprecated"
    );
    assert_eq!(
        t.t("{0} is {1}", &[S("attribute"), S("obsolete")]),
        "attribute is obsolete"
    );
    assert_eq!(
        t.t("{0} is {1:c}", &[S("attribute"), S("obsolete")]),
        "attribute is obsolete"
    );
}

/// TS: Nesting
#[test]
fn nesting() {
    let t = Translator::untranslated();
    assert_eq!(
        t.t(
            "{0} must be {1}",
            &[
                S(&t.t("{0} of {1}", &[S("attribute names"), S("HTML elements")])),
                S("lowercase")
            ]
        ),
        "attribute names of HTML elements must be lowercase"
    );

    let t2 = Translator::with_locale_set(ja());
    assert_eq!(
        t2.t(
            "{0} must be {1}",
            &[
                S(&t2.t("{0} of {1}", &[S("attribute names"), S("HTML elements")])),
                S("lowercase")
            ]
        ),
        "HTML要素の属性名は小文字にするべきです"
    );
}

/// TS: Upper/Lowser Case
#[test]
fn upper_lower_case() {
    let t = Translator::untranslated();
    assert_eq!(
        t.t("It doesn't need {0}", &[S(&t.t("the {0}", &[S("attribute")]))]),
        "It doesn't need the attribute"
    );
    assert_eq!(t.t("\"{0*}\" ID", &[S("foo")]), "\"foo\" ID");
}

/// Runs `t` over the keywords as TS nests calls: every inner result is a string argument.
macro_rules! tt {
    ($t:expr, $tmpl:expr $(, $arg:expr)* $(,)?) => {
        $t.t($tmpl, &[$(S(&$arg)),*])
    };
}

/// TS: ja
#[test]
#[allow(clippy::too_many_lines)]
fn ja_messages() {
    let t = Translator::with_locale_set(ja());
    let attr = |name: &str| t.t("the \"{0}\" {1}", &[S(name), S("attribute")]);
    let element = |name: &str| t.t("the \"{0}\" {1}", &[S(name), S("element")]);
    let role = |name: &str| t.t("the \"{0}\" {1}", &[S(name), S("role")]);

    assert_eq!(
        tt!(
            t,
            "{0} is unmatched with the below patterns: {1}",
            t.t("the \"{0}\" {1}", &[S("foo"), S("class name")]),
            "\"bar\", \"boo\""
        ),
        "クラス名「foo」は次のパターンにマッチしませんでした \"bar\", \"boo\""
    );
    assert_eq!(
        tt!(t, "{0} is {1:c}", attr("color"), "obsolete"),
        "属性「color」は廃止されています"
    );
    assert_eq!(
        tt!(t, "{0} is {1:c}", element("foo"), "non-standard"),
        "要素「foo」は非標準です"
    );
    assert_eq!(t.t("Require {0}", &[S("doctype")]), "文書型が必要です");
    assert_eq!(
        t.t("Never {0} {1}", &[S("declare"), S("obsolete doctype")]),
        "廃止された文書型を宣言しないでください"
    );
    let value_of_id = t.t(
        "{0} of {1}",
        &[
            S(&t.t("the {0}", &[S("value")])),
            S(&t.t("the \"{0}\" {1}", &[S("id"), S("attribute")])),
        ],
    );
    assert_eq!(
        tt!(t, "{0} is {1:c}", value_of_id, "duplicated"),
        "属性「id」の値が重複しています"
    );
    assert_eq!(
        t.t("{0} is {1:c}", &[S(&attr("foo")), S("disallowed")])
            + &t.t(". ", &[])
            + &t.t("Did you mean \"{0}\"?", &[S("bar")]),
        "属性「foo」は許可されていません。「bar」ではありませんか？"
    );
    let value_of_foo = t.t("{0} of {1}", &[S(&t.t("the {0}", &[S("value")])), S(&attr("foo"))]);
    assert_eq!(
        tt!(t, "{0} must not be {1}", value_of_foo, "empty string"),
        "属性「foo」の値は空文字にするべきではありません"
    );
    assert_eq!(
        tt!(
            t,
            "{0} expects {1}",
            attr("foo"),
            t.t("{0} greater than {1}", &[S("floating-point number"), S("zero")])
        ),
        "属性「foo」にはゼロより大きい浮動小数点数が必要です"
    );
    assert_eq!(
        tt!(
            t,
            "{0} expects {1:c}",
            attr("foo"),
            t.t("in the range between {0} and {1}", &[S("zero"), S("one")])
        ),
        "属性「foo」はゼロから1の範囲である必要があります"
    );
    let both = t.t(
        "{0:c} and {1:c}",
        &[
            S(&t.t("{0} greater than {1}", &[S("non-negative integer"), S("zero")])),
            S(&t.t("less than or equal to {0}", &[N(1000.0)])),
        ],
    );
    assert_eq!(
        tt!(t, "{0} expects {1:c}", attr("foo"), both),
        "属性「foo」はゼロより大きい正の整数且つ、1,000以下である必要があります"
    );
    assert_eq!(
        tt!(
            t,
            "{0} behaves the same as {1} if {2}",
            attr("foo"),
            "-1",
            t.t("less than {0}", &[S("-1")])
        ),
        "属性「foo」は-1未満の場合、-1と同じ振る舞いをします"
    );
    assert_eq!(
        tt!(
            t,
            "{0} expects {1:c}",
            attr("foo"),
            t.t("either {0}", &[S(&t.t_list(&["A", "B", "C", "D"], false))])
        ),
        "属性「foo」は「A」「B」「C」「D」のいずれかである必要があります"
    );
    assert_eq!(
        tt!(
            t,
            "{0} expects {1:c}",
            attr("foo"),
            t.t("valid {0}", &[S("hash-name reference")])
        ),
        "属性「foo」は妥当なハッシュ名参照である必要があります"
    );
    assert_eq!(
        t.t("{0} expects {1}", &[S(&attr("foo")), S("angle")]),
        "属性「foo」には角度が必要です"
    );
    assert_eq!(
        tt!(
            t,
            "{0} expects {1:c}",
            attr("foo"),
            t.t(
                "{0} as {1}",
                &[S(&t.t("{0} to {1}", &[S("0%"), S("100%")])), S("alpha channel value")]
            )
        ),
        "属性「foo」は不透明度として0%から100%である必要があります"
    );
    assert_eq!(
        tt!(t, "{0} should be {1}", role("foo"), "top level"),
        "ロール「foo」はトップレベルにしたほうがよいです"
    );
    assert_eq!(
        t.t("Require {0}", &[S(&t.t("unique {0}", &[S("accessible name")]))]),
        "一意のアクセシブルな名前が必要です"
    );
    assert_eq!(
        tt!(
            t,
            "{0} must be {1}",
            element("foo"),
            t.t("{0} of {1}", &[S("descendant"), S(&element("bar"))])
        ),
        "要素「foo」は要素「bar」の子孫にするべきです"
    );
    let contents_invalid = t.t(
        "{0} is {1:c}",
        &[
            S(&t.t(
                "{0} of {1}",
                &[S(&t.t("the {0}", &[S("contents")])), S(&element("foo"))],
            )),
            S("invalid"),
        ],
    );
    assert_eq!(
        tt!(t, "{0} according to {1}", contents_invalid, "the html specification"),
        "HTMLの仕様において、要素「foo」の内容は妥当ではありません"
    );
    assert_eq!(
        tt!(t, "{0} expects {1}", attr("foo"), element("bar")),
        "属性「foo」には要素「bar」が必要です"
    );
    assert_eq!(t.t("Require {0}", &[S(&element("h1"))]), "要素「h1」が必要です");
    assert_eq!(
        tt!(t, "{0} is {1:c}", element("h1"), "duplicated"),
        "要素「h1」が重複しています"
    );
    assert_eq!(
        tt!(
            t,
            "{0} according to {1}",
            t.t("{0} does not exist", &[S(&role("foo"))]),
            "the WAI-ARIA specification"
        ),
        "WAI-ARIAの仕様において、ロール「foo」は存在しません"
    );
    assert_eq!(
        tt!(t, "{0} is {1}", role("foo"), "the abstract role"),
        "ロール「foo」は抽象ロールです"
    );
    assert_eq!(
        tt!(
            t,
            "{0} is {1}",
            role("foo"),
            t.t("{0} of {1}", &[S("the implicit role"), S(&element("bar"))])
        ),
        "ロール「foo」は要素「bar」の暗黙のロールです"
    );
    let overwrite_role = t.t(
        "Cannot overwrite {0}",
        &[S(&t.t(
            "{0} of {1}",
            &[S(&t.t("the {0}", &[S("role")])), S(&element("foo"))],
        ))],
    );
    assert_eq!(
        tt!(t, "{0} according to {1}", overwrite_role, "ARIA in HTML specification"),
        "ARIA in HTMLの仕様において、要素「foo」のロールを上書きすることはできません"
    );
    let overwrite_to = t.t("Cannot overwrite {0} to {1}", &[S(&role("foo")), S(&element("bar"))]);
    assert_eq!(
        tt!(t, "{0} according to {1}", overwrite_to, "ARIA in HTML specification"),
        "ARIA in HTMLの仕様において、ロール「foo」を要素「bar」に上書きすることはできません"
    );
    let aria = |name: &str, kind: &str| t.t("the \"{0}\" {1}", &[S(name), S(kind)]);
    let deprecated = t.t("{0} is {1:c}", &[S(&aria("foo", "ARIA property")), S("deprecated")]);
    assert_eq!(
        tt!(t, "{0:c} on {1}", deprecated, role("bar")),
        "ロール「bar」では、ARIAプロパティ「foo」は非推奨です"
    );
    let disallowed = t.t("{0} is {1:c}", &[S(&aria("foo", "ARIA state")), S("disallowed")]);
    assert_eq!(
        tt!(t, "{0:c} on {1}", disallowed, role("bar")),
        "ロール「bar」では、ARIAステート「foo」は許可されていません"
    );
    let require = t.t("Require {0}", &[S(&aria("foo", "ARIA state"))]);
    assert_eq!(
        tt!(t, "{0:c} on {1}", require, role("bar")),
        "ロール「bar」では、ARIAステート「foo」が必要です"
    );
    assert_eq!(
        tt!(t, "{0} is not {1}", aria("foo", "ARIA property"), "global property"),
        "ARIAプロパティ「foo」はグローバルプロパティではありません"
    );
    let current = t.t("the current \"{0}\" {1}", &[S("bar"), S("attribute")]);
    let implicit = t.t("the implicit \"{0}\" {1}", &[S("bar"), S("attribute")]);
    let semantics = t.t(
        "the same {0} as {1}",
        &[S("semantics"), S(&t.t("{0} or {1}", &[S(&current), S(&implicit)]))],
    );
    assert_eq!(
        tt!(t, "{0} has {1}", aria("foo", "ARIA property"), semantics),
        "ARIAプロパティ「foo」は現在の属性「bar」もしくは暗黙の属性「bar」と同等のセマンティクスを持っています"
    );
    assert_eq!(
        tt!(t, "{0} contradicts {1}", aria("foo", "ARIA state"), current),
        "ARIAステート「foo」は現在の属性「bar」と矛盾しています"
    );
    assert_eq!(
        tt!(t, "{0} contradicts {1}", aria("foo", "ARIA property"), implicit),
        "ARIAプロパティ「foo」は暗黙の属性「bar」と矛盾しています"
    );
    assert_eq!(t.t("It is {0}", &[S("default value")]), "デフォルト値です");
    assert_eq!(t.t("{0}. Or, {1}", &[S("A"), S("B")]), "A。または、B");
}

/// TS: A sentence without a keyword is translated
#[test]
fn sentence_without_a_keyword_is_translated() {
    let t = Translator::with_locale_set(ja());
    assert_eq!(
        t.t("there is more content than it needs", &[]),
        "必要以上のコンテンツがあります"
    );
    assert_eq!(
        t.t("There is more content than it needs", &[]),
        "必要以上のコンテンツがあります"
    );
    assert_eq!(
        Translator::untranslated().t("there is more content than it needs", &[]),
        "there is more content than it needs"
    );
}

/// TS: A keyword takes precedence over a sentence of the same text
#[test]
fn keyword_takes_precedence_over_a_sentence() {
    let set = xx(&[("foo", "keyword")], &[("foo", "sentence")]);
    assert_eq!(Translator::with_locale_set(&set).t("foo", &[]), "keyword");
}

/// TS: A keyword translated to its own spelling still takes precedence over a sentence
#[test]
fn keyword_translated_to_its_own_spelling_still_takes_precedence() {
    let set = xx(&[("foo", "foo")], &[("foo", "sentence")]);
    assert_eq!(Translator::with_locale_set(&set).t("foo", &[]), "foo");
}

/// TS: A no-translate mark on a single text is removed and the text is not looked up
#[test]
fn no_translate_mark_on_a_single_text_is_removed() {
    let set = xx(&[("foo", "keyword")], &[("foo", "sentence")]);
    assert_eq!(Translator::with_locale_set(&set).t("%foo%", &[]), "foo");
}

/// TS: A keyword translated to an empty string is not a keyword
#[test]
fn keyword_translated_to_an_empty_string_is_not_a_keyword() {
    let set = xx(&[("foo", "")], &[("foo", "sentence")]);
    assert_eq!(Translator::with_locale_set(&set).t("foo", &[]), "sentence");
}

/// TS: A text that is neither a keyword nor a sentence is returned as it is
#[test]
fn text_that_is_neither_a_keyword_nor_a_sentence_is_returned_as_it_is() {
    let set = xx(&[("foo", "keyword")], &[("bar", "sentence")]);
    assert_eq!(Translator::with_locale_set(&set).t("baz", &[]), "baz");
}

/// A locale name picks the embedded dictionary as `packages/markuplint/src/i18n.ts` does: the part
/// before `-`, and `en` when there is no dictionary for it.
#[test]
fn locale_name_resolves_like_the_ts_engine() {
    assert_eq!(Translator::new(Some("ja")).locale(), "ja");
    assert_eq!(Translator::new(Some("ja-JP")).locale(), "ja");
    assert_eq!(Translator::new(Some("fr")).locale(), "en");
    assert_eq!(Translator::new(None).locale(), "en");
    assert_eq!(
        Translator::new(Some("ja")).t("Require {0}", &[S("doctype")]),
        "文書型が必要です"
    );
    assert_eq!(
        Translator::new(Some("fr")).t("Require {0}", &[S("doctype")]),
        "Require doctype"
    );
}

/// A number is spelled for the locale (`toLocaleString`), a boolean as `true` / `false`, and `1`…`4`
/// are spelled out in English.
#[test]
fn numbers_and_booleans() {
    let en = Translator::new(Some("en"));
    assert_eq!(en.t("{0} digits", &[N(4.0)]), "four digits");
    assert_eq!(en.t("{0} digits", &[N(12_345.5)]), "12,345.5 digits");
    assert_eq!(en.t("{0} digits", &[N(-1000.0)]), "-1,000 digits");
    assert_eq!(en.t("{0} is {1}", &[S("a"), Primitive::B(true)]), "a is true");
    assert_eq!(en.t("{0} {1}", &[S("a")]), "a ");
}

/// The embedded dictionaries are the files of `@markuplint/i18n`: they parse and are not empty.
#[test]
fn embedded_dictionaries_are_dictionaries() {
    assert!(!ja().keywords.is_empty());
    assert!(!ja().sentences.is_empty());
    assert!(en().keywords.contains_key("html elements"));
}

/// `%%` at both ends of a text that is only `%%%`: the matches of the regular expression do not overlap.
#[test]
fn percent_escape_matches_do_not_overlap() {
    let t = Translator::untranslated();
    assert_eq!(t.t("%%%", &[]), "%%");
    assert_eq!(t.t("%%", &[]), "%");
    assert_eq!(t.t("%%%%", &[]), "%%");
}

fn marked(items: &[&str]) -> Vec<String> {
    items.iter().map(|item| no_translate(item)).collect()
}

/// TS (`no-translate.spec.ts`): shows a value that is a keyword as written in a list
#[test]
fn no_translate_shows_a_keyword_as_written_in_a_list() {
    let t = Translator::with_locale_set(ja());
    assert_eq!(t.t_list(&["list", "row", "time"], false), "「リスト」「行」「時間」");
    assert_eq!(
        t.t_list(&marked(&["list", "row", "time"]), false),
        "「list」「row」「time」"
    );
}

/// TS (`no-translate.spec.ts`): mixes with a word that is to be translated
#[test]
fn no_translate_mixes_with_a_word_that_is_to_be_translated() {
    let t = Translator::with_locale_set(ja());
    assert_eq!(
        t.t_list(&[no_translate("list"), "element".to_owned()], false),
        "「list」「要素」"
    );
}

/// TS (`no-translate.spec.ts`): keeps the value of a placeholder as written
#[test]
fn no_translate_keeps_the_value_of_a_placeholder_as_written() {
    let t = Translator::with_locale_set(ja());
    assert_eq!(
        t.t("{0} is {1}", &[S(&no_translate("name")), S("element")]),
        "nameは要素です"
    );
}

/// TS (`no-translate.spec.ts`): shows a value with a percent sign as written, in a literal expectation
#[test]
fn no_translate_shows_a_value_with_a_percent_sign_as_written() {
    let t = Translator::with_locale_set(ja());
    assert_eq!(t.t_list(&[no_translate("50%")], false), "「50%」");
    assert_eq!(t.t_list(&[no_translate("%list%")], false), "「%list%」");
}

/// TS (`no-translate.spec.ts`): leaves an empty value empty
#[test]
fn no_translate_leaves_an_empty_value_empty() {
    let t = Translator::with_locale_set(ja());
    assert_eq!(no_translate(""), "");
    assert_eq!(t.t_list(&[no_translate("")], false), "「」");
}

/// TS (`no-translate.spec.ts`): shows the value with percent signs as written
#[test]
fn no_translate_shows_a_value_with_percent_signs_as_written() {
    let t = Translator::with_locale_set(ja());
    for value in [
        "%", "%%", "%a", "a%", "%%a", "a%%", "%a%", "%list%", "list%", "%list", "list%x", "50%", "a%b",
    ] {
        assert_eq!(
            t.t_list(&[no_translate(value)], false),
            format!("「{value}」"),
            "{value}"
        );
        assert_eq!(
            t.t("{0} is {1}", &[S(&no_translate(value)), S("element")]),
            format!("{value}は要素です"),
            "{value}"
        );
    }
}
