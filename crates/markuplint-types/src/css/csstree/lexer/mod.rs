//! Port of css-tree's lexer (`lib/lexer/`): `lexer.match(syntax, value)` for a string value.
//!
//! The syntax dictionary is `data/csstree-lexer.json`, css-tree's default lexer dumped by
//! `scripts/csstree-lexer-data/dump.mjs`; the generic types (`<length>`, `<number>`, …) are code
//! ([`generic`]). A [`Lexer`] is that dictionary with the types and properties of a fork on top,
//! as css-tree's `fork()` makes it.

pub mod an_plus_b;
pub mod generic;
pub mod graph;
pub mod matcher;
pub mod urange;

use std::collections::HashMap;
use std::sync::{Arc, LazyLock, Mutex};

use crate::css::syntax_definition::{self, ast::SyntaxNode};

use super::tokenizer::{Token, tokenize};
use generic::Generic;
use graph::{Graph, Id};

/// A type of the lexer: a syntax, or a generic type (a function in css-tree).
#[derive(Debug, Clone)]
pub enum TypeDef {
    Syntax(Arc<str>),
    Generic(Generic),
}

/// The dump `scripts/csstree-lexer-data/dump.mjs` writes.
#[derive(serde::Deserialize)]
pub struct Dump {
    pub version: String,
    pub generics: Vec<String>,
    pub types: HashMap<String, String>,
    pub properties: HashMap<String, String>,
}

/// css-tree's default lexer as data.
pub static DUMP: LazyLock<Dump> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../../../../data/csstree-lexer.json")).expect("data/csstree-lexer.json is valid")
});

static AST_CACHE: LazyLock<Mutex<HashMap<String, Arc<SyntaxNode>>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

/// css-tree `parse` of the definition syntax, cached (css-tree parses a descriptor lazily once).
fn parse_cached(syntax: &str) -> Result<Arc<SyntaxNode>, String> {
    if let Some(ast) = AST_CACHE.lock().ok().and_then(|cache| cache.get(syntax).cloned()) {
        return Ok(ast);
    }
    let ast = Arc::new(syntax_definition::parse(syntax)?);
    if let Ok(mut cache) = AST_CACHE.lock() {
        cache.insert(syntax.to_owned(), Arc::clone(&ast));
    }
    Ok(ast)
}

/// css-tree `appendOrSet` of `mix()`: a syntax that starts with `|` extends the one it replaces.
/// `None` removes the entry (css-tree sets `null`, which `addType_` skips).
fn append_or_set(base: Option<&str>, syntax: &str) -> Option<String> {
    let trimmed = syntax.trim_start();
    if let Some(rest) = trimmed.strip_prefix('|') {
        return Some(match base {
            Some(base) => format!("{base}{syntax}"),
            None => rest.trim_start().to_owned(),
        });
    }
    if syntax.is_empty() {
        None
    } else {
        Some(syntax.to_owned())
    }
}

/// css-tree's lexer: the default dictionary, and what a fork adds or replaces.
#[derive(Default, Clone)]
pub struct Lexer {
    /// Types a fork sets (`None`: removed).
    types: HashMap<String, Option<TypeDef>>,
    /// Properties a fork sets (`None`: removed).
    properties: HashMap<String, Option<Arc<str>>>,
}

/// TS `SyntaxMatchError` for a string value: what `cssSyntaxMatch` reads from it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyntaxMatchError {
    /// `rawMessage`: `Mismatch`, or the iteration-limit message.
    pub raw_message: &'static str,
    /// `syntax`: the generated syntax the value was matched against.
    pub syntax: String,
    /// `mismatchOffset`, in bytes.
    pub mismatch_offset: usize,
    /// `mismatchLength`, in bytes.
    pub mismatch_length: usize,
    /// `line` (1-based).
    pub line: usize,
    /// `column` (1-based, in UTF-16 code units).
    pub column: usize,
}

/// The result of [`Lexer::match_value`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MatchResult {
    Matched,
    /// The value contains `var()`, which css-tree's lexer does not match.
    VarUnsupported,
    Mismatch(SyntaxMatchError),
}

impl Lexer {
    /// css-tree's default lexer.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// css-tree `fork({ types, properties })`: the types and properties mixed into this lexer's
    /// (`mix()`), then the generic types set again over them, as the `Lexer` constructor does.
    #[must_use]
    pub fn fork(&self, types: &[(&str, &str)], properties: &[(&str, &str)]) -> Self {
        let mut lexer = self.clone();
        for (name, syntax) in types {
            let base = lexer.type_syntax(name);
            let value = append_or_set(base.as_deref(), syntax).map(|s| TypeDef::Syntax(s.into()));
            lexer.types.insert((*name).to_owned(), value);
        }
        for (name, syntax) in properties {
            let base = lexer.property(name);
            let value = append_or_set(base.as_deref(), syntax).map(Into::into);
            lexer.properties.insert((*name).to_owned(), value);
        }
        // `if (config.generic)`: the generic types are added after `config.types`
        for name in &DUMP.generics {
            if let Some(generic) = generic::lookup(name) {
                lexer.types.insert(name.clone(), Some(TypeDef::Generic(generic)));
            }
        }
        lexer
    }

    /// css-tree `lexer.addType_(name, fn)`: a generic type (TS `lexer.addType_` of a
    /// `CssSyntaxTokenizer`).
    pub fn add_generic_type(&mut self, name: &str, generic: Generic) {
        self.types.insert(name.to_owned(), Some(TypeDef::Generic(generic)));
    }

    fn type_syntax(&self, name: &str) -> Option<String> {
        match self.type_def(name)? {
            TypeDef::Syntax(syntax) => Some(syntax.to_string()),
            TypeDef::Generic(_) => None,
        }
    }

