//! The tests of the example: the candidates read back the data of `html-spec`, refuse a file that was changed, compose with
//! extensions as `schemaToSpec` does, answer the questions as the data does, and write the same files as the TypeScript side
//! (the checksums of `scripts/spec-baseline/packed/fixtures/golden.json`).

use std::path::PathBuf;
use std::sync::LazyLock;

use super::*;
use crate::format::{INDEX_MINIMUM, MAGIC, NONE, REGIONS, SECTION_COUNT, VERSION, section, variants};
use crate::hash::crc32c_words;
use crate::questions::QuestionsFile;
use crate::read::{digest_value, words_to_bytes};

/// The data of `@markuplint/html-spec`, read where it is in the repository.
static SPEC: LazyLock<Value> = LazyLock::new(|| {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../packages/@markuplint/html-spec/index.json"
    );
    serde_json::from_str(&fs::read_to_string(path).expect("the data of html-spec")).expect("JSON")
});

/// A fixture of the TypeScript side: a small spec, a small extension, and the checksums of what they make.
fn fixture(name: &str) -> String {
    let path = format!(
        "{}/../../scripts/spec-baseline/packed/fixtures/{name}",
        env!("CARGO_MANIFEST_DIR")
    );
    fs::read_to_string(&path).unwrap_or_else(|error| panic!("{path}: {error}"))
}

fn fixture_json(name: &str) -> Value {
    serde_json::from_str(&fixture(name)).expect("JSON")
}

/// How many elements `small` has.
const SMALL_ELEMENTS: usize = 12;

/// A spec of a few elements, with the names of an index (eight or more) and one that is not ASCII.
fn small() -> Value {
    let specs: Vec<Value> = (0..SMALL_ELEMENTS)
        .map(|index| {
            let name = if index == SMALL_ELEMENTS - 1 {
                "x-\u{65e5}\u{672c}".to_string()
            } else {
                format!("el{index}")
            };
            let mut element = json!({
                "name": name,
                "cite": format!("https://example.test/#el{index}"),
                "attributes": (0..if index % 3 == 0 { 9 } else { 2 })
                    .map(|a| (format!("attr{a}"), json!({ "type": if a % 2 == 0 { json!("Any") } else { json!({ "enum": ["a", "b"] }) } })))
                    .collect::<Map<String, Value>>(),
            });
            if index % 4 == 0 {
                element["obsolete"] = json!(true);
            }
            if index == 3 {
                element["deprecated"] = json!(true);
                element["experimental"] = json!(true);
            }
            element
        })
        .collect();
    json!({
        "def": {
            "#globalAttrs": { "#HTMLGlobalAttrs": { "id": { "type": "DOMID" } } },
            "#aria": {
                "1.1": { "roles": [], "props": [], "graphicsRoles": [], "dpubRoles": [] },
                "1.2": { "roles": [{ "name": "button", "deprecated": false, "n": 3 }], "props": [], "graphicsRoles": [], "dpubRoles": [] },
                "1.3": { "roles": [], "props": [], "graphicsRoles": [], "dpubRoles": [] }
            },
            "#contentModels": { "#flow": ["el0", "el3", "x-\u{65e5}\u{672c}", "el3[href]", "#text"], "#empty": [] }
        },
        "specs": specs,
        "acceptedAttrNames": ["a", "b"]
    })
}

fn words(spec: &PackedSpec) -> Rc<Vec<u8>> {
    Rc::new(spec.serialize())
}

/// The words of a file.
fn file_words(file: &[u8]) -> Vec<u32> {
    file.as_chunks::<4>()
        .0
        .iter()
        .map(|chunk| u32::from_le_bytes(*chunk))
        .collect()
}

/// The file of these words with the checksum of the others made again: a file that was doctored and is still one that
/// checks out, so that what refuses it is something other than the checksum.
fn sealed(mut words: Vec<u32>) -> Vec<u8> {
    let last = words.len() - 1;
    let checksum = crc32c_words(&words_to_bytes(&words[..last]), last);
    words[last] = checksum;
    words_to_bytes(&words)
}

/// Where a section starts in the words of a file, and how long it is.
fn span(words: &[u32], id: usize) -> (usize, usize) {
    (words[4 + 2 * id] as usize, words[5 + 2 * id] as usize)
}

/// The file of these words with one section made of other words, the table of sections written again, and the checksum.
fn rebuilt(words: &[u32], id: usize, replacement: &[u32]) -> Vec<u8> {
    let sections: Vec<Vec<u32>> = (0..SECTION_COUNT)
        .map(|index| {
            let (start, length) = span(words, index);
            if index == id {
                replacement.to_vec()
            } else {
                words[start..start + length].to_vec()
            }
        })
        .collect();
    let mut out = vec![MAGIC, VERSION, words[2], SECTION_COUNT as u32];
    let mut at = HEADER_WORDS as u32;
    for part in &sections {
        out.push(at);
        out.push(part.len() as u32);
        at += part.len() as u32;
    }
    for part in &sections {
        out.extend_from_slice(part);
    }
    out.push(0);
    sealed(out)
}

#[test]
fn every_candidate_reads_back_the_data_of_html_spec() {
    for variant in variants() {
        let packed = encode_spec(&SPEC, variant).unwrap();
        assert!(packed.to_json() == *SPEC, "{}", variant.stem());
        let opened = PackedSpec::open(&words(&packed)).unwrap();
        assert_eq!(opened.variant, variant);
        assert_eq!(opened.serialize(), packed.serialize());
    }
}

#[test]
fn a_candidate_makes_the_same_bytes_from_the_same_spec() {
    for variant in variants().into_iter().step_by(3) {
        assert_eq!(
            encode_spec(&SPEC, variant).unwrap().serialize(),
            encode_spec(&SPEC, variant).unwrap().serialize()
        );
    }
}

#[test]
fn a_name_that_is_not_ascii_is_held_and_indexed() {
    for variant in variants() {
        let packed = encode_spec(&small(), variant).unwrap();
        assert!(packed.to_json() == small(), "{}", variant.stem());
        let found = packed.find(0, packed.root(0), "x-\u{65e5}\u{672c}");
        assert_ne!(found, NONE);
        assert_eq!(packed.to_value(0, found)["name"], json!("x-\u{65e5}\u{672c}"));
        assert_eq!(packed.find(0, packed.root(0), "x-\u{65e6}\u{672c}"), NONE);
        assert_eq!(packed.position(0, packed.root(0), "el5"), 5);
    }
}

#[test]
fn every_element_is_found_by_its_name_and_no_name_that_is_not_one() {
    for variant in variants() {
        let packed = encode_spec(&SPEC, variant).unwrap();
        for (position, element) in SPEC["specs"].as_array().unwrap().iter().enumerate() {
            let name = element["name"].as_str().unwrap();
            assert_eq!(packed.position(0, packed.root(0), name) as usize, position, "{name}");
            assert_eq!(
                packed.find(0, packed.root(0), name),
                packed.at(0, packed.root(0), u32::try_from(position).unwrap())
            );
        }
        for name in ["", "nope", "svg:", "DIV", "div ", "svg:rec", "mml:mi\u{e9}"] {
            assert_eq!(packed.find(0, packed.root(0), name), NONE, "{name:?}");
        }
    }
}

#[test]
fn the_bits_answer_as_the_data_does() {
    let elements = SPEC["specs"].as_array().unwrap();
    let categories = SPEC["def"]["#contentModels"].as_object().unwrap();
    for variant in variants().into_iter().step_by(4) {
        let packed = encode_spec(&SPEC, variant).unwrap();
        assert_eq!(packed.element_count() as usize, elements.len());
        for (position, element) in elements.iter().enumerate() {
            let position = u32::try_from(position).unwrap();
            for (flag, name) in crate::format::FLAGS.iter().enumerate() {
                assert_eq!(
                    packed.flag(position, u32::try_from(flag).unwrap()),
                    u32::from(element[*name] == json!(true)),
                    "{} {name}",
                    element["name"]
                );
            }
            for (row, (category, members)) in categories.iter().enumerate() {
                let expected = members.as_array().unwrap().contains(&element["name"]);
                assert_eq!(
                    packed.member(position, u32::try_from(row).unwrap()),
                    u32::from(expected),
                    "{} {category}",
                    element["name"]
                );
            }
        }
    }
}

#[test]
fn a_byte_that_was_changed_in_a_file_is_refused_whichever_it_is() {
    for variant in [variants()[0], variants()[9]] {
        let file = encode_spec(&small(), variant).unwrap().serialize();
        for at in 0..file.len() {
            let mut changed = file.clone();
            changed[at] ^= 0x01;
            assert!(
                PackedSpec::open(&Rc::new(changed)).is_err(),
                "{}: byte {at}",
                variant.stem()
            );
        }
    }
}

