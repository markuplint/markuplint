//! Port of `whatwg/check-autocomplete.spec.ts` and the autocomplete cases of the rule specs.
//!
//! The expected results are TS `check(value, type)` of `@markuplint/types`, serialised by
//! `JSON.stringify`.

mod ts_json;

use ts_json::assert_ts_results;

use markuplint_types::check::check;
use markuplint_types::check::types::Type;
use markuplint_types::whatwg::autocomplete::{CheckAutoCompleteOptions, check_autocomplete};

#[test]
fn autocomplete_keywords() {
    assert_ts_results(CASES, |value, type_| check(value, &Type::Keyword(type_.into()), None));
}

/// TS `checkAutoComplete({ anchorMantle: true, noWebauthn: true })`: no keyword uses both flags.
#[test]
fn anchor_mantle_and_no_webauthn() {
    let options = CheckAutoCompleteOptions {
        no_webauthn: true,
        anchor_mantle: true,
    };
    assert_ts_results(BOTH_OPTIONS, |value, _| check_autocomplete(value, options));
}

#[rustfmt::skip]
const CASES: &[(&str, &str, &str)] = &[
    (
        "AutoComplete",
        "on",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "on webauthn",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"webauthn","offset":3,"length":8,"line":1,"column":4}"#,
    ),
    (
        "AutoComplete",
        "off",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "off webauthn",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"webauthn","offset":4,"length":8,"line":1,"column":5}"#,
    ),
    (
        "AutoComplete",
        "name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "given-name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "given-name webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "given-name webauthun",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"webauthun","offset":11,"length":9,"line":1,"column":12}"#,
    ),
    (
        "AutoComplete",
        "section-",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "section-foo",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "section-foo webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "section-foo name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "section-foo name webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "section-foo shipping name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "section-foo billing name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "section-foo billing home",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":20,"length":4,"line":1,"column":21}"#,
    ),
    (
        "AutoComplete",
        "section-foo billing work",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"work","offset":20,"length":4,"line":1,"column":21}"#,
    ),
    (
        "AutoComplete",
        "section-foo billing home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "section-foo billing work email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "section-foo billing work email webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "shipping name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "billing name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "billing home",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":8,"length":4,"line":1,"column":9}"#,
    ),
    (
        "AutoComplete",
        "billing work",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"work","offset":8,"length":4,"line":1,"column":9}"#,
    ),
    (
        "AutoComplete",
        "billing home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "billing work email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "billing work email webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "work email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "work email webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "shipping",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"shipping","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "billing",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"billing","offset":0,"length":7,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "home",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "work",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"work","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "mobile",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"mobile","offset":0,"length":6,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "fax",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"fax","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "pager",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"pager","offset":0,"length":5,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"webauthn","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "name webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "tel webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "shipping name webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "home tel webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "section-foo shipping home tel webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "shipping webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"shipping","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "home webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "section-foo shipping home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "home name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "work street-address",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping","matched":false,"raw":"work","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "section-foo , name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":",","offset":12,"length":1,"line":1,"column":13}"#,
    ),
    (
        "AutoComplete",
        "xxx",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"xxx","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "section-foo neme",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"neme","offset":12,"length":4,"line":1,"column":13}"#,
    ),
    (
        "AutoComplete",
        "section-foo shipping neme",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"neme","offset":21,"length":4,"line":1,"column":22}"#,
    ),
    (
        "AutoComplete",
        "section-foo shipping home name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping","matched":false,"raw":"home","offset":21,"length":4,"line":1,"column":22}"#,
    ),
    (
        "AutoComplete",
        "section-foo shipping home emall",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"email","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"emall","offset":26,"length":5,"line":1,"column":27}"#,
    ),
    (
        "AutoComplete",
        "name name",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"name","offset":5,"length":4,"line":1,"column":6}"#,
    ),
    (
        "AutoComplete",
        "on on",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"on","offset":3,"length":2,"line":1,"column":4}"#,
    ),
    (
        "AutoComplete",
        "on off",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"off","offset":3,"length":3,"line":1,"column":4}"#,
    ),
    (
        "AutoComplete",
        "off on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"on","offset":4,"length":2,"line":1,"column":5}"#,
    ),
    (
        "AutoComplete",
        "on name",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"name","offset":3,"length":4,"line":1,"column":4}"#,
    ),
    (
        "AutoComplete",
        "name on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":5,"length":2,"line":1,"column":6}"#,
    ),
    (
        "AutoComplete",
        "section-foo name on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":17,"length":2,"line":1,"column":18}"#,
    ),
    (
        "AutoComplete",
        "section-foo billing name on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":25,"length":2,"line":1,"column":26}"#,
    ),
    (
        "AutoComplete",
        "billing name on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":13,"length":2,"line":1,"column":14}"#,
    ),
    (
        "AutoComplete",
        "tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":4,"length":2,"line":1,"column":5}"#,
    ),
    (
        "AutoComplete",
        "home tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":9,"length":2,"line":1,"column":10}"#,
    ),
    (
        "AutoComplete",
        "billing home tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":17,"length":2,"line":1,"column":18}"#,
    ),
    (
        "AutoComplete",
        "section-foo billing home tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":29,"length":2,"line":1,"column":30}"#,
    ),
    (
        "AutoComplete",
        "section-foo home tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":21,"length":2,"line":1,"column":22}"#,
    ),
    (
        "AutoComplete",
        "section-foo tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":16,"length":2,"line":1,"column":17}"#,
    ),
    (
        "AutoComplete",
        "section-foo section-bar",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-bar","offset":12,"length":11,"line":1,"column":13}"#,
    ),
    (
        "AutoComplete",
        "shipping billing",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"billing","offset":9,"length":7,"line":1,"column":10}"#,
    ),
    (
        "AutoComplete",
        "secsion-foo name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secsion-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "NAME",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "Name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "GIVEN-NAME",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "TEL",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "EMAIL",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "NAME WEBAUTHN",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "SHIPPING name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "BILLING name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "Section-Foo name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "SECTION-FOO SHIPPING NAME",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "HOME tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "WORK email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "ON",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "OFF",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "transaction-currency",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "transaction-amount",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "Off",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "off name",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"name","offset":4,"length":4,"line":1,"column":5}"#,
    ),
    (
        "AutoComplete",
        "section-foo on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":12,"length":2,"line":1,"column":13}"#,
    ),
    (
        "AutoComplete",
        "section-foo billing work tel-country-code webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "WebAuthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"WebAuthn","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "section-a section-b",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-b","offset":10,"length":9,"line":1,"column":11}"#,
    ),
    (
        "AutoComplete",
        "section-blue billing work tel-country-code webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "",
        r#"{"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"","offset":0,"length":0,"line":1,"column":1,"reason":"empty-token"}"#,
    ),
    (
        "AutoComplete",
        "   ",
        r#"{"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"   ","offset":0,"length":3,"line":1,"column":1,"reason":"empty-token"}"#,
    ),
    (
        "AutoComplete",
        " name ",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "name\nemail",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"name","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "webauthn webauthn",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"webauthn","offset":9,"length":8,"line":1,"column":10}"#,
    ),
    (
        "AutoComplete",
        "foo webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"foo","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "nmae webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"nmae","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "secton-x",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"candidate":"section-x","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secton-x","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "secsion-foo",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secsion-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "x section-foo shipping name",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section","matched":false,"raw":"x","offset":0,"length":1,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "shipping shipping name",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"shipping","offset":9,"length":8,"line":1,"column":10}"#,
    ),
    (
        "AutoComplete",
        "section-a\tshipping\nname",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "nic\u{212a}name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoComplete",
        "\u{17f}ection-foo name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"\u017fection-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "home fax tel",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "foo bar name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"bday","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"bar","offset":4,"length":3,"line":1,"column":5}"#,
    ),
    (
        "AutoComplete",
        "shiping name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"shipping","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"shiping","offset":0,"length":7,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "section-foo-bar",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-foo-bar","offset":0,"length":15,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "secsion-foo-bar name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secsion-foo-bar","offset":0,"length":15,"line":1,"column":1}"#,
    ),
    (
        "AutoComplete",
        "-foo name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"-foo","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "on",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "on webauthn",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"webauthn","offset":3,"length":8,"line":1,"column":4}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "off",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "off webauthn",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"webauthn","offset":4,"length":8,"line":1,"column":5}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "given-name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "given-name webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":11,"length":8,"line":1,"column":12}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "given-name webauthun",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"webauthun","offset":11,"length":9,"line":1,"column":12}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":12,"length":8,"line":1,"column":13}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo name webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":17,"length":8,"line":1,"column":18}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo shipping name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo billing name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo billing home",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":20,"length":4,"line":1,"column":21}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo billing work",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"work","offset":20,"length":4,"line":1,"column":21}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo billing home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo billing work email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo billing work email webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":31,"length":8,"line":1,"column":32}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "shipping name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "billing name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "billing home",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":8,"length":4,"line":1,"column":9}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "billing work",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"work","offset":8,"length":4,"line":1,"column":9}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "billing home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "billing work email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "billing work email webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":19,"length":8,"line":1,"column":20}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "work email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "work email webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":11,"length":8,"line":1,"column":12}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "shipping",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"shipping","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "billing",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"billing","offset":0,"length":7,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "home",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "work",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"work","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "mobile",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"mobile","offset":0,"length":6,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "fax",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"fax","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "pager",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"pager","offset":0,"length":5,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "name webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":5,"length":8,"line":1,"column":6}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "tel webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":4,"length":8,"line":1,"column":5}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "shipping name webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":14,"length":8,"line":1,"column":15}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "home tel webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":9,"length":8,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo shipping home tel webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":30,"length":8,"line":1,"column":31}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "shipping webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":9,"length":8,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "home webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":5,"length":8,"line":1,"column":6}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo shipping home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "home name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "work street-address",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping","matched":false,"raw":"work","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo , name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":",","offset":12,"length":1,"line":1,"column":13}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "xxx",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"xxx","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo neme",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"neme","offset":12,"length":4,"line":1,"column":13}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo shipping neme",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"neme","offset":21,"length":4,"line":1,"column":22}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo shipping home name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping","matched":false,"raw":"home","offset":21,"length":4,"line":1,"column":22}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo shipping home emall",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"email","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"emall","offset":26,"length":5,"line":1,"column":27}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "name name",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"name","offset":5,"length":4,"line":1,"column":6}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "on on",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"on","offset":3,"length":2,"line":1,"column":4}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "on off",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"off","offset":3,"length":3,"line":1,"column":4}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "off on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"on","offset":4,"length":2,"line":1,"column":5}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "on name",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"name","offset":3,"length":4,"line":1,"column":4}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "name on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":5,"length":2,"line":1,"column":6}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo name on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":17,"length":2,"line":1,"column":18}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo billing name on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":25,"length":2,"line":1,"column":26}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "billing name on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":13,"length":2,"line":1,"column":14}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":4,"length":2,"line":1,"column":5}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "home tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":9,"length":2,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "billing home tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":17,"length":2,"line":1,"column":18}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo billing home tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":29,"length":2,"line":1,"column":30}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo home tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":21,"length":2,"line":1,"column":22}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo tel on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":16,"length":2,"line":1,"column":17}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo section-bar",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-bar","offset":12,"length":11,"line":1,"column":13}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "shipping billing",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"billing","offset":9,"length":7,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "secsion-foo name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secsion-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "NAME",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "Name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "GIVEN-NAME",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "TEL",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "EMAIL",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "NAME WEBAUTHN",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"WEBAUTHN","offset":5,"length":8,"line":1,"column":6}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "SHIPPING name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "BILLING name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "Section-Foo name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "SECTION-FOO SHIPPING NAME",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "HOME tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "WORK email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "ON",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "OFF",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "transaction-currency",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "transaction-amount",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "Off",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "off name",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofilling-form-controls:-the-autocomplete-attribute:attr-fe-autocomplete-on-2","matched":false,"raw":"name","offset":4,"length":4,"line":1,"column":5}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo on",
        r#"{"reason":"extra-token","expects":[{"type":"format","value":"autocomplete"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"on","offset":12,"length":2,"line":1,"column":13}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo billing work tel-country-code webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":42,"length":8,"line":1,"column":43}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "WebAuthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"WebAuthn","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-a section-b",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-b","offset":10,"length":9,"line":1,"column":11}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-blue billing work tel-country-code webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":43,"length":8,"line":1,"column":44}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "",
        r#"{"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"","offset":0,"length":0,"line":1,"column":1,"reason":"empty-token"}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "   ",
        r#"{"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"   ","offset":0,"length":3,"line":1,"column":1,"reason":"empty-token"}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        " name ",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "name\nemail",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"name","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "webauthn webauthn",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"webauthn","offset":9,"length":8,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "foo webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":4,"length":8,"line":1,"column":5}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "nmae webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":5,"length":8,"line":1,"column":6}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "secton-x",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"candidate":"section-x","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secton-x","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "secsion-foo",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secsion-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "x section-foo shipping name",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section","matched":false,"raw":"x","offset":0,"length":1,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "shipping shipping name",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"shipping","offset":9,"length":8,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-a\tshipping\nname",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "nic\u{212a}name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "\u{17f}ection-foo name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"\u017fection-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "home fax tel",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "foo bar name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"bday","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"bar","offset":4,"length":3,"line":1,"column":5}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "shiping name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"shipping","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"shiping","offset":0,"length":7,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "section-foo-bar",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-foo-bar","offset":0,"length":15,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "secsion-foo-bar name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secsion-foo-bar","offset":0,"length":15,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteNoWebauthn",
        "-foo name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"-foo","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":0,"length":2,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "on webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":0,"length":2,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "off",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"off","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "off webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"off","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "given-name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "given-name webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "given-name webauthun",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"webauthun","offset":11,"length":9,"line":1,"column":12}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo name webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo shipping name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo billing name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo billing home",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":20,"length":4,"line":1,"column":21}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo billing work",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"work","offset":20,"length":4,"line":1,"column":21}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo billing home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo billing work email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo billing work email webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "shipping name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "billing name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "billing home",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":8,"length":4,"line":1,"column":9}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "billing work",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"work","offset":8,"length":4,"line":1,"column":9}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "billing home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "billing work email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "billing work email webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "work email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "work email webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "shipping",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"shipping","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "billing",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"billing","offset":0,"length":7,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "home",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "work",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"work","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "mobile",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"mobile","offset":0,"length":6,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "fax",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"fax","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "pager",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"pager","offset":0,"length":5,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"webauthn","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "name webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "tel webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "shipping name webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "home tel webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo shipping home tel webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "shipping webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"shipping","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "home webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo shipping home tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "home name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "work street-address",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping","matched":false,"raw":"work","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo , name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":",","offset":12,"length":1,"line":1,"column":13}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "xxx",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"xxx","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo neme",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"neme","offset":12,"length":4,"line":1,"column":13}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo shipping neme",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"neme","offset":21,"length":4,"line":1,"column":22}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo shipping home name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-shipping","matched":false,"raw":"home","offset":21,"length":4,"line":1,"column":22}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo shipping home emall",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"email","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"emall","offset":26,"length":5,"line":1,"column":27}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "name name",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"name","offset":5,"length":4,"line":1,"column":6}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "on on",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"on","offset":3,"length":2,"line":1,"column":4}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "on off",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":0,"length":2,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "off on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"off","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "on name",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":0,"length":2,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "name on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":5,"length":2,"line":1,"column":6}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo name on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":17,"length":2,"line":1,"column":18}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo billing name on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":25,"length":2,"line":1,"column":26}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "billing name on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":13,"length":2,"line":1,"column":14}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "tel on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":4,"length":2,"line":1,"column":5}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "home tel on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":9,"length":2,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "billing home tel on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":17,"length":2,"line":1,"column":18}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo billing home tel on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":29,"length":2,"line":1,"column":30}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo home tel on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":21,"length":2,"line":1,"column":22}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo tel on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":16,"length":2,"line":1,"column":17}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo section-bar",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-bar","offset":12,"length":11,"line":1,"column":13}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "shipping billing",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"billing","offset":9,"length":7,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "secsion-foo name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secsion-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "NAME",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "Name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "GIVEN-NAME",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "TEL",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "EMAIL",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "NAME WEBAUTHN",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "SHIPPING name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "BILLING name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "Section-Foo name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "SECTION-FOO SHIPPING NAME",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "HOME tel",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "WORK email",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "ON",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"ON","offset":0,"length":2,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "OFF",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"OFF","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "transaction-currency",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "transaction-amount",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "Off",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"Off","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "off name",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"off","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":12,"length":2,"line":1,"column":13}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo billing work tel-country-code webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "WebAuthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"WebAuthn","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-a section-b",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-b","offset":10,"length":9,"line":1,"column":11}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-blue billing work tel-country-code webauthn",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "",
        r#"{"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"","offset":0,"length":0,"line":1,"column":1,"reason":"empty-token"}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "   ",
        r#"{"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"   ","offset":0,"length":3,"line":1,"column":1,"reason":"empty-token"}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        " name ",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "name\nemail",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"name","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "webauthn webauthn",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"webauthn","offset":9,"length":8,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "foo webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"foo","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "nmae webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"nmae","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "secton-x",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"candidate":"section-x","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secton-x","offset":0,"length":8,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "secsion-foo",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secsion-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "x section-foo shipping name",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-section","matched":false,"raw":"x","offset":0,"length":1,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "shipping shipping name",
        r#"{"partName":"the content of the list","reason":"duplicated","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete","expects":[{"type":"format","value":"autocomplete"}],"matched":false,"raw":"shipping","offset":9,"length":8,"line":1,"column":10}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-a\tshipping\nname",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "nic\u{212a}name",
        r#"{"matched":true}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "\u{17f}ection-foo name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"\u017fection-foo","offset":0,"length":11,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "home fax tel",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"name","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"home","offset":0,"length":4,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "foo bar name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"bday","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"bar","offset":4,"length":3,"line":1,"column":5}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "shiping name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"shipping","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"shiping","offset":0,"length":7,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "section-foo-bar",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill named group"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"section-foo-bar","offset":0,"length":15,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "secsion-foo-bar name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"candidate":"section-foo","ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"secsion-foo-bar","offset":0,"length":15,"line":1,"column":1}"#,
    ),
    (
        "AutoCompleteAnchorMantle",
        "-foo name",
        r#"{"reason":"unexpected-token","expects":[{"type":"const","value":"shipping"},{"type":"const","value":"billing"},{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-field","matched":false,"raw":"-foo","offset":0,"length":4,"line":1,"column":1}"#,
    ),
];

#[rustfmt::skip]
const BOTH_OPTIONS: &[(&str, &str, &str)] = &[
    (
        "",
        "name",
        r#"{"matched":true}"#,
    ),
    (
        "",
        "on",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"on","offset":0,"length":2,"line":1,"column":1}"#,
    ),
    (
        "",
        "name webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":5,"length":8,"line":1,"column":6}"#,
    ),
    (
        "",
        "off name",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-anchor-mantle","matched":false,"raw":"off","offset":0,"length":3,"line":1,"column":1}"#,
    ),
    (
        "",
        "webauthn",
        r#"{"reason":"unexpected-token","expects":[{"type":"common","value":"autofill field name"}],"ref":"https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-autocomplete-webauthn","matched":false,"raw":"webauthn","offset":0,"length":8,"line":1,"column":1}"#,
    ),
];
