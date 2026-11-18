//! The composition of a packed spec with the extended specs of a configuration, the same as
//! `scripts/spec-baseline/packed/compose.ts`. There is no `schemaToSpec` in Rust (v6 does the merge in JavaScript), so
//! the merge of `@markuplint/ml-spec` (`schema-to-spec.ts` and `merge-array.ts`) is ported here, to `serde_json::Value`
//! (with `preserve_order`, an `insert` of a key that is there keeps its place, as an assignment to a property of a
//! JavaScript object does, and a key that is new goes to the end). The regions that an extension touches are read from
//! the packed spec, merged, and encoded again with the strings of the base at their numbers; the others are shared.
//! The bytes that this makes for an extension are the bytes that the TypeScript one makes: that is the proof that the
//! port means the same.

use serde_json::{Map, Value};

use crate::encode::{StringTable, encode_region};
use crate::format::{REGIONS, section};
use crate::read::PackedSpec;

/// Whether `if (value)` of JavaScript takes the branch.
fn truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(flag) => *flag,
        Value::Number(number) => number.as_f64().is_some_and(|number| number != 0.0),
        Value::String(text) => !text.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

fn truthy_field<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
    value.get(key).filter(|value| truthy(value))
}

/// The regions that extensions touch, by their position in `REGIONS`: the branches of `schemaToSpec`.
pub fn touched_regions(extensions: &[Value]) -> [bool; 5] {
    let mut touched = [false; 5];
    for extension in extensions {
        let def = extension.get("def");
        touched[0] |= truthy_field(extension, "specs").is_some();
        touched[1] |= def
            .and_then(|def| def.get("#globalAttrs"))
            .is_some_and(|global| truthy_field(global, "#extends").is_some());
        touched[2] |= def.is_some_and(|def| truthy_field(def, "#aria").is_some());
        touched[3] |= def.is_some_and(|def| truthy_field(def, "#contentModels").is_some());
        touched[4] |= truthy_field(extension, "directivePatterns").is_some()
            || truthy_field(extension, "movedToHead").is_some()
            || extension.get("acceptedAttrNames").is_some_and(|value| !value.is_null())
            || extension.get("templateContent").is_some_and(|value| !value.is_null())
            || truthy_field(extension, "literalValues").is_some();
    }
    touched
}

/// The entries of an object, or none for what is not one (what a spread of JavaScript gives for it, here).
fn entries(value: Option<&Value>) -> Map<String, Value> {
    value.and_then(Value::as_object).cloned().unwrap_or_default()
}

/// Takes a key out of an object, and keeps the order of the others (the `shift_remove` of `serde_json` exists only
/// with `preserve_order`, which a build of this package alone does not have).
fn take(map: &mut Map<String, Value>, key: &str) -> Option<Value> {
    let mut taken = None;
    let mut rest = Map::new();
    for (name, value) in std::mem::take(map) {
        if name == key {
            taken = Some(value);
        } else {
            rest.insert(name, value);
        }
    }
    *map = rest;
    taken
}

/// `{...target, ...source}` for the entries of `source`.
fn spread(target: &mut Map<String, Value>, source: Option<&Value>) {
    if let Some(source) = source.and_then(Value::as_object) {
        for (key, value) in source {
            target.insert(key.clone(), value.clone());
        }
    }
}

fn name_of(definition: &Value) -> Result<String, String> {
    let name = match definition {
        Value::String(text) => text.as_str(),
        other => other
            .get("name")
            .and_then(Value::as_str)
            .ok_or_else(|| "A named definition is a string or an object with a name".to_string())?,
    };
    Ok(name.to_lowercase().trim().to_string())
}

/// `mergeArray` of `@markuplint/ml-spec`: the items of `b` merged into those of `a` by name.
fn merge_array(a: &[Value], b: &[Value]) -> Result<Vec<Value>, String> {
    let mut result: Vec<Value> = a.to_vec();
    for b_item in b {
        let b_name = name_of(b_item)?;
        let mut found = None;
        for (index, item) in result.iter().enumerate() {
            if name_of(item)? == b_name {
                found = Some(index);
                break;
            }
        }
        let Some(index) = found else {
            result.push(b_item.clone());
            continue;
        };
        let a_item = result.remove(index);
        if b_item.is_string() {
            continue;
        }
        if a_item.is_string() {
            result.push(b_item.clone());
            continue;
        }
        let mut merged = entries(Some(&a_item));
        spread(&mut merged, Some(b_item));
        result.push(Value::Object(merged));
    }
    Ok(result)
}