#[test]
fn a_file_that_is_cut_short_or_is_not_a_packed_spec_is_refused_with_its_reason() {
    let file = encode_spec(&small(), variants()[1]).unwrap().serialize();
    let open = |bytes: Vec<u8>| PackedSpec::open(&Rc::new(bytes)).unwrap_err();
    assert_eq!(
        open(file[..file.len() - 4].to_vec()),
        "The section 7 is not inside the file"
    );
    assert_eq!(
        open(file[..40].to_vec()),
        "The file is shorter than the header of a packed spec"
    );
    assert_eq!(open(Vec::new()), "The file is shorter than the header of a packed spec");
    assert_eq!(
        open(file[..file.len() - 1].to_vec()),
        "A packed spec is made of whole words"
    );

    let words = file_words(&file);
    let mut magic = words.clone();
    magic[0] = 1;
    assert_eq!(
        open(sealed(magic)),
        "The file is not a packed spec (the magic is wrong)"
    );
    let mut version = words.clone();
    version[1] = 2;
    assert_eq!(
        open(sealed(version)),
        "The version 2 of the format is not the one that this reader has (1)"
    );
    for variant in [0b0110, 0x10] {
        let mut changed = words.clone();
        changed[2] = variant;
        assert_eq!(
            open(sealed(changed)),
            format!("The variant 0x{variant:x} is not one of the candidates")
        );
    }
    let mut sections = words.clone();
    sections[3] = 7;
    assert_eq!(open(sealed(sections)), "The file has 7 sections, not 8");
}

#[test]
fn a_file_that_has_the_checksum_it_holds_is_refused_for_what_is_wrong_in_it() {
    let file = encode_spec(&small(), variants()[1]).unwrap().serialize();
    let words = file_words(&file);
    let open = |bytes: Vec<u8>| PackedSpec::open(&Rc::new(bytes)).unwrap_err();

    // a section that is not inside the file, and one that leaves words before the checksum
    let mut outside = words.clone();
    outside[5 + 2 * section::ARIA] = 0x7fff_ffff;
    assert_eq!(open(sealed(outside)), "The section 5 is not inside the file");
    let mut gap = words.clone();
    gap[5 + 2 * (SECTION_COUNT - 1)] -= 1;
    assert_eq!(
        open(sealed(gap)),
        "There are words between the last section and the checksum"
    );

    // a region whose header does not say what it holds
    let (specs, _) = span(&words, section::SPECS);
    let mut longer = words.clone();
    longer[specs] += 1;
    assert_eq!(open(sealed(longer)), "A region is not as long as its header says");
    let mut root = words.clone();
    root[specs + 3] = root[specs];
    assert_eq!(open(sealed(root)), "The root of a region is not a node of it");
    assert_eq!(
        open(rebuilt(&words, section::SPECS, &[0, 0, 0])),
        "A region is shorter than its header"
    );

    // the table of the offsets of the strings, and the bytes that it is about
    let (offsets, length) = span(&words, section::STRING_OFFSETS);
    assert!(length > 3);
    let mut start = words.clone();
    start[offsets] = 1;
    assert_eq!(open(sealed(start)), "The table of string offsets does not start at 0");
    let mut order = words.clone();
    order[offsets + 2] = order[offsets + 1] - 1;
    assert_eq!(open(sealed(order)), "The table of string offsets is not in order");
    let mut beyond = words.clone();
    beyond[offsets + length - 1] += 4000;
    assert_eq!(
        open(sealed(beyond)),
        "The bytes of the strings are not as long as their offsets say"
    );
    assert_eq!(
        open(rebuilt(&words, section::STRING_OFFSETS, &[])),
        "The table of the offsets of the strings is empty"
    );
}

#[test]
fn a_table_of_strings_that_does_not_continue_the_one_it_replaces_is_refused() {
    let base = encode_spec(&small(), variants()[0]).unwrap();
    let offsets = base.section_bytes(section::STRING_OFFSETS).to_vec();
    let bytes = base.section_bytes(section::STRING_BYTES).to_vec();
    let refused = |changes: Vec<(usize, Vec<u8>)>| base.replace(changes).unwrap_err();

    assert_eq!(
        refused(vec![(section::STRING_OFFSETS, offsets[..offsets.len() - 4].to_vec())]),
        "The new table of strings is shorter than the one it replaces"
    );
    let mut other = offsets.clone();
    other[4] ^= 1;
    assert_eq!(
        refused(vec![(section::STRING_OFFSETS, other)]),
        "The new table of strings does not continue the one it replaces"
    );
    let mut changed = bytes.clone();
    changed[0] ^= 1;
    assert_eq!(
        refused(vec![(section::STRING_BYTES, changed)]),
        "The new table of string bytes does not continue the one it replaces"
    );
    assert_eq!(
        refused(vec![(section::STRING_BYTES, bytes[..bytes.len() - 8].to_vec())]),
        "The new table of string bytes does not continue the one it replaces"
    );

    // a table that continues the old one is taken, with the new strings after it
    let mut more_offsets = offsets.clone();
    let end = u32::from_le_bytes(offsets[offsets.len() - 4..].try_into().unwrap());
    more_offsets.extend_from_slice(&(end + 4).to_le_bytes());
    let mut more_bytes = bytes[..end as usize].to_vec();
    more_bytes.extend_from_slice(b"more");
    while !more_bytes.len().is_multiple_of(4) {
        more_bytes.push(0);
    }
    let replaced = base
        .replace(vec![
            (section::STRING_OFFSETS, more_offsets),
            (section::STRING_BYTES, more_bytes),
        ])
        .unwrap();
    assert_eq!(replaced.string_count(), base.string_count() + 1);
    assert_eq!(
        replaced.string_bytes(u32::try_from(base.string_count()).unwrap()),
        b"more"
    );
}

/// A spec whose `specs` is this many objects that have a name.
fn named_objects(count: usize) -> Value {
    json!({ "specs": (0..count).map(|index| json!({ "name": format!("n{index}") })).collect::<Vec<_>>() })
}

#[test]
fn an_array_of_eight_has_an_index_and_one_of_seven_has_none() {
    for variant in variants() {
        for count in [INDEX_MINIMUM - 1, INDEX_MINIMUM] {
            let packed = encode_spec(&named_objects(count), variant).unwrap();
            let index = packed.node_words(0, packed.root(0))[3];
            assert_eq!(index != 0, count >= INDEX_MINIMUM, "{} {count}", variant.stem());
            for position in 0..count {
                let name = format!("n{position}");
                assert_eq!(packed.position(0, packed.root(0), &name) as usize, position, "{name}");
            }
            assert_eq!(packed.position(0, packed.root(0), "n99"), NONE);
        }
    }
}

#[test]
fn an_object_of_eight_keys_has_an_index_and_one_of_seven_has_none() {
    for variant in variants() {
        for count in [INDEX_MINIMUM - 1, INDEX_MINIMUM] {
            let group: Map<String, Value> = (0..count)
                .map(|index| (format!("k{index}"), json!({ "type": "Any" })))
                .collect();
            let packed = encode_spec(&json!({ "def": { "#globalAttrs": group } }), variant).unwrap();
            let index = packed.node_words(1, packed.root(1))[3];
            assert_eq!(index != 0, count >= INDEX_MINIMUM, "{} {count}", variant.stem());
            for position in 0..count {
                let key = format!("k{position}");
                assert_eq!(packed.entry(1, packed.root(1), &key) as usize, position, "{key}");
            }
            assert_eq!(packed.entry(1, packed.root(1), "k99"), NONE);
        }
    }
}

#[test]
fn a_name_that_comes_twice_in_an_indexed_array_is_found_at_its_first_position() {
    let mut specs: Vec<Value> = (0..=INDEX_MINIMUM)
        .map(|index| json!({ "name": format!("n{index}"), "at": index }))
        .collect();
    specs.push(json!({ "name": "n3", "at": 100 }));
    for variant in variants() {
        let packed = encode_spec(&json!({ "specs": specs }), variant).unwrap();
        assert_ne!(packed.node_words(0, packed.root(0))[3], 0);
        assert_eq!(packed.position(0, packed.root(0), "n3"), 3, "{}", variant.stem());
        let found = packed.find(0, packed.root(0), "n3");
        assert_eq!(packed.to_value(0, found)["at"], json!(3));
        // the one that comes later is still in the array
        assert_eq!(packed.count(0, packed.root(0)) as usize, specs.len());
    }
}

#[test]
fn the_largest_number_that_the_format_holds_is_a_number_and_not_a_missing_node() {
    let spec = json!({ "specs": [{ "name": "x", "n": 4_294_967_295_u64, "zero": 0 }] });
    for variant in variants() {
        let packed = encode_spec(&spec, variant).unwrap();
        assert_eq!(packed.to_json()["specs"], spec["specs"], "{}", variant.stem());
        let element = packed.at(0, packed.root(0), 0);
        let n = packed.get(0, element, "n");
        assert_ne!(n, NONE);
        assert_eq!(packed.to_value(0, n), json!(4_294_967_295_u64));
        assert_eq!(packed.digest(0, n), digest_value(&json!(4_294_967_295_u64)).unwrap());
        assert_ne!(packed.digest(0, n), 0);
        assert_eq!(packed.get(0, element, "missing"), NONE);
    }
}

