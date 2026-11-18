//! The composition of a packed spec with the extended specs of a configuration, the same as
//! `scripts/spec-baseline/packed/compose.ts`. There is no `schemaToSpec` in Rust (v6 does the merge in JavaScript), so
//! the merge of `@markuplint/ml-spec` (`schema-to-spec.ts` and `merge-array.ts`) is ported here, onto a [`Tree`].
//!
//! The regions that an extension touches are not decoded and made again: the merge is done on a tree in which what the
//! base has is a reference to its node ([`Tree::Ref`], for an array or an object, an empty one too) or a value (a number, a
//! boolean, null or a string, which are always values), and what the merge makes is new. It is what the TypeScript composition
//! has, which runs the real `schemaToSpec` on objects that read the nodes of the region when they are asked: a place where
//! JavaScript makes a new array or object (`{...a}`, `[...a]`, `splice`, an object literal) is a new `Array` or `Object` here, and
//! a place where it hands over what it was given is the same tree. The regions are then appended to with only the new
//! nodes, lists and indexes (`encode::append_region`), and the bytes that this makes for an extension are the bytes that the
//! TypeScript one makes: that is the proof that the port means the same.
//!
//! An object keeps the order of its entries, and a key that is set again keeps its place, as an assignment to a property of a
//! JavaScript object does (a key that is new goes to the end).

use serde_json::Value;

use crate::encode::{StringTable, Tree, append_region};
use crate::format::{REGIONS, section, tag};
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

/// The entries of an object, in order.
type Entries = Vec<(String, Tree)>;

/// Sets a key of an object: the place of a key that is there is kept, and a new one goes to the end.
fn set(entries: &mut Entries, key: &str, value: Tree) {
    if let Some(entry) = entries.iter_mut().find(|(name, _)| name == key) {
        entry.1 = value;
    } else {
        entries.push((key.to_string(), value));
    }
}

fn find<'a>(entries: &'a Entries, key: &str) -> Option<&'a Tree> {
    entries.iter().find(|(name, _)| name == key).map(|(_, value)| value)
}

/// Takes a key out of an object and keeps the order of the others.
fn take(entries: &mut Entries, key: &str) -> Option<Tree> {
    let position = entries.iter().position(|(name, _)| name == key)?;
    Some(entries.remove(position).1)
}

/// Reads the base for the merge: what a place of the base is as a tree.
struct Reader<'a> {
    base: &'a PackedSpec,
}