/// The list of a key of ARIA of a version, merged: the array of the base, or `None` when neither has it.
fn merge_list(base: &Value, extension: &Value, key: &str) -> Result<Option<Value>, String> {
    let a = base.get(key);
    let Some(b) = extension.get(key).filter(|value| truthy(value)) else {
        return Ok(a.cloned());
    };
    let a_items = a
        .and_then(Value::as_array)
        .ok_or_else(|| format!("There is no list \"{key}\" in the ARIA of the base to merge into"))?;
    let b_items = b
        .as_array()
        .ok_or_else(|| format!("\"{key}\" of the ARIA of an extension is a list"))?;
    Ok(Some(Value::Array(merge_array(a_items, b_items)?)))
}

fn merge_aria(base: Option<&Value>, extension: &Value) -> Result<Value, String> {
    let mut aria = Map::new();
    for version in ["1.1", "1.2", "1.3"] {
        let base_version = base
            .and_then(|base| base.get(version))
            .ok_or_else(|| format!("The ARIA of the base has no version {version}"))?;
        let extension_version = extension
            .get(version)
            .ok_or_else(|| format!("The ARIA of the extension has no version {version}"))?;
        let mut merged = Map::new();
        for key in ["roles", "props", "graphicsRoles", "dpubRoles"] {
            if let Some(list) = merge_list(base_version, extension_version, key)? {
                merged.insert(key.to_string(), list);
            }
        }
        aria.insert(version.to_string(), Value::Object(merged));
    }
    Ok(Value::Object(aria))
}

fn merge_content_models(base: Option<&Value>, extension: &Value) -> Result<Value, String> {
    let base_models = entries(base);
    let extension_models = entries(Some(extension));
    let mut models = base_models.clone();
    let mut keys: Vec<&String> = base_models.keys().collect();
    for key in extension_models.keys() {
        if !base_models.contains_key(key) {
            keys.push(key);
        }
    }
    for key in keys {
        let mut list: Vec<Value> = Vec::new();
        for source in [base_models.get(key), extension_models.get(key)] {
            match source {
                None | Some(Value::Null) => {}
                Some(Value::Array(items)) => list.extend(items.iter().cloned()),
                Some(_) => return Err(format!("The category \"{key}\" is a list")),
            }
        }
        models.insert(key.clone(), Value::Array(list));
    }
    Ok(Value::Object(models))
}

fn merge_attr_spec(std: &Value, extension: Option<&Value>) -> Value {
    let std = entries(Some(std));
    let extension = entries(extension);
    let mut keys: Vec<&String> = std.keys().collect();
    for key in extension.keys() {
        if !std.contains_key(key) {
            keys.push(key);
        }
    }
    let mut result = Map::new();
    for key in keys {
        let mut merged = entries(std.get(key));
        spread(&mut merged, extension.get(key));
        result.insert(key.clone(), Value::Object(merged));
    }
    Value::Object(result)
}

fn merge_specs(base: &Value, extension: &Value) -> Result<Value, String> {
    let mut ex_specs: Vec<Value> = extension
        .as_array()
        .ok_or_else(|| "The specs of an extension are a list".to_string())?
        .clone();
    let mut specs: Vec<Value> = Vec::new();
    for el_spec in base
        .as_array()
        .ok_or_else(|| "The specs of the base are a list".to_string())?
    {
        let tag_name = name_of(el_spec)?;
        let mut found = None;
        for (index, spec) in ex_specs.iter().enumerate() {
            if name_of(spec)? == tag_name {
                found = Some(index);
                break;
            }
        }
        let Some(index) = found else {
            specs.push(el_spec.clone());
            continue;
        };
        let ex_spec = ex_specs.remove(index);
        let mut merged = entries(Some(el_spec));
        spread(&mut merged, Some(&ex_spec));
        let mut global_attrs = entries(el_spec.get("globalAttrs"));
        spread(&mut global_attrs, ex_spec.get("globalAttrs"));
        merged.insert("globalAttrs".to_string(), Value::Object(global_attrs));
        let attributes = merge_attr_spec(
            el_spec.get("attributes").unwrap_or(&Value::Null),
            ex_spec.get("attributes"),
        );
        merged.insert("attributes".to_string(), attributes);
        specs.push(Value::Object(merged));
    }
    Ok(Value::Array(specs))
}