#[test]
fn a_number_that_the_format_does_not_hold_is_refused() {
    let variant = variants()[0];
    for (spec, reason) in [
        (json!({ "specs": [-1] }), "a non-negative integer below 2^32, not -1"),
        (json!({ "specs": [1.5] }), "a non-negative integer below 2^32, not 1.5"),
        (
            json!({ "specs": [4_294_967_296_u64] }),
            "a non-negative integer below 2^32, not 4294967296",
        ),
    ] {
        let error = encode_spec(&spec, variant).unwrap_err();
        assert!(error.contains(reason), "{spec}: {error}");
    }
    assert_eq!(
        encode_spec(&json!({ "def": { "#other": {} } }), variant).unwrap_err(),
        "The format holds no \"#other\" in def"
    );
    // a region that the spec lacks is the empty value of its kind
    assert_eq!(
        encode_spec(&json!({}), variant).unwrap().to_json(),
        json!({
            "def": { "#globalAttrs": {}, "#aria": {}, "#contentModels": {} },
            "specs": []
        })
    );
}

/// The paths of a few of everything, and what the objects answer to them.
fn hand_made_questions() -> QuestionsFile {
    // [region, steps, (kind, argument)...] with the strings in `strings`
    let strings: Vec<String> = [
        "input",
        "attributes",
        "autocomplete",
        "no-such-attribute",
        "#HTMLGlobalAttrs",
        "id",
        "1.2",
        "roles",
        "button",
        "#phrasing",
        "span",
    ]
    .iter()
    .map(|text| (*text).to_string())
    .collect();
    let paths: Vec<u32> = vec![
        0, 3, 2, 0, 0, 1, 0, 2, // specs / input / attributes / autocomplete
        0, 3, 2, 0, 0, 1, 0, 3, // specs / input / attributes / no-such-attribute
        1, 2, 0, 4, 0, 5, //       #globalAttrs / #HTMLGlobalAttrs / id
        2, 3, 0, 6, 0, 7, 2, 8, // aria / 1.2 / roles / button
        0, 1, 1, 0, //             specs[0]
        0, 1, 1, 100_000, //       specs[100000]
    ];
    // [kind, ...] 0 a path (the region, the steps), 1 a flag by name, 2 a member of a category by name
    let stream: Vec<u32> = vec![
        0, 0, 3, 2, 0, 0, 1, 0, 2, // a path: specs / input / attributes / autocomplete
        1, 0, 0, //                   the flag 0 of `input`
        1, 0, 2, //                   the flag 2 of `input`
        2, 10, 9, //                  `span` in `#phrasing`
    ];
    QuestionsFile {
        strings,
        bits: vec![0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 2, 5],
        bit_answers: Vec::new(),
        paths,
        path_answers: vec![0; 6],
        stream,
        stream_answers: vec![0; 4],
    }
}

#[test]
fn the_loops_answer_what_the_digest_of_the_value_says() {
    let questions = hand_made_questions();
    let specs = SPEC["specs"].as_array().unwrap();
    let input = specs.iter().find(|element| element["name"] == "input").unwrap();
    let expected = [
        digest_value(&input["attributes"]["autocomplete"]).unwrap(),
        0,
        digest_value(&SPEC["def"]["#globalAttrs"]["#HTMLGlobalAttrs"]["id"]).unwrap(),
        digest_value(
            SPEC["def"]["#aria"]["1.2"]["roles"]
                .as_array()
                .unwrap()
                .iter()
                .find(|role| role["name"] == "button")
                .unwrap(),
        )
        .unwrap(),
        digest_value(&specs[0]).unwrap(),
        0,
    ];
    let objects = objects_of(&SPEC).unwrap();
    assert_eq!(ask_paths_objects(&objects, &questions).unwrap(), expected);
    for variant in variants() {
        let packed = encode_spec(&SPEC, variant).unwrap();
        assert_eq!(ask_paths(&packed, &questions).unwrap(), expected, "{}", variant.stem());
    }
    assert_ne!(expected[0], 0);
}

#[test]
fn the_stream_and_the_bits_agree_between_the_candidates_and_the_objects() {
    let mut questions = hand_made_questions();
    // flags of the first elements, and a category of each
    questions.bits = (0..40)
        .flat_map(|element| [u32::from(element % 3 == 0), element, element % 4])
        .collect();
    let objects = objects_of(&SPEC).unwrap();
    questions.stream_answers = vec![0; 4];
    let expected_bits = ask_bits_objects(&objects, &questions).unwrap();
    let expected_stream = ask_stream_objects(&objects, &questions).unwrap();
    assert_eq!(expected_stream.len(), 4);
    for variant in variants() {
        let packed = encode_spec(&SPEC, variant).unwrap();
        assert_eq!(
            ask_bits(&packed, &questions).unwrap(),
            expected_bits,
            "{}",
            variant.stem()
        );
        assert_eq!(
            ask_stream(&packed, &questions).unwrap(),
            expected_stream,
            "{}",
            variant.stem()
        );
    }
}

/// Questions of one kind with the numbers that a test gives them.
fn questions_of(paths: &[u32], stream: &[u32], bits: &[u32]) -> QuestionsFile {
    QuestionsFile {
        strings: vec!["input".to_string(), "missing".to_string()],
        bits: bits.to_vec(),
        bit_answers: vec![0; bits.len() / 3],
        paths: paths.to_vec(),
        path_answers: vec![0; usize::from(!paths.is_empty())],
        stream: stream.to_vec(),
        stream_answers: vec![0; usize::from(!stream.is_empty())],
    }
}

#[test]
fn a_question_that_names_nothing_is_an_error_and_not_an_answer() {
    let packed = encode_spec(&small(), variants()[1]).unwrap();
    let objects = objects_of(&small()).unwrap();
    let cases: [(QuestionsFile, &str); 7] = [
        // a kind of step that is not one
        (
            questions_of(&[0, 1, 9, 0], &[], &[]),
            "There is no kind 9 of a step of a path",
        ),
        // a string that the table does not have
        (
            questions_of(&[0, 1, 0, 5], &[], &[]),
            "There is no string 5 in the table of the questions",
        ),
        // the same, after a step that found nothing: the walk does not stop reading
        (
            questions_of(&[0, 2, 0, 1, 0, 6], &[], &[]),
            "There is no string 6 in the table of the questions",
        ),
        // a path that is cut short
        (questions_of(&[0, 3, 0, 0], &[], &[]), "The questions are cut short"),
        // an operation that is not one
        (
            questions_of(&[], &[9], &[]),
            "There is no kind 9 of an operation of a stream",
        ),
        // a string of a flag that the table does not have
        (
            questions_of(&[], &[1, 7, 0], &[]),
            "There is no string 7 in the table of the questions",
        ),
        // a kind of question of the bits that is not one
        (
            questions_of(&[], &[], &[7, 0, 0]),
            "There is no kind 7 of a question of the bits",
        ),
    ];
    for (questions, reason) in &cases {
        let results = [
            ask_paths(&packed, questions).map(|_| ()),
            ask_stream(&packed, questions).map(|_| ()),
            ask_bits(&packed, questions).map(|_| ()),
            ask_paths_objects(&objects, questions).map(|_| ()),
            ask_stream_objects(&objects, questions).map(|_| ()),
            ask_bits_objects(&objects, questions).map(|_| ()),
        ];
        // the way that is given what is wrong says why; the others have nothing to read of it
        assert!(
            results
                .iter()
                .any(|result| result.as_ref().is_err_and(|error| error.contains(reason))),
            "{reason}: {results:?}"
        );
    }
    // a question of the bits that is not three numbers
    assert_eq!(
        ask_bits(&packed, &questions_of(&[], &[], &[0, 0])).unwrap_err(),
        "The questions of the bits are not three numbers each"
    );
    // a number that the format does not hold, at the end of a path of the objects
    let big = ObjectSpec::new(vec![
        json!([4_294_967_296_u64]),
        json!({}),
        json!({}),
        json!({}),
        json!({}),
    ]);
    let error = ask_paths_objects(&big, &questions_of(&[0, 1, 1, 0], &[], &[])).unwrap_err();
    assert!(error.contains("non-negative integer below 2^32"), "{error}");
}

fn extension() -> Value {
    json!({
        "def": {
            "#globalAttrs": { "#extends": { "x-new": { "type": "Any" }, "id": { "type": "Any" } } },
            "#aria": {
                "1.1": { "roles": [], "props": [] },
                "1.2": { "roles": [{ "name": "Button", "x": 1 }, { "name": "new-role" }], "props": [] },
                "1.3": { "roles": [], "props": [] }
            },
            "#contentModels": { "#flow": ["x-element"], "#new": ["EL1"] }
        },
        "specs": [
            { "name": "EL1", "attributes": { "attr0": { "type": "Boolean" }, "new": { "type": "Any" } }, "extra": true },
            { "name": "not-in-the-base" }
        ],
        "movedToHead": ["head-element"],
        "acceptedAttrNames": ["(x)"],
        "templateContent": false,
        "literalValues": { "attrs": { "class": { "k": "v" } }, "customElements": { "attrs": { "x": { "y": "z" } } } }
    })
}