impl Reader<'_> {
    /// A node of the region as a tree: an array and an object are references, and what else there is, a value.
    fn child(&self, region: usize, node: u32) -> Tree {
        match self.base.tag(region, node) {
            tag::ARRAY | tag::OBJECT => Tree::Ref(region, node),
            _ => Tree::Json(self.base.to_value(region, node)),
        }
    }

    /// The value of a key of an object (`value?.[key]` of JavaScript, for what has no such key, `None`).
    fn get(&self, tree: &Tree, key: &str) -> Option<Tree> {
        match tree {
            Tree::Ref(region, node) => {
                let position = self.base.entry(*region, *node, key);
                (position != crate::format::NONE)
                    .then(|| self.child(*region, self.base.value_at(*region, *node, position)))
            }
            Tree::Json(value) => value.as_object()?.get(key).map(|value| Tree::Json(value.clone())),
            Tree::Object(entries) => find(entries, key).cloned(),
            Tree::Array(_) => None,
        }
    }

    /// `{...value}`: the entries of an object, or none for what is not one (what a spread of JavaScript gives, here).
    fn entries(&self, tree: Option<&Tree>) -> Entries {
        match tree {
            Some(Tree::Ref(region, node)) if self.base.tag(*region, *node) == tag::OBJECT => {
                (0..self.base.count(*region, *node))
                    .map(|j| {
                        (
                            self.base.string_at(self.base.key_at(*region, *node, j)),
                            self.child(*region, self.base.value_at(*region, *node, j)),
                        )
                    })
                    .collect()
            }
            Some(Tree::Json(Value::Object(object))) => object
                .iter()
                .map(|(key, value)| (key.clone(), Tree::Json(value.clone())))
                .collect(),
            Some(Tree::Object(entries)) => entries.clone(),
            _ => Vec::new(),
        }
    }

    /// `[...value]`: the items of an array, or `None` for what is not one.
    fn items(&self, tree: &Tree) -> Option<Vec<Tree>> {
        match tree {
            Tree::Ref(region, node) if self.base.tag(*region, *node) == tag::ARRAY => Some(
                (0..self.base.count(*region, *node))
                    .map(|position| self.child(*region, self.base.at(*region, *node, position)))
                    .collect(),
            ),
            Tree::Json(Value::Array(items)) => Some(items.iter().map(|item| Tree::Json(item.clone())).collect()),
            Tree::Array(items) => Some(items.clone()),
            _ => None,
        }
    }

    /// Whether `if (value)` of JavaScript takes the branch.
    fn truthy(tree: &Tree) -> bool {
        match tree {
            Tree::Json(value) => truthy(value),
            Tree::Ref(..) | Tree::Array(_) | Tree::Object(_) => true,
        }
    }

    /// The string that a tree is, when it is one.
    fn text(tree: &Tree) -> Option<&str> {
        match tree {
            Tree::Json(Value::String(text)) => Some(text.as_str()),
            _ => None,
        }
    }

    /// `{...target, ...source}` for the entries of `source`.
    fn spread(&self, target: &mut Entries, source: Option<&Tree>) {
        for (key, value) in self.entries(source) {
            set(target, &key, value);
        }
    }

    /// The name of a definition, as `mergeArray` reads it: a string, or the `name` of an object, in lower case and trimmed.
    fn name_of(&self, definition: &Tree) -> Result<String, String> {
        let name = match Self::text(definition) {
            Some(text) => text.to_string(),
            None => self
                .get(definition, "name")
                .as_ref()
                .and_then(Self::text)
                .map(str::to_string)
                .ok_or_else(|| "A named definition is a string or an object with a name".to_string())?,
        };
        Ok(name.to_lowercase().trim().to_string())
    }

    /// The name of an element spec in lower case (`spec.name.toLowerCase()` of `schemaToSpec`, which does not trim).
    fn spec_name(&self, spec: &Tree) -> Result<String, String> {
        self.get(spec, "name")
            .as_ref()
            .and_then(Self::text)
            .map(str::to_lowercase)
            .ok_or_else(|| "The name of an element spec is a string".to_string())
    }

    /// `mergeArray` of `@markuplint/ml-spec`: the items of `b` merged into those of `a` by name.
    fn merge_array(&self, a: &[Tree], b: &[Tree]) -> Result<Vec<Tree>, String> {
        let mut result: Vec<Tree> = a.to_vec();
        for b_item in b {
            let b_name = self.name_of(b_item)?;
            let mut found = None;
            for (index, item) in result.iter().enumerate() {
                if self.name_of(item)? == b_name {
                    found = Some(index);
                    break;
                }
            }
            let Some(index) = found else {
                result.push(b_item.clone());
                continue;
            };
            let a_item = result.remove(index);
            if Self::text(b_item).is_some() {
                continue;
            }
            if Self::text(&a_item).is_some() {
                result.push(b_item.clone());
                continue;
            }
            let mut merged = self.entries(Some(&a_item));
            self.spread(&mut merged, Some(b_item));
            result.push(Tree::Object(merged));
        }
        Ok(result)
    }

    /// The list of a key of ARIA of a version, merged: the array of the base as it is when the extension has none, and `None`
    /// when neither has it.
    fn merge_list(&self, base: &Tree, extension: &Tree, key: &str) -> Result<Option<Tree>, String> {
        let a = self.get(base, key);
        let Some(b) = self.get(extension, key).filter(Self::truthy) else {
            return Ok(a);
        };
        let a_items = a
            .as_ref()
            .and_then(|a| self.items(a))
            .ok_or_else(|| format!("There is no list \"{key}\" in the ARIA of the base to merge into"))?;
        let b_items = self
            .items(&b)
            .ok_or_else(|| format!("\"{key}\" of the ARIA of an extension is a list"))?;
        Ok(Some(Tree::Array(self.merge_array(&a_items, &b_items)?)))
    }

    fn merge_aria(&self, base: Option<&Tree>, extension: &Tree) -> Result<Tree, String> {
        let mut aria = Entries::new();
        for version in ["1.1", "1.2", "1.3"] {
            let base_version = base
                .and_then(|base| self.get(base, version))
                .ok_or_else(|| format!("The ARIA of the base has no version {version}"))?;
            let extension_version = self
                .get(extension, version)
                .ok_or_else(|| format!("The ARIA of the extension has no version {version}"))?;
            let mut merged = Entries::new();
            for key in ["roles", "props", "graphicsRoles", "dpubRoles"] {
                if let Some(list) = self.merge_list(&base_version, &extension_version, key)? {
                    set(&mut merged, key, list);
                }
            }
            set(&mut aria, version, Tree::Object(merged));
        }
        Ok(Tree::Object(aria))
    }

    fn merge_content_models(&self, base: Option<&Tree>, extension: &Tree) -> Result<Tree, String> {
        let base_models = self.entries(base);
        let extension_models = self.entries(Some(extension));
        let mut models = base_models.clone();
        let mut keys: Vec<&String> = base_models.iter().map(|(key, _)| key).collect();
        for (key, _) in &extension_models {
            if find(&base_models, key).is_none() {
                keys.push(key);
            }
        }
        for key in keys {
            let mut list: Vec<Tree> = Vec::new();
            for source in [find(&base_models, key), find(&extension_models, key)] {
                match source {
                    None | Some(Tree::Json(Value::Null)) => {}
                    Some(tree) => list.extend(
                        self.items(tree)
                            .ok_or_else(|| format!("The category \"{key}\" is a list"))?,
                    ),
                }
            }
            set(&mut models, key, Tree::Array(list));
        }
        Ok(Tree::Object(models))
    }

    fn merge_attr_spec(&self, std: Option<&Tree>, extension: Option<&Tree>) -> Tree {
        let std = self.entries(std);
        let extension = self.entries(extension);
        let mut keys: Vec<&String> = std.iter().map(|(key, _)| key).collect();
        for (key, _) in &extension {
            if find(&std, key).is_none() {
                keys.push(key);
            }
        }
        let mut result = Entries::new();
        for key in keys {
            let mut merged = self.entries(find(&std, key));
            self.spread(&mut merged, find(&extension, key));
            set(&mut result, key, Tree::Object(merged));
        }
        Tree::Object(result)
    }

    fn merge_specs(&self, base: &Tree, extension: &Tree) -> Result<Tree, String> {
        let mut ex_specs = self
            .items(extension)
            .ok_or_else(|| "The specs of an extension are a list".to_string())?;
        let mut specs: Vec<Tree> = Vec::new();
        for el_spec in self
            .items(base)
            .ok_or_else(|| "The specs of the base are a list".to_string())?
        {
            let tag_name = self.spec_name(&el_spec)?;
            let mut found = None;
            for (index, spec) in ex_specs.iter().enumerate() {
                if self.spec_name(spec)? == tag_name {
                    found = Some(index);
                    break;
                }
            }
            let Some(index) = found else {
                specs.push(el_spec);
                continue;
            };
            let ex_spec = ex_specs.remove(index);
            let mut merged = self.entries(Some(&el_spec));
            self.spread(&mut merged, Some(&ex_spec));
            let mut global_attrs = self.entries(self.get(&el_spec, "globalAttrs").as_ref());
            self.spread(&mut global_attrs, self.get(&ex_spec, "globalAttrs").as_ref());
            set(&mut merged, "globalAttrs", Tree::Object(global_attrs));
            let attributes = self.merge_attr_spec(
                self.get(&el_spec, "attributes").as_ref(),
                self.get(&ex_spec, "attributes").as_ref(),
            );
            set(&mut merged, "attributes", attributes);
            specs.push(Tree::Object(merged));
        }
        Ok(Tree::Array(specs))
    }

    /// `mergeLiteralValueKinds`: the values of each kind of the base with those of the extension over them.
    fn merge_literal_value_kinds(&self, base: &Entries, extension: &Entries) -> Entries {
        let mut result = base.clone();
        for (kind, values) in extension {
            let mut merged = self.entries(find(&result, kind));
            self.spread(&mut merged, Some(values));
            set(&mut result, kind, Tree::Object(merged));
        }
        result
    }

    /// `mergeLiteralValueTable`.
    fn merge_literal_value_table(&self, base: Option<&Tree>, extension: Option<&Tree>) -> Entries {
        let mut base_kinds = self.entries(base);
        let mut extension_kinds = self.entries(extension);
        let base_attrs = take(&mut base_kinds, "attrs");
        let extension_attrs = take(&mut extension_kinds, "attrs");
        let mut attrs = self.entries(base_attrs.as_ref());
        for (name, values) in self.entries(extension_attrs.as_ref()) {
            let mut merged = self.entries(base_attrs.as_ref().and_then(|attrs| self.get(attrs, &name)).as_ref());
            self.spread(&mut merged, Some(&values));
            set(&mut attrs, &name, Tree::Object(merged));
        }
        let mut result = self.merge_literal_value_kinds(&base_kinds, &extension_kinds);
        if base_attrs.as_ref().is_some_and(Self::truthy) || extension_attrs.as_ref().is_some_and(Self::truthy) {
            set(&mut result, "attrs", Tree::Object(attrs));
        }
        result
    }

    /// `mergeLiteralValues`.
    fn merge_literal_values(&self, base: Option<&Tree>, extension: &Tree) -> Tree {
        let mut base_table = self.entries(base);
        let mut extension_table = self.entries(Some(extension));
        let base_custom = take(&mut base_table, "customElements");
        let extension_custom = take(&mut extension_table, "customElements");
        let mut result =
            self.merge_literal_value_table(Some(&Tree::Object(base_table)), Some(&Tree::Object(extension_table)));
        if base_custom.as_ref().is_some_and(Self::truthy) || extension_custom.as_ref().is_some_and(Self::truthy) {
            let custom = self.merge_literal_value_table(base_custom.as_ref(), extension_custom.as_ref());
            set(&mut result, "customElements", Tree::Object(custom));
        }
        Tree::Object(result)
    }

    /// The array of a key of the spec, with the items of the extension after them.
    fn concat(&self, result: &Entries, extension: &Value, key: &str) -> Result<Tree, String> {
        let mut items: Vec<Tree> = match find(result, key) {
            None | Some(Tree::Json(Value::Null)) => Vec::new(),
            Some(tree) => self
                .items(tree)
                .ok_or_else(|| format!("\"{key}\" of the spec is a list"))?,
        };
        let more = extension
            .get(key)
            .and_then(Value::as_array)
            .ok_or_else(|| format!("\"{key}\" of an extension is a list"))?;
        items.extend(more.iter().map(|item| Tree::Json(item.clone())));
        Ok(Tree::Array(items))
    }

    /// `schemaToSpec` of `@markuplint/ml-spec`: the base merged with the extended specs, in order.
    fn schema_to_spec(&self, main: Entries, extensions: &[Value]) -> Result<Entries, String> {
        let mut result = main;
        for extension in extensions {
            if let Some(extension_def) = truthy_field(extension, "def") {
                let mut def = self.entries(find(&result, "def"));
                if let Some(extends) = extension_def
                    .get("#globalAttrs")
                    .and_then(|global| truthy_field(global, "#extends"))
                {
                    let mut global = self.entries(find(&def, "#globalAttrs"));
                    let mut html = self.entries(find(&global, "#HTMLGlobalAttrs"));
                    self.spread(&mut html, Some(&Tree::Json(extends.clone())));
                    set(&mut global, "#HTMLGlobalAttrs", Tree::Object(html));
                    set(&mut def, "#globalAttrs", Tree::Object(global));
                }
                if let Some(aria) = truthy_field(extension_def, "#aria") {
                    let merged = self.merge_aria(find(&def, "#aria"), &Tree::Json(aria.clone()))?;
                    set(&mut def, "#aria", merged);
                }
                if let Some(models) = truthy_field(extension_def, "#contentModels") {
                    let merged =
                        self.merge_content_models(find(&def, "#contentModels"), &Tree::Json(models.clone()))?;
                    set(&mut def, "#contentModels", merged);
                }
                set(&mut result, "def", Tree::Object(def));
            }
            if truthy_field(extension, "directivePatterns").is_some() {
                let merged = self.concat(&result, extension, "directivePatterns")?;
                set(&mut result, "directivePatterns", merged);
            }
            if truthy_field(extension, "movedToHead").is_some() {
                let merged = self.concat(&result, extension, "movedToHead")?;
                set(&mut result, "movedToHead", merged);
            }
            if let Some(value) = extension.get("acceptedAttrNames").filter(|value| !value.is_null()) {
                set(&mut result, "acceptedAttrNames", Tree::Json(value.clone()));
            }
            if let Some(value) = extension.get("templateContent").filter(|value| !value.is_null()) {
                set(&mut result, "templateContent", Tree::Json(value.clone()));
            }
            if let Some(literal_values) = truthy_field(extension, "literalValues") {
                let merged =
                    self.merge_literal_values(find(&result, "literalValues"), &Tree::Json(literal_values.clone()));
                set(&mut result, "literalValues", merged);
            }
            if let Some(specs) = truthy_field(extension, "specs") {
                let base_specs = find(&result, "specs").cloned().unwrap_or(Tree::Json(Value::Null));
                let merged = self.merge_specs(&base_specs, &Tree::Json(specs.clone()))?;
                set(&mut result, "specs", merged);
            }
        }
        Ok(result)
    }
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
    let reader = Reader { base };
    // What the extensions may touch is the root of its region; what they do not is the empty value, which is not read
    let region = |position: usize, empty: Value| {
        if touched[position] {
            Tree::Ref(position, base.root(position))
        } else {
            Tree::Json(empty)
        }
    };
    let empty_object = || Value::Object(serde_json::Map::new());
    let def: Entries = vec![
        ("#globalAttrs".to_string(), region(1, empty_object())),
        ("#aria".to_string(), region(2, empty_object())),
        ("#contentModels".to_string(), region(3, empty_object())),
    ];
    let mut skeleton: Entries = vec![
        ("def".to_string(), Tree::Object(def)),
        ("specs".to_string(), region(0, Value::Array(Vec::new()))),
    ];
    reader.spread(&mut skeleton, Some(&region(4, empty_object())));
    let merged = reader.schema_to_spec(skeleton, extensions)?;
    let merged_def = find(&merged, "def").cloned();
    let from_def = |key: &str| merged_def.as_ref().and_then(|def| reader.get(def, key));
    let null = || Tree::Json(Value::Null);
    let rest: Entries = merged
        .iter()
        .filter(|(key, _)| key != "def" && key != "specs")
        .cloned()
        .collect();
    let values: [Tree; 5] = [
        find(&merged, "specs").cloned().unwrap_or_else(null),
        from_def("#globalAttrs").unwrap_or_else(null),
        from_def("#aria").unwrap_or_else(null),
        from_def("#contentModels").unwrap_or_else(null),
        Tree::Object(rest),
    ];

    let mut strings = StringTable::new(Some(base));
    let mut changes: Vec<(usize, Vec<u8>)> = Vec::new();
    for (position, id) in REGIONS.iter().enumerate() {
        if touched[position] {
            changes.push((*id, append_region(&values[position], &mut strings, base, position)?));
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