    /// `lexer.types[name]`.
    #[must_use]
    pub fn type_def(&self, name: &str) -> Option<TypeDef> {
        if let Some(def) = self.types.get(name) {
            return def.clone();
        }
        if let Some(generic) = DUMP
            .generics
            .iter()
            .find(|g| *g == name)
            .and_then(|g| generic::lookup(g))
        {
            return Some(TypeDef::Generic(generic));
        }
        DUMP.types.get(name).map(|s| TypeDef::Syntax(s.as_str().into()))
    }

    /// `lexer.properties[name]`.
    #[must_use]
    pub fn property(&self, name: &str) -> Option<Arc<str>> {
        if let Some(def) = self.properties.get(name) {
            return def.clone();
        }
        DUMP.properties.get(name).map(|s| s.as_str().into())
    }

    /// css-tree `lexer.match(syntax, value)` for a string value.
    ///
    /// # Errors
    ///
    /// Returns the message css-tree throws: `syntax` cannot be parsed, or the match reaches a type
    /// or a property the lexer does not define.
    pub fn match_value(&self, syntax: &str, value: &str) -> Result<MatchResult, String> {
        let tokens = tokenize(value);
        if tokens.iter().any(|t| t.value.to_lowercase() == "var(") {
            return Ok(MatchResult::VarUnsupported);
        }
        let ast = parse_cached(syntax)?;
        let mut run = Run {
            lexer: self,
            graph: Graph::default(),
            compiled: HashMap::new(),
        };
        let start = run.graph.build_match_graph(&ast);
        let outcome = matcher::match_tokens(&mut run, &tokens, start)?;
        if outcome.matched {
            return Ok(MatchResult::Matched);
        }
        Ok(MatchResult::Mismatch(locate_mismatch(
            &tokens,
            value,
            outcome.longest_match,
            outcome.reason,
            syntax_definition::generate::generate(&ast),
        )))
    }
}

/// css-tree `locateMismatch` for a string value: no token carries an AST node, so the location
/// is counted over the concatenated token values (the value).
fn locate_mismatch(
    tokens: &[Token],
    value: &str,
    longest_match: usize,
    raw_message: &'static str,
    syntax: String,
) -> SyntaxMatchError {
    let (mismatch_offset, mismatch_length, before) = if let Some(token) = tokens.get(longest_match) {
        (token.start, token.end - token.start, &value[..token.start])
    } else {
        // the mismatch is at the end: css-tree leaves the offset and length at 0 and points the
        // line and column past the value
        (0, 0, value)
    };
    let (line, column) = build_loc(before);
    SyntaxMatchError {
        raw_message,
        syntax,
        mismatch_offset,
        mismatch_length,
        line,
        column,
    }
}

/// css-tree `buildLoc(defaultLoc, extra)`: lines split at `\n`, `\r\n`, `\r` and `\f`; the column
/// in UTF-16 code units.
fn build_loc(extra: &str) -> (usize, usize) {
    let normalized = extra.replace("\r\n", "\n").replace(['\r', '\u{c}'], "\n");
    let lines: Vec<&str> = normalized.split('\n').collect();
    let last = lines.last().copied().unwrap_or("");
    if lines.len() == 1 {
        (1, 1 + last.encode_utf16().count())
    } else {
        (lines.len(), last.encode_utf16().count() + 1)
    }
}

/// The graph of one match: css-tree compiles a descriptor's graph on its first use; here each
/// match compiles what it reaches.
pub struct Run<'a> {
    lexer: &'a Lexer,
    pub graph: Graph,
    compiled: HashMap<(bool, String), Option<Id>>,
}

impl Run<'_> {
    /// The graph of the type or property `name` (`dictSyntax.matchRef || dictSyntax.match`).
    pub fn descriptor(&mut self, is_property: bool, name: &str) -> Option<Id> {
        let key = (is_property, name.to_owned());
        if let Some(id) = self.compiled.get(&key) {
            return *id;
        }
        let id = if is_property {
            self.lexer
                .property(name)
                .and_then(|syntax| parse_cached(&syntax).ok())
                .map(|ast| match (&*ast, top_level_comma_multiplier_term(&ast)) {
                    // `matchRef`: `{ ...syntax, terms: [syntax.terms[0].term] }`
                    (
                        SyntaxNode::Group {
                            combinator,
                            disallow_empty,
                            explicit,
                            ..
                        },
                        Some(term),
                    ) => {
                        let ast = SyntaxNode::Group {
                            terms: vec![term.clone()],
                            combinator: combinator.clone(),
                            disallow_empty: *disallow_empty,
                            explicit: *explicit,
                        };
                        self.graph.build_match_graph(&ast)
                    }
                    _ => self.graph.build_match_graph(&ast),
                })
        } else {
            match self.lexer.type_def(name) {
                Some(TypeDef::Generic(generic)) => Some(self.graph.build_generic_graph(generic)),
                Some(TypeDef::Syntax(syntax)) => {
                    parse_cached(&syntax).ok().map(|ast| self.graph.build_match_graph(&ast))
                }
                None => None,
            }
        };
        self.compiled.insert(key, id);
        id
    }
}

/// css-tree `syntaxHasTopLevelCommaMultiplier`: a property referenced as `<'name'>` matches one
/// item of its top-level comma-separated list.
fn top_level_comma_multiplier_term(ast: &SyntaxNode) -> Option<&SyntaxNode> {
    let SyntaxNode::Group {
        terms, explicit: false, ..
    } = ast
    else {
        return None;
    };
    match terms.as_slice() {
        [SyntaxNode::Multiplier { term, info }] if info.comma => Some(term),
        _ => None,
    }
}