#[test]
fn a_composition_means_what_a_hand_written_expectation_says() {
    let mut spec = small();
    spec["def"]["#globalAttrs"]["#HTMLGlobalAttrs"]["lang"] = json!({ "type": "Any" });
    spec["directivePatterns"] = json!([{ "a": 1 }]);
    let flow_members = spec["def"]["#contentModels"]["#flow"].as_array().unwrap().len();
    for variant in variants().into_iter().step_by(3) {
        let base = encode_spec(&spec, variant).unwrap();
        let composed = compose(&base, &[extension()]).unwrap().to_json();

        // `specs`: the element that has the name (without regard to case) is merged and keeps its place; the other is dropped
        let specs = composed["specs"].as_array().unwrap();
        assert_eq!(specs.len(), SMALL_ELEMENTS);
        assert_eq!(specs[1]["name"], json!("EL1"));
        assert_eq!(specs[1]["extra"], json!(true));
        assert_eq!(specs[1]["cite"], json!("https://example.test/#el1"));
        assert_eq!(specs[1]["attributes"]["attr0"], json!({ "type": "Boolean" }));
        assert_eq!(specs[1]["attributes"]["new"], json!({ "type": "Any" }));
        assert!(specs.iter().all(|element| element["name"] != json!("not-in-the-base")));
        assert_eq!(specs[0]["name"], json!("el0"));
        // the `globalAttrs` and the `attributes` that the merge sets are on the elements that were merged
        assert_eq!(specs[1]["globalAttrs"], json!({}));

        // `#globalAttrs`: the extension is merged into `#HTMLGlobalAttrs`, and what it has overrides the whole attribute
        let global = &composed["def"]["#globalAttrs"]["#HTMLGlobalAttrs"];
        assert_eq!(global["id"], json!({ "type": "Any" }));
        assert_eq!(global["lang"], json!({ "type": "Any" }));
        assert_eq!(global["x-new"], json!({ "type": "Any" }));

        // `#aria`: a role is merged by name without regard to case, the merged one goes to the end, and a new one is added
        let roles = composed["def"]["#aria"]["1.2"]["roles"].as_array().unwrap();
        assert_eq!(roles.len(), 2);
        assert_eq!(
            roles[0],
            json!({ "name": "Button", "deprecated": false, "n": 3, "x": 1 })
        );
        assert_eq!(roles[1], json!({ "name": "new-role" }));

        // `#contentModels`: the arrays of the base and then those of the extension
        let flow = &composed["def"]["#contentModels"]["#flow"];
        assert_eq!(flow.as_array().unwrap().last().unwrap(), &json!("x-element"));
        assert_eq!(flow.as_array().unwrap().len(), flow_members + 1);
        assert_eq!(composed["def"]["#contentModels"]["#new"], json!(["EL1"]));

        // the rest
        assert_eq!(composed["directivePatterns"], json!([{ "a": 1 }]));
        assert_eq!(composed["movedToHead"], json!(["head-element"]));
        assert_eq!(composed["acceptedAttrNames"], json!(["(x)"]));
        assert_eq!(composed["templateContent"], json!(false));
        assert_eq!(
            composed["literalValues"],
            json!({ "attrs": { "class": { "k": "v" } }, "customElements": { "attrs": { "x": { "y": "z" } } } })
        );

        // and the bits are of the composed spec, by exact name: the element that the extension renamed `EL1` is a member of the new category
        let composed_spec = compose(&base, &[extension()]).unwrap();
        let rows = composed["def"]["#contentModels"].as_object().unwrap();
        let new = rows.keys().position(|key| key == "#new").unwrap();
        assert_eq!(composed_spec.member(1, u32::try_from(new).unwrap()), 1);
        assert_eq!(composed_spec.member(0, u32::try_from(new).unwrap()), 0);
    }
}

#[test]
fn a_composition_shares_what_it_does_not_touch_and_keeps_the_numbers_of_the_strings() {
    let spec = small();
    let flow_members = spec["def"]["#contentModels"]["#flow"].as_array().unwrap().len();
    let base = encode_spec(&spec, variants()[0]).unwrap();
    let before = base.serialize();
    let composed = compose(&base, &[json!({ "def": { "#contentModels": { "#flow": ["el9"] } } })]).unwrap();
    assert_eq!(
        composed.to_json()["def"]["#contentModels"]["#flow"]
            .as_array()
            .unwrap()
            .len(),
        flow_members + 1
    );
    assert_eq!(base.serialize(), before);
    for sid in 0..base.string_count() {
        let sid = u32::try_from(sid).unwrap();
        assert_eq!(composed.string_bytes(sid), base.string_bytes(sid));
    }
    // no extension, or one that touches nothing, is the base itself
    assert_eq!(compose(&base, &[]).unwrap().serialize(), before);
    assert_eq!(compose(&base, &[json!({})]).unwrap().serialize(), before);
    // and a composition can be composed again, and opened as a file
    let twice = compose(&composed, &[extension()]).unwrap();
    assert_eq!(PackedSpec::open(&words(&twice)).unwrap().to_json(), twice.to_json());
}

/// An extension that changes two elements of the data of `html-spec`, and nothing else of `specs`.
fn small_extension() -> Value {
    json!({ "specs": [
        { "name": "input", "attributes": { "x-added": { "type": "Any" } } },
        { "name": "select", "globalAttrs": { "#ARIAAttrs": false } }
    ] })
}

/// The nodes that can be reached from a node of a region.
fn reachable(spec: &PackedSpec, region: usize, node: u32, found: &mut std::collections::BTreeSet<u32>) {
    if !found.insert(node) {
        return;
    }
    match spec.tag(region, node) {
        crate::format::tag::ARRAY => {
            for position in 0..spec.count(region, node) {
                reachable(spec, region, spec.at(region, node, position), found);
            }
        }
        crate::format::tag::OBJECT => {
            for position in 0..spec.count(region, node) {
                reachable(spec, region, spec.value_at(region, node, position), found);
            }
        }
        _ => {}
    }
}

#[test]
fn a_composition_appends_what_the_extension_changes_and_shares_the_nodes_of_the_rest() {
    for variant in variants() {
        let base = encode_spec(&SPEC, variant).unwrap();
        let composed = compose(&base, &[small_extension()]).unwrap();
        let (nodes, lists, indexes) = base.region_counts(0);
        let (more_nodes, more_lists, more_indexes) = composed.region_counts(0);

        // A region is made once for each node it holds: what the encoder made is not stored twice
        let tuples = |spec: &PackedSpec, from: u32, to: u32| -> usize {
            (from..to)
                .map(|node| spec.node_words(0, node))
                .collect::<std::collections::BTreeSet<_>>()
                .len()
        };
        assert_eq!(tuples(&base, 0, nodes) as u32, nodes, "{}", variant.stem());
        assert_eq!(
            tuples(&composed, nodes, more_nodes) as u32,
            more_nodes - nodes,
            "{}",
            variant.stem()
        );

        // What was added is what is reachable from the new root and was not there: nothing else was made
        let mut new_root = std::collections::BTreeSet::new();
        reachable(&composed, 0, composed.root(0), &mut new_root);
        let new: Vec<u32> = new_root.iter().copied().filter(|node| *node >= nodes).collect();
        assert_eq!(new.len() as u32, more_nodes - nodes, "{}", variant.stem());
        assert!(more_nodes > nodes && more_lists > lists && more_indexes > indexes);

        // The element that is not one of the two is the node that it was
        let old = base.to_json();
        let elements = old["specs"].as_array().unwrap();
        for (position, element) in elements.iter().enumerate() {
            let position = u32::try_from(position).unwrap();
            let name = element["name"].as_str().unwrap();
            let shared = composed.at(0, composed.root(0), position) == base.at(0, base.root(0), position);
            assert_eq!(
                shared,
                name != "input" && name != "select",
                "{}: {name}",
                variant.stem()
            );
        }

        // The index of the names of `specs` is the one that the region had
        assert_eq!(
            composed.node_words(0, composed.root(0))[3],
            base.node_words(0, base.root(0))[3],
            "{}",
            variant.stem()
        );
        // The regions that the extension does not touch are the same words
        for region in 1..5 {
            assert_eq!(composed.region_counts(region), base.region_counts(region));
            assert_eq!(composed.root(region), base.root(region));
        }
        // and what was there is still there, with the two elements merged
        let json = composed.to_json();
        let specs = json["specs"].as_array().unwrap();
        assert_eq!(specs.len(), elements.len());
        for (element, previous) in specs.iter().zip(elements) {
            if element["name"] != json!("input") && element["name"] != json!("select") {
                assert_eq!(element, previous);
            }
        }
        let input = specs.iter().find(|element| element["name"] == json!("input")).unwrap();
        assert_eq!(input["attributes"]["x-added"], json!({ "type": "Any" }));
        assert_eq!(
            input["attributes"]["type"],
            previous_attribute(elements, "input", "type")
        );
        let select = specs.iter().find(|element| element["name"] == json!("select")).unwrap();
        assert_eq!(select["globalAttrs"]["#ARIAAttrs"], json!(false));
    }
}

