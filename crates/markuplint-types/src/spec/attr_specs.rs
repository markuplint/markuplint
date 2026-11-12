//! The attributes an element takes, as one list: the global attributes of the categories the
//! element enables, with its own attributes merged over them. Port of `@markuplint/ml-spec`
//! `getAttrSpecs()` (`utils/get-attr-specs-spec.ts`).
//!
//! A global attribute is defined in `#globalAttrs` by category; an element enables a category
//! with `true` (every attribute of it) or with a list of names (those). An attribute the element
//! defines itself is merged over the global one of the same name, field by field, so an element
//! that only describes `referrerpolicy` keeps the type of the global definition.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use serde_json::{Map, Value};

use super::lookup::get_spec;
use super::types::{Attribute, MLMLSpec};

/// The lists [`get_attr_specs_list`] made, by the name of the element spec. A spec is read once
/// per lint, and every element of a name shares its list.
#[derive(Debug, Default)]
pub struct AttrSpecsCache(RwLock<HashMap<String, Option<Arc<Vec<Attribute>>>>>);

/// TS `getAttrSpecs(localName, namespace, schema)`: the attributes of the element spec that
/// `spec_name` names (as [`get_spec`] finds it: `svg:svg`, or `svg` for it), sorted by name
/// without regard to case. `None` when the spec has no such element.
///
/// # Panics
///
/// Panics if the lock of the cache is poisoned, which only a panic while holding it does.
#[must_use]
pub fn get_attr_specs_list(spec: &MLMLSpec, spec_name: &str) -> Option<Arc<Vec<Attribute>>> {
    if let Some(cached) = spec.attr_specs_cache.0.read().expect("attr specs cache").get(spec_name) {
        return cached.clone();
    }
    let list = build(spec, spec_name).map(Arc::new);
    spec.attr_specs_cache
        .0
        .write()
        .expect("attr specs cache")
        .insert(spec_name.to_owned(), list.clone());
    list
}

fn build(spec: &MLMLSpec, spec_name: &str) -> Option<Vec<Attribute>> {
    let el_spec = get_spec(spec, spec_name)?;
    let mut attrs: Map<String, Value> = Map::new();

    for (category, enabled) in &el_spec.global_attrs {
        let Some(global) = spec.def.global_attrs.get(category) else {
            continue;
        };
        match enabled {
            Value::Bool(true) => {
                for (name, def) in global {
                    attrs.insert(name.clone(), def.clone());
                }
            }
            Value::Array(names) => {
                for name in names.iter().filter_map(Value::as_str) {
                    let Some(selected) = global.get(name) else {
                        continue;
                    };
                    let merged = merge(attrs.get(name), selected);
                    attrs.insert(name.to_owned(), merged);
                }
            }
            _ => {}
        }
    }

    let mut list: Vec<Attribute> = attrs
        .into_iter()
        .filter_map(|(name, def)| {
            let mut attr: Attribute = serde_json::from_value(def).ok()?;
            attr.name = Some(name);
            Some(attr)
        })
        .collect();

    for (name, own) in &el_spec.attributes {
        if let Some(current) = list.iter_mut().find(|attr| attr.name.as_deref() == Some(name)) {
            current.overlay(own);
            if current.description.is_none() {
                current.description = Some(String::new());
            }
        } else {
            let mut attr = own.clone();
            attr.name = Some(name.clone());
            if attr.description.is_none() {
                attr.description = Some(String::new());
            }
            list.push(attr);
        }
    }

    for attr in &mut list {
        if attr.attr_type.is_null() {
            attr.attr_type = Value::String("Any".to_owned());
        }
    }
    list.sort_by_key(|attr| attr.name.as_deref().unwrap_or_default().to_uppercase());
    Some(list)
}

/// `{ ...current, ...selected }` of two JSON objects.
fn merge(current: Option<&Value>, selected: &Value) -> Value {
    let mut merged = match current {
        Some(Value::Object(current)) => current.clone(),
        _ => Map::new(),
    };
    if let Value::Object(selected) = selected {
        for (key, value) in selected {
            merged.insert(key.clone(), value.clone());
        }
    }
    Value::Object(merged)
}