/// `{...value}` of an object, or an empty one.
fn table(value: Option<&Value>) -> Map<String, Value> {
    entries(value)
}

/// `mergeLiteralValueKinds`: the values of each kind of the base with those of the extension over them.
fn merge_literal_value_kinds(base: &Map<String, Value>, extension: &Map<String, Value>) -> Map<String, Value> {
    let mut result = base.clone();
    for (kind, values) in extension {
        let mut merged = entries(result.get(kind));
        spread(&mut merged, Some(values));
        result.insert(kind.clone(), Value::Object(merged));
    }
    result
}

/// `mergeLiteralValueTable`.
fn merge_literal_value_table(base: Option<&Value>, extension: Option<&Value>) -> Map<String, Value> {
    let mut base_kinds = table(base);
    let mut extension_kinds = table(extension);
    let base_attrs = take(&mut base_kinds, "attrs");
    let extension_attrs = take(&mut extension_kinds, "attrs");
    let mut attrs = entries(base_attrs.as_ref());
    for (name, values) in entries(extension_attrs.as_ref()) {
        let mut merged = entries(base_attrs.as_ref().and_then(|attrs| attrs.get(&name)));
        spread(&mut merged, Some(&values));
        attrs.insert(name, Value::Object(merged));
    }
    let mut result = merge_literal_value_kinds(&base_kinds, &extension_kinds);
    if base_attrs.as_ref().is_some_and(truthy) || extension_attrs.as_ref().is_some_and(truthy) {
        result.insert("attrs".to_string(), Value::Object(attrs));
    }
    result
}

/// `mergeLiteralValues`.
fn merge_literal_values(base: Option<&Value>, extension: &Value) -> Value {
    let mut base_table = table(base);
    let mut extension_table = table(Some(extension));
    let base_custom = take(&mut base_table, "customElements");
    let extension_custom = take(&mut extension_table, "customElements");
    let mut result = merge_literal_value_table(Some(&Value::Object(base_table)), Some(&Value::Object(extension_table)));
    if base_custom.as_ref().is_some_and(truthy) || extension_custom.as_ref().is_some_and(truthy) {
        result.insert(
            "customElements".to_string(),
            Value::Object(merge_literal_value_table(
                base_custom.as_ref(),
                extension_custom.as_ref(),
            )),
        );
    }
    Value::Object(result)
}

/// The array of a key of the spec, with the items of the extension after them.
fn concat(result: &Map<String, Value>, extension: &Value, key: &str) -> Value {
    let mut items: Vec<Value> = result.get(key).and_then(Value::as_array).cloned().unwrap_or_default();
    if let Some(more) = extension.get(key).and_then(Value::as_array) {
        items.extend(more.iter().cloned());
    }
    Value::Array(items)
}