fn previous_attribute(specs: &[Value], element: &str, attribute: &str) -> Value {
    specs.iter().find(|spec| spec["name"] == json!(element)).unwrap()["attributes"][attribute].clone()
}

#[test]
fn an_index_that_has_the_keys_of_one_that_the_region_had_is_not_made_again() {
    for variant in variants() {
        let base = encode_spec(&SPEC, variant).unwrap();
        // The attributes of `select` are the same names after the merge, and so are the names of `specs`
        let composed = compose(
            &base,
            &[json!({ "specs": [{ "name": "select", "cite": "https://example.test/#select" }] })],
        )
        .unwrap();
        assert_eq!(
            composed.region_counts(0).2,
            base.region_counts(0).2,
            "{}",
            variant.stem()
        );
        assert_eq!(composed.region_indexes(0), base.region_indexes(0));
        // A table of the base is found by its keys: the walk of the indexes sees every one of them
        let keys = base.region_index_keys(0).unwrap();
        assert_ne!(keys.len(), 0);
        assert!(keys.iter().all(|(keys, _)| !keys.is_empty()));
    }
}

#[test]
fn a_composition_of_every_candidate_opens_as_a_file_and_reads_as_it_was_made() {
    for variant in variants() {
        let base = encode_spec(&SPEC, variant).unwrap();
        for extensions in [
            vec![small_extension()],
            vec![extension()],
            vec![small_extension(), extension()],
        ] {
            let composed = compose(&base, &extensions).unwrap();
            let opened = PackedSpec::open(&words(&composed)).unwrap();
            assert_eq!(opened.to_json(), composed.to_json(), "{}", variant.stem());
            assert_eq!(opened.serialize(), composed.serialize(), "{}", variant.stem());
        }
    }
}

#[test]
fn a_composition_can_be_composed_again_to_what_both_extensions_say_together() {
    for variant in variants() {
        let base = encode_spec(&small(), variant).unwrap();
        let other = json!({
            "def": { "#contentModels": { "#flow": ["el7"] }, "#globalAttrs": { "#extends": { "x-other": { "type": "Any" } } } },
            "specs": [{ "name": "el2", "extra": 1, "attributes": { "attr0": { "type": "Boolean" } } }],
            "movedToHead": ["another"]
        });
        let once = compose(&base, &[extension()]).unwrap();
        let twice = compose(&once, std::slice::from_ref(&other)).unwrap();
        let together = compose(&base, &[extension(), other.clone()]).unwrap();
        assert_eq!(twice.to_json(), together.to_json(), "{}", variant.stem());
        // the bits are those of what was composed
        for element in 0..twice.element_count() {
            for flag in 0..4 {
                assert_eq!(twice.flag(element, flag), together.flag(element, flag));
            }
        }
        assert_eq!(PackedSpec::open(&words(&twice)).unwrap().to_json(), twice.to_json());
    }
}

#[test]
fn a_composition_of_an_extension_that_schema_to_spec_would_refuse_is_refused() {
    let base = encode_spec(&small(), variants()[0]).unwrap();
    // the ARIA of an extension that lacks a version
    assert_eq!(
        compose(&base, &[json!({ "def": { "#aria": { "1.1": {} } } })]).unwrap_err(),
        "The ARIA of the extension has no version 1.2"
    );
    // an extension that names an item with something that is not a name
    assert_eq!(
        compose(&base, &[json!({ "specs": [{ "name": 3 }] })]).unwrap_err(),
        "The name of an element spec is a string"
    );
}

/// The checksum of a file: its last word.
fn checksum(file: &[u8]) -> u32 {
    *file_words(file).last().unwrap()
}

#[test]
fn the_files_of_the_small_spec_have_the_checksums_that_the_typescript_side_writes() {
    // The bytes follow the order of the keys of the JSON text
    require_preserve_order().expect("the bytes of a candidate follow the order of the keys");
    let spec = fixture_json("small-spec.json");
    let extension = fixture_json("small-extension.json");
    let golden = fixture_json("golden.json");
    let golden = golden.as_object().unwrap();
    assert_eq!(golden.len(), variants().len());
    for variant in variants() {
        let expected = &golden[&variant.stem()];
        let base = encode_spec(&spec, variant).unwrap();
        let file = base.serialize();
        assert_eq!(
            u64::from(checksum(&file)),
            expected["base"].as_u64().unwrap(),
            "{}: the file of the small spec",
            variant.stem()
        );
        assert_eq!(
            file.len() as u64,
            expected["bytes"].as_u64().unwrap(),
            "{}",
            variant.stem()
        );
        let composed = compose(&base, std::slice::from_ref(&extension)).unwrap().serialize();
        assert_eq!(
            u64::from(checksum(&composed)),
            expected["composed"].as_u64().unwrap(),
            "{}: the file of the small spec composed with the small extension",
            variant.stem()
        );
    }
}

#[test]
fn the_allocator_counts_the_blocks_that_it_saw_and_no_others() {
    // A block that was allocated before the counting began is freed in it, and is not taken off
    let before: Vec<u8> = vec![7; 1000];
    let (kept, retained, peak) = counted(|| {
        drop(before);
        Ok(vec![1_u8; 4096])
    })
    .unwrap();
    assert_eq!(retained, 4096);
    assert!(peak >= 4096);
    assert_eq!(kept.len(), 4096);

    // What is made and given back is in the peak and not in what is kept
    let ((), retained, peak) = counted(|| {
        let scratch = vec![0_u8; 10_000];
        black_box(scratch.len());
        Ok(())
    })
    .unwrap();
    assert_eq!(retained, 0);
    assert!(peak >= 10_000);

    // What it did not count it does not count after: a block that is freed once the counting is over is not a figure
    let (outside, _, _) = counted(|| Ok(vec![0_u8; 64])).unwrap();
    let ((), retained, _) = counted(|| {
        drop(outside);
        Ok(())
    })
    .unwrap();
    assert_eq!(retained, 0);
}

/// A directory of the inputs of the program, which is removed when it is dropped.
struct Inputs(PathBuf);

impl Inputs {
    fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("packed-candidates-{}-{name}", std::process::id()));
        fs::create_dir_all(&path).unwrap();
        Self(path)
    }

    fn path(&self) -> &str {
        self.0.to_str().unwrap()
    }

    fn write(&self, name: &str, bytes: &[u8]) {
        fs::write(self.0.join(name), bytes).unwrap();
    }
}

impl Drop for Inputs {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).ok();
    }
}

/// What `prepare.ts` writes for the small spec and the small extension, for one candidate, with questions that are answered
/// by the objects.
fn inputs(name: &str, variant: Variant) -> Inputs {
    let spec = fixture_json("small-spec.json");
    let extension = fixture_json("small-extension.json");
    let directory = Inputs::new(name);
    directory.write("index.min.json", spec.to_string().as_bytes());
    directory.write("extensions.json", json!({ "small": extension }).to_string().as_bytes());
    let base = encode_spec(&spec, variant).unwrap();
    directory.write(&format!("{}.bin", variant.stem()), &base.serialize());
    directory.write(
        &format!("{}.small.bin", variant.stem()),
        &compose(&base, std::slice::from_ref(&extension)).unwrap().serialize(),
    );

    let strings = [
        "el1",
        "attributes",
        "attr0",
        "no-such",
        "#HTMLGlobalAttrs",
        "id",
        "#flow",
        "el0",
        "x-attr",
    ];
    let mut questions = QuestionsFile {
        strings: strings.iter().map(|text| (*text).to_string()).collect(),
        bits: (0..SMALL_ELEMENTS as u32)
            .flat_map(|element| [0, element, element % 4])
            .chain([1, 0, 0, 1, 3, 1, 1, 5, 2])
            .collect(),
        bit_answers: Vec::new(),
        paths: vec![
            0, 3, 2, 0, 0, 1, 0, 2, // specs / el1 / attributes / attr0
            0, 3, 2, 0, 0, 1, 0, 3, // specs / el1 / attributes / no-such
            1, 2, 0, 4, 0, 5, //       #globalAttrs / #HTMLGlobalAttrs / id
        ],
        path_answers: Vec::new(),
        stream: vec![1, 7, 0, 1, 0, 3, 2, 7, 6, 2, 3, 6, 0, 0, 3, 2, 0, 0, 1, 0, 2],
        stream_answers: Vec::new(),
    };
    questions.bit_answers = vec![0; questions.bits.len() / 3];
    questions.path_answers = vec![0; 3];
    questions.stream_answers = vec![0; 5];
    let objects = objects_of(&spec).unwrap();
    let answers = (
        ask_bits_objects(&objects, &questions).unwrap(),
        ask_paths_objects(&objects, &questions).unwrap(),
        ask_stream_objects(&objects, &questions).unwrap(),
    );
    directory.write(
        "questions.json",
        json!({
            "strings": questions.strings,
            "bits": questions.bits,
            "bitAnswers": answers.0,
            "paths": questions.paths,
            "pathAnswers": answers.1,
            "stream": questions.stream,
            "streamAnswers": answers.2,
        })
        .to_string()
        .as_bytes(),
    );
    directory
}

fn names(measurements: &[Value]) -> Vec<String> {
    measurements
        .iter()
        .map(|measurement| measurement["name"].as_str().unwrap().to_string())
        .collect()
}

#[test]
fn every_scenario_runs_on_the_small_spec_and_reports_what_the_other_side_reads() {
    let variant = variants()[1];
    let directory = inputs("scenarios", variant);
    let (stem, path) = (variant.stem(), directory.path());

    assert_eq!(check(&stem, path).unwrap().len(), 0);
    assert_eq!(
        names(&load(&stem, path, 2).unwrap()),
        [
            "packed-rust-open",
            "packed-rust-crc",
            "packed-rust-heap-after-open",
            "packed-rust-heap-peak-open"
        ]
    );
    assert_eq!(
        names(&query(&stem, path, 2).unwrap()),
        ["packed-rust-bits", "packed-rust-paths", "packed-rust-stream"]
    );
    assert_eq!(
        names(&compose_scenario(&stem, path, 2).unwrap()),
        ["packed-rust-compose-small"]
    );
    assert_eq!(
        names(&hash_scenario(path, 2).unwrap()),
        ["packed-rust-hash-murmur3", "packed-rust-hash-xxhash32"]
    );

    // The baseline reports the memory that the objects keep, and the opened spec reports what it keeps
    let objects = value(path, 2).unwrap();
    assert_eq!(
        names(&objects),
        [
            "packed-rust-value-load",
            "packed-rust-value-heap-after-load",
            "packed-rust-value-heap-peak-load",
            "packed-rust-value-bits",
            "packed-rust-value-paths",
            "packed-rust-value-stream"
        ]
    );
    let kept = objects[1]["values"][0].as_f64().unwrap();
    let peak = objects[2]["values"][0].as_f64().unwrap();
    assert!(kept > 0.0 && peak >= kept, "{kept} {peak}");
    let opened = load(&stem, path, 2).unwrap();
    let file_size = fs::metadata(format!("{path}/{stem}.bin")).unwrap().len();
    assert!(opened[2]["values"][0].as_f64().unwrap() as u64 >= file_size);
}

#[test]
fn check_stops_for_a_file_that_is_not_the_one_that_this_side_makes() {
    let variant = variants()[1];
    let directory = inputs("check", variant);
    let (stem, path) = (variant.stem(), directory.path());
    assert!(check(&stem, path).is_ok());

    let composed = format!("{path}/{stem}.small.bin");
    let mut bytes = fs::read(&composed).unwrap();
    let at = bytes.len() / 2;
    bytes[at] ^= 1;
    fs::write(&composed, bytes).unwrap();
    let error = check(&stem, path).unwrap_err();
    assert!(error.starts_with("compose small: the bytes differ"), "{error}");

    let base = format!("{path}/{stem}.bin");
    let mut bytes = fs::read(&base).unwrap();
    bytes.truncate(bytes.len() - 4);
    fs::write(&base, bytes).unwrap();
    let error = check(&stem, path).unwrap_err();
    assert!(error.starts_with("encode: "), "{error}");
}

#[test]
fn the_scenario_names_and_the_arguments_are_checked_first() {
    let words = |list: &[&str]| list.iter().map(|word| (*word).to_string()).collect::<Vec<_>>();
    assert!(
        run(&words(&["nope", "-", "dir", "1"]))
            .unwrap_err()
            .contains("Unknown scenario")
    );
    assert!(
        run(&words(&["load", "-", "dir", "0"]))
            .unwrap_err()
            .contains("positive integer")
    );
    assert!(run(&words(&["load", "-"])).unwrap_err().contains("Usage"));
    assert!(
        run(&words(&["load", "no-such", "dir", "1"]))
            .unwrap_err()
            .contains("is not a candidate")
    );
}

/// The candidate of the adopted form without either choice of the size of the file.
fn plain_pow2(columns: bool) -> Variant {
    Variant::plain(
        columns,
        crate::format::IndexKind::Pow2,
        crate::format::HashKind::Murmur3,
    )
}

#[test]
fn the_choices_of_the_size_of_the_file_are_bits_five_and_six_of_the_variant() {
    let plain = plain_pow2(false);
    assert_eq!(plain.word(), 0b000_0100);
    assert_eq!(Variant { grouped: true, ..plain }.word(), 0b010_0100);
    assert_eq!(Variant { zero: true, ..plain }.word(), 0b100_0100);
    assert_eq!(
        Variant {
            grouped: true,
            zero: true,
            ..plain
        }
        .word(),
        0b110_0100
    );
    assert!(Variant::from_word(0b001_0100).is_err());
    assert!(Variant::from_word(0b10_0000_0100).is_err());
}

#[test]
fn the_candidates_of_the_choices_of_the_size_of_the_file_have_the_stems_of_their_files() {
    let stems: Vec<String> = variants().iter().map(|variant| variant.stem()).collect();
    for expected in [
        "rows-pow2-murmur3-grouped",
        "columns-pow2-murmur3-grouped",
        "rows-pow2-murmur3-zero",
        "columns-pow2-murmur3-zero",
        "rows-pow2-murmur3-grouped-zero",
        "columns-pow2-murmur3-grouped-zero",
        "columns-pow2-murmur3-grouped-zero-narrow",
        "columns-pow2-murmur3-grouped-zero-bare",
        "columns-pow2-murmur3-grouped-zero-narrow-bare",
    ] {
        assert!(stems.iter().any(|stem| stem == expected), "{expected}");
    }
}

/// The candidate in columns with the nodes grouped and the empty slot 0, with the choices that make the strings and the indexes
/// smaller.
fn smaller(narrow: bool, bare: bool) -> Variant {
    Variant {
        grouped: true,
        zero: true,
        narrow,
        bare,
        ..plain_pow2(true)
    }
}

#[test]
fn two_nodes_that_share_a_list_and_do_not_have_the_same_count_are_refused() {
    // Two arrays in rows, at the same position of the lists, of one and of two items
    let words = [
        2,
        2,
        0,
        0,
        crate::format::tag::ARRAY,
        0,
        1,
        0,
        crate::format::tag::ARRAY,
        0,
        2,
        0,
        0,
        1,
    ];
    let error = crate::group::group_region(&words_to_bytes(&words), false, false).unwrap_err();
    assert!(error.contains("share a list with 1 and 2 items"), "{error}");
}

#[test]
fn a_sorted_index_is_not_asked_for_the_empty_slot_or_for_a_bare_index_by_a_header() {
    let sorted = Variant::plain(
        false,
        crate::format::IndexKind::Sorted,
        crate::format::HashKind::Murmur3,
    );
    assert!(Variant::from_word(sorted.word()).is_ok());
    assert!(Variant::from_word(sorted.word() | 0b0_0100_0000).is_err());
    assert!(Variant::from_word(sorted.word() | 0b1_0000_0000).is_err());
}

#[test]
fn the_choices_of_the_strings_and_the_indexes_are_bits_seven_and_eight_of_the_variant() {
    assert_eq!(smaller(false, false).word(), 0b0_0110_0101);
    assert_eq!(smaller(true, false).word(), 0b0_1110_0101);
    assert_eq!(smaller(false, true).word(), 0b1_0110_0101);
    assert_eq!(smaller(true, true).word(), 0b1_1110_0101);
    for variant in [smaller(true, false), smaller(false, true), smaller(true, true)] {
        assert_eq!(Variant::from_word(variant.word()).unwrap(), variant);
    }
}

#[test]
fn the_offsets_of_the_strings_in_sixteen_bits_are_the_count_and_the_offsets_two_to_a_word() {
    let wide = encode_spec(&SPEC, smaller(false, false)).unwrap();
    let narrow = encode_spec(&SPEC, smaller(true, false)).unwrap();
    let offsets = narrow.section_bytes(section::STRING_OFFSETS);
    assert_eq!(u64::from(crate::read::word(offsets, 0)), wide.string_count() as u64);
    assert_eq!(offsets.len() / 4, 1 + (wide.string_count() + 1).div_ceil(2));
    assert_eq!(narrow.string_count(), wide.string_count());
    for sid in 0..wide.string_count() {
        assert_eq!(narrow.string_bytes(sid as u32), wide.string_bytes(sid as u32), "{sid}");
    }
    assert_eq!(narrow.to_json(), *SPEC);
    let file = Rc::new(narrow.serialize());
    let opened = PackedSpec::open(&file).unwrap();
    assert_eq!(opened.variant, smaller(true, false));
    assert_eq!(opened.to_json(), *SPEC);
}