/// `schemaToSpec` of `@markuplint/ml-spec`: the base merged with the extended specs, in order.
///
/// # Errors
///
/// An extension that `schemaToSpec` would throw for.
pub fn schema_to_spec(main: Map<String, Value>, extensions: &[Value]) -> Result<Map<String, Value>, String> {
    let mut result = main;
    for extension in extensions {
        if let Some(extension_def) = truthy_field(extension, "def") {
            let mut def = entries(result.get("def"));
            if let Some(extends) = extension_def
                .get("#globalAttrs")
                .and_then(|global| truthy_field(global, "#extends"))
            {
                let mut global = entries(def.get("#globalAttrs"));
                let mut html = entries(global.get("#HTMLGlobalAttrs"));
                spread(&mut html, Some(extends));
                global.insert("#HTMLGlobalAttrs".to_string(), Value::Object(html));
                def.insert("#globalAttrs".to_string(), Value::Object(global));
            }
            if let Some(aria) = truthy_field(extension_def, "#aria") {
                let merged = merge_aria(def.get("#aria"), aria)?;
                def.insert("#aria".to_string(), merged);
            }
            if let Some(models) = truthy_field(extension_def, "#contentModels") {
                let merged = merge_content_models(def.get("#contentModels"), models)?;
                def.insert("#contentModels".to_string(), merged);
            }
            result.insert("def".to_string(), Value::Object(def));
        }
        if truthy_field(extension, "directivePatterns").is_some() {
            let merged = concat(&result, extension, "directivePatterns");
            result.insert("directivePatterns".to_string(), merged);
        }
        if truthy_field(extension, "movedToHead").is_some() {
            let merged = concat(&result, extension, "movedToHead");
            result.insert("movedToHead".to_string(), merged);
        }
        if let Some(value) = extension.get("acceptedAttrNames").filter(|value| !value.is_null()) {
            result.insert("acceptedAttrNames".to_string(), value.clone());
        }
        if let Some(value) = extension.get("templateContent").filter(|value| !value.is_null()) {
            result.insert("templateContent".to_string(), value.clone());
        }
        if let Some(literal_values) = truthy_field(extension, "literalValues") {
            let merged = merge_literal_values(result.get("literalValues"), literal_values);
            result.insert("literalValues".to_string(), merged);
        }
        if let Some(specs) = truthy_field(extension, "specs") {
            let merged = merge_specs(result.get("specs").unwrap_or(&Value::Null), specs)?;
            result.insert("specs".to_string(), merged);
        }
    }
    Ok(result)
}

/// Composes a packed spec with extended specs.
///
/// # Errors
///
/// An extension that `schemaToSpec` would throw for, or a region that cannot be encoded.
pub fn compose(base: &PackedSpec, extensions: &[Value]) -> Result<PackedSpec, String> {
    let touched = touched_regions(extensions);
    if !touched.contains(&true) {
        return Ok(base.share());
    }
    let value = |position: usize, empty: Value| {
        if touched[position] {
            base.region_value(position)
        } else {
            empty
        }
    };
    let mut skeleton = Map::new();
    let mut def = Map::new();
    def.insert("#globalAttrs".to_string(), value(1, Value::Object(Map::new())));
    def.insert("#aria".to_string(), value(2, Value::Object(Map::new())));
    def.insert("#contentModels".to_string(), value(3, Value::Object(Map::new())));
    skeleton.insert("def".to_string(), Value::Object(def));
    skeleton.insert("specs".to_string(), value(0, Value::Array(Vec::new())));
    if let Value::Object(rest) = value(4, Value::Object(Map::new())) {
        for (key, item) in rest {
            skeleton.insert(key, item);
        }
    }
    let mut merged = schema_to_spec(skeleton, extensions)?;
    let merged_def = entries(merged.get("def"));
    let mut rest = Map::new();
    for (key, item) in &merged {
        if key != "def" && key != "specs" {
            rest.insert(key.clone(), item.clone());
        }
    }
    let values: [Value; 5] = [
        merged.remove("specs").unwrap_or(Value::Null),
        merged_def.get("#globalAttrs").cloned().unwrap_or(Value::Null),
        merged_def.get("#aria").cloned().unwrap_or(Value::Null),
        merged_def.get("#contentModels").cloned().unwrap_or(Value::Null),
        Value::Object(rest),
    ];

    let mut strings = StringTable::new(Some(base));
    let mut changes: Vec<(usize, Vec<u8>)> = Vec::new();
    for (position, id) in REGIONS.iter().enumerate() {
        if touched[position] {
            changes.push((*id, encode_region(&values[position], &mut strings, base.variant)?));
        }
    }
    if strings.grown() {
        let (offsets, bytes) = strings.sections();
        changes.push((section::STRING_OFFSETS, offsets));
        changes.push((section::STRING_BYTES, bytes));
    }
    let draft = base.replace(changes)?;
    if touched[0] || touched[3] {
        let bits = crate::read::words_to_bytes(&draft.compute_bits());
        draft.replace(vec![(section::BITS, bits)])
    } else {
        Ok(draft)
    }
}