/// How many bytes the strings of a spec are.
fn string_bytes_of(packed: &PackedSpec) -> usize {
    (0..packed.string_count())
        .map(|sid| packed.string_bytes(sid as u32).len())
        .sum()
}

/// A spec whose strings are exactly this many bytes: an element with a `cite` of the length that makes up the difference.
/// (`schemaToSpec` spreads the attributes of an element and gives it `globalAttrs`, so the element has both, as those of
/// `html-spec` do.)
fn spec_with_string_bytes(total: usize) -> Value {
    let def = json!({ "#globalAttrs": {}, "#aria": {}, "#contentModels": {} });
    let element = |cite: String| json!({ "name": "a", "cite": cite, "attributes": {}, "globalAttrs": {} });
    let without = string_bytes_of(
        &encode_spec(
            &json!({ "def": def, "specs": [element(String::new())] }),
            smaller(false, false),
        )
        .unwrap(),
    );
    json!({ "def": def, "specs": [element("x".repeat(total - without))] })
}

#[test]
fn a_spec_whose_strings_are_more_than_65535_bytes_has_its_offsets_in_thirty_two_bits() {
    let spec = spec_with_string_bytes(crate::format::NARROW_LIMIT + 1);
    let packed = encode_spec(&spec, smaller(true, false)).unwrap();
    assert!(!packed.variant.narrow);
    assert_eq!(packed.to_json(), spec);
    let file = Rc::new(packed.serialize());
    let opened = PackedSpec::open(&file).unwrap();
    assert!(!opened.variant.narrow);
    assert_eq!(opened.to_json(), spec);
}

#[test]
fn a_spec_whose_strings_are_exactly_65535_bytes_has_its_offsets_in_sixteen_bits() {
    let spec = spec_with_string_bytes(crate::format::NARROW_LIMIT);
    let packed = encode_spec(&spec, smaller(true, false)).unwrap();
    assert_eq!(string_bytes_of(&packed), crate::format::NARROW_LIMIT);
    assert!(packed.variant.narrow);
    assert_eq!(packed.to_json(), spec);
}

/// An extension whose strings pass 65,535 bytes with those of a spec that has `string_bytes` (an element that the base lacks is
/// dropped by `schemaToSpec`, so what it adds goes to an element that the base has).
fn big_extension(string_bytes: usize) -> Value {
    let cite = "x".repeat(crate::format::NARROW_LIMIT - string_bytes + 100);
    json!({ "specs": [{ "name": "div", "attributes": { "x-big-attr": { "type": "Any", "cite": cite } } }] })
}

#[test]
fn a_composition_that_lands_on_65535_bytes_stays_in_sixteen_bits_and_one_byte_more_widens_it() {
    let base = encode_spec(
        &spec_with_string_bytes(crate::format::NARROW_LIMIT - 10),
        smaller(true, false),
    )
    .unwrap();
    let adding = |bytes: usize| json!({ "specs": [{ "name": "a", "cite": "y".repeat(bytes), "attributes": {}, "globalAttrs": {} }] });
    let lands = compose(&base, &[adding(10)]).unwrap();
    assert_eq!(string_bytes_of(&lands), crate::format::NARROW_LIMIT);
    assert!(lands.variant.narrow);
    let passes = compose(&base, &[adding(11)]).unwrap();
    assert_eq!(string_bytes_of(&passes), crate::format::NARROW_LIMIT + 1);
    assert!(!passes.variant.narrow);
}

#[test]
fn a_composition_whose_strings_pass_that_count_is_widened_and_keeps_the_numbers_of_the_strings() {
    let base = encode_spec(&SPEC, smaller(true, false)).unwrap();
    let composed = compose(&base, &[big_extension(string_bytes_of(&base))]).unwrap();
    assert!(!composed.variant.narrow);
    for sid in 0..base.string_count() {
        assert_eq!(
            composed.string_bytes(sid as u32),
            base.string_bytes(sid as u32),
            "{sid}"
        );
    }
    let file = Rc::new(composed.serialize());
    let opened = PackedSpec::open(&file).unwrap();
    assert!(!opened.variant.narrow);
    assert_eq!(opened.to_json(), composed.to_json());
    let small = compose(
        &base,
        &[json!({ "specs": [{ "name": "div", "attributes": { "x-small-attr": { "type": "Boolean" } } }] })],
    )
    .unwrap();
    assert!(small.variant.narrow);
    assert!(small.string_count() > base.string_count());
}

#[test]
fn the_indexes_of_objects_without_keys_find_every_key_and_no_other() {
    let packed = encode_spec(&SPEC, smaller(false, true)).unwrap();
    let mut checked = 0;
    for region in 0..REGIONS.len() {
        let (count, _, _) = packed.region_counts(region);
        for node in 0..count {
            let words = packed.node_words(region, node);
            if words[0] != crate::format::tag::OBJECT || (words[2] as usize) < INDEX_MINIMUM {
                continue;
            }
            assert_ne!(words[3], 0, "an object of that many keys has an index");
            for j in 0..words[2] {
                let key = packed.string_at(packed.key_at(region, node, j));
                assert_eq!(packed.entry(region, node, &key), j, "{key}");
                checked += 1;
            }
            assert_eq!(packed.entry(region, node, "no-such-key\u{0}"), NONE);
        }
    }
    assert!(checked > 1000);
    assert_eq!(packed.to_json(), *SPEC);
}

#[test]
fn an_index_without_keys_is_refused_for_a_candidate_that_has_no_perfect_hash() {
    let variant = Variant {
        bare: true,
        ..Variant::plain(
            false,
            crate::format::IndexKind::Sorted,
            crate::format::HashKind::Murmur3,
        )
    };
    let error = encode_spec(&SPEC, variant).unwrap_err();
    assert!(error.contains("perfect hash"), "{error}");
}

#[test]
fn the_indexes_that_a_composition_appends_to_a_bare_candidate_find_their_keys() {
    let base = encode_spec(&SPEC, smaller(false, true)).unwrap();
    for extension in [
        json!({ "specs": [{ "name": "div", "attributes": { "x-a": { "type": "Any" } } }] }),
        small_extension(),
        fixture_json("small-extension.json"),
    ] {
        let composed = compose(&base, &[extension]).unwrap();
        for region in 0..REGIONS.len() {
            let (count, _, _) = composed.region_counts(region);
            for node in 0..count {
                let words = composed.node_words(region, node);
                if words[0] != crate::format::tag::OBJECT || words[3] == 0 {
                    continue;
                }
                for j in 0..words[2] {
                    let key = composed.string_at(composed.key_at(region, node, j));
                    assert_eq!(composed.entry(region, node, &key), j, "{key}");
                }
            }
        }
    }
}

#[test]
fn a_grouped_candidate_has_the_nodes_in_the_order_of_their_tags_and_the_data_of_the_plain_one() {
    for variant in variants().into_iter().filter(|variant| variant.grouped) {
        let plain = encode_spec(
            &SPEC,
            Variant {
                grouped: false,
                ..variant
            },
        )
        .unwrap();
        let grouped = encode_spec(&SPEC, variant).unwrap();
        assert_eq!(grouped.to_json(), *SPEC, "{}", variant.stem());
        for region in 0..REGIONS.len() {
            let (count, _, _) = grouped.region_counts(region);
            assert_eq!(
                count,
                plain.region_counts(region).0,
                "{} region {region}",
                variant.stem()
            );
            let tags: Vec<u32> = (0..count).map(|node| grouped.tag(region, node)).collect();
            assert!(
                tags.is_sorted(),
                "{} region {region}: the tags are in order",
                variant.stem()
            );
            assert_eq!(
                grouped.digest(region, grouped.root(region)),
                plain.digest(region, plain.root(region)),
                "{} region {region}: the root is the node of the whole value",
                variant.stem()
            );
        }
        for id in [section::STRING_OFFSETS, section::STRING_BYTES, section::BITS] {
            assert_eq!(grouped.section_bytes(id), plain.section_bytes(id), "{}", variant.stem());
        }
    }
}

/// The slots of the perfect-hash indexes of a region: each record is `[entries, n, seed, buckets, slots, pilots...,
/// slots..., keys...]` (the keys are not there when the top bit of `n` is set), as `(entries, distinct, slots)`.
fn slots_of(indexes: &[u8]) -> Vec<(u32, u32, Vec<u32>)> {
    let words = file_words(indexes);
    let mut found = Vec::new();
    let mut at = 0;
    while at < words.len() {
        let entries = words[at];
        let marked = words[at + 1];
        let slots = words[at + 4] as usize;
        let slots_at = at + 5 + (words[at + 3] as usize).div_ceil(2);
        found.push((
            entries,
            marked & !crate::format::BARE_FLAG,
            words[slots_at..slots_at + slots].to_vec(),
        ));
        // The keys, or the position of a list in place of them
        let keys = if marked & crate::format::BARE_FLAG != 0 {
            1
        } else {
            entries as usize
        };
        at = slots_at + slots + keys;
    }
    found
}

#[test]
fn a_candidate_whose_empty_slot_is_zero_holds_the_position_plus_one_in_the_others() {
    // `specs` is the first of the regions
    const SPECS: usize = 0;
    for variant in variants().into_iter().filter(|variant| variant.zero) {
        let packed = encode_spec(&SPEC, variant).unwrap();
        for region in 0..REGIONS.len() {
            for (entries, distinct, slots) in slots_of(packed.region_indexes(region)) {
                assert!(!slots.contains(&NONE), "{} region {region}", variant.stem());
                assert!(slots.iter().all(|slot| *slot <= entries), "{}", variant.stem());
                assert_eq!(
                    slots.iter().filter(|slot| **slot != 0).count(),
                    distinct as usize,
                    "{}",
                    variant.stem()
                );
            }
        }
        for (position, element) in SPEC["specs"].as_array().unwrap().iter().enumerate() {
            let name = element["name"].as_str().unwrap();
            assert_eq!(
                packed.position(SPECS, packed.root(SPECS), name),
                position as u32,
                "{}: {name}",
                variant.stem()
            );
        }
        for missing in ["", "nope", "svg:", "DIV", "div "] {
            assert_eq!(
                packed.find(SPECS, packed.root(SPECS), missing),
                NONE,
                "{}",
                variant.stem()
            );
        }
    }
}

#[test]
fn an_empty_slot_is_a_slot_of_a_perfect_hash_and_a_sorted_index_is_refused_for_it_by_the_encoder() {
    let variant = Variant {
        zero: true,
        ..Variant::plain(
            false,
            crate::format::IndexKind::Sorted,
            crate::format::HashKind::Murmur3,
        )
    };
    let error = encode_spec(&SPEC, variant).unwrap_err();
    assert!(error.contains("slot of a perfect hash"), "{error}");
    // A spec that has no index to write is refused as well
    let error = encode_spec(&json!({ "specs": [] }), variant).unwrap_err();
    assert!(error.contains("slot of a perfect hash"), "{error}");
    let bare = Variant {
        bare: true,
        zero: false,
        ..variant
    };
    let error = encode_spec(&json!({ "specs": [] }), bare).unwrap_err();
    assert!(error.contains("perfect hash"), "{error}");
}

/// How many records the indexes of a region have: each is `[entries, n, seed, buckets, slots, pilots..., slots..., keys...]`,
/// and the keys are not there when the top bit of `n` is set.
fn record_count(indexes: &[u8]) -> usize {
    let words = file_words(indexes);
    let mut count = 0;
    let mut at = 0;
    while at < words.len() {
        let keys = if words[at + 1] & crate::format::BARE_FLAG != 0 {
            1
        } else {
            words[at] as usize
        };
        at += 5 + (words[at + 3] as usize).div_ceil(2) + words[at + 4] as usize + keys;
        count += 1;
    }
    assert_eq!(at, words.len(), "the records end where the indexes end");
    count
}

#[test]
fn an_index_that_a_composition_made_for_an_object_is_found_by_the_next_composition_and_not_made_again() {
    // `specs` is the first of the regions
    const SPECS: usize = 0;
    let base = encode_spec(&SPEC, smaller(false, true)).unwrap();
    let attributes: Map<String, Value> = (0..=INDEX_MINIMUM)
        .map(|index| (format!("x-n{index}"), json!({ "type": "Boolean" })))
        .collect();
    let extension = json!({ "specs": [{ "name": "div", "attributes": attributes }] });
    let once = compose(&base, std::slice::from_ref(&extension)).unwrap();
    let twice = compose(&once, std::slice::from_ref(&extension)).unwrap();
    // The keys of the attributes of `div` are new, and the second composition has the same keys as the first
    assert!(record_count(once.region_indexes(SPECS)) > record_count(base.region_indexes(SPECS)));
    assert_eq!(
        record_count(twice.region_indexes(SPECS)),
        record_count(once.region_indexes(SPECS))
    );
    assert_eq!(twice.to_json(), once.to_json());
}

#[test]
fn a_region_where_an_index_without_keys_refers_to_a_list_that_it_does_not_have_is_refused() {
    // `#aria` is the third of the regions
    const ARIA: usize = 2;
    let packed = encode_spec(&SPEC, smaller(false, true)).unwrap();
    let words = file_words(&packed.serialize());
    let (start, length) = span(&words, REGIONS[ARIA]);
    let mut region = words[start..start + length].to_vec();
    let (count, list_words) = (region[0] as usize, region[1] as usize);
    let indexes_at = 4 + 4 * count + list_words;
    // The first record without keys: the last word of it is the position of a list
    let mut at = indexes_at;
    while region[at + 1] & crate::format::BARE_FLAG == 0 {
        at += 5 + (region[at + 3] as usize).div_ceil(2) + region[at + 4] as usize + region[at] as usize;
    }
    let last = at + 5 + (region[at + 3] as usize).div_ceil(2) + region[at + 4] as usize;
    // A position past the lists
    region[last] = u32::try_from(list_words).unwrap();
    let file = rebuilt(&words, REGIONS[ARIA], &region);
    let opened = PackedSpec::open(&Rc::new(file)).unwrap();
    let error = opened.region_index_keys(ARIA).unwrap_err();
    assert!(error.contains("refers to a list at"), "{error}");
}

#[test]
fn an_index_without_keys_says_where_the_list_of_an_object_that_has_its_keys_is() {
    let packed = encode_spec(&SPEC, smaller(false, true)).unwrap();
    let mut checked = 0;
    for region in 0..REGIONS.len() {
        // The keys of each record, by its position: those of the first object that has the index, after the mark of its kind
        let records: std::collections::HashMap<u32, Vec<u32>> = packed
            .region_index_keys(region)
            .unwrap()
            .into_iter()
            .map(|(keys, position)| (position, keys[1..].to_vec()))
            .collect();
        let (count, _, _) = packed.region_counts(region);
        for node in 0..count {
            let words = packed.node_words(region, node);
            if words[0] != crate::format::tag::OBJECT || words[3] == 0 {
                continue;
            }
            let keys: Vec<u32> = (0..words[2]).map(|j| packed.key_at(region, node, j)).collect();
            assert_eq!(records[&(words[3] - 1)], keys, "region {region}");
            checked += keys.len();
        }
    }
    assert!(checked > 1000);
}

/// The file of the candidate with 16-bit offsets whose section of the offsets is changed, with the checksum that it then has.
fn narrow_file_with_offsets(change: impl FnOnce(&mut Vec<u32>)) -> Vec<u8> {
    let packed = encode_spec(&SPEC, smaller(true, false)).unwrap();
    let words = file_words(&packed.serialize());
    let (start, length) = span(&words, section::STRING_OFFSETS);
    let mut offsets = words[start..start + length].to_vec();
    change(&mut offsets);
    rebuilt(&words, section::STRING_OFFSETS, &offsets)
}

#[test]
fn a_file_whose_count_of_strings_is_more_than_the_16_bit_offsets_that_it_holds_is_refused() {
    let file = narrow_file_with_offsets(|offsets| offsets[0] += 4);
    let error = PackedSpec::open(&Rc::new(file)).unwrap_err();
    assert!(
        error.contains("not as long as the count of the strings says"),
        "{error}"
    );
}

#[test]
fn a_file_whose_first_16_bit_offset_is_not_0_is_refused() {
    // The first offset is the low half of the word after the count
    let file = narrow_file_with_offsets(|offsets| offsets[1] = (offsets[1] & 0xffff_0000) | 1);
    let error = PackedSpec::open(&Rc::new(file)).unwrap_err();
    assert!(error.contains("does not start at 0"), "{error}");
}

#[test]
fn a_file_whose_16_bit_offsets_are_not_in_order_is_refused() {
    // The third offset is the low half of the second word after the count, and the second is the high half of the first
    let file = narrow_file_with_offsets(|offsets| offsets[2] &= 0xffff_0000);
    let error = PackedSpec::open(&Rc::new(file)).unwrap_err();
    assert!(error.contains("is not in order"), "{error}");
}

#[test]
fn a_region_that_is_cut_short_or_whose_root_or_lists_are_not_its_own_is_refused_by_the_grouping() {
    let tag_array = crate::format::tag::ARRAY;
    let group = |words: &[u32]| crate::group::group_region(&words_to_bytes(words), false, false).unwrap_err();
    assert!(group(&[1, 0, 0, 0, crate::format::tag::NULL, 0, 0, 0, 0]).contains("not as long as its header says"));
    assert!(group(&[1, 0, 0, 1, crate::format::tag::NULL, 0, 0, 0]).contains("not as long as its header says"));
    assert!(group(&[0, 0, 0, 0]).contains("not as long as its header says"));
    assert!(group(&[1, 0, 0, 0, tag_array, 0, 1, 0]).contains("not inside the lists of its region"));
    assert!(group(&[1, 1, 0, 0, tag_array, 0, 1, 0, 7]).contains("holds a node that the region lacks"));
    assert!(group(&[1]).contains("cut short"));
}
