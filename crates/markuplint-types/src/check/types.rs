//! Type definitions for the check dispatcher.

/// Result of a type validation check.
#[derive(Debug, Clone)]
#[allow(clippy::large_enum_variant)]
pub enum CheckResult {
    /// The value matched the expected type.
    Matched,
    /// The value did not match the expected type.
    Unmatched(UnmatchedResult),
}

impl CheckResult {
    /// Returns `true` if the result is a match.
    #[must_use]
    pub fn is_matched(&self) -> bool {
        matches!(self, Self::Matched)
    }
}

/// Detailed information about an unmatched value.
#[derive(Debug, Clone)]
pub struct UnmatchedResult {
    pub ref_: Option<String>,
    pub raw: String,
    pub length: usize,
    pub offset: usize,
    pub line: usize,
    pub column: usize,
    pub reason: Reason,
    pub pass_count: Option<usize>,
    pub part_name: Option<String>,
    pub expects: Vec<Expect>,
    pub extra: Option<Expect>,
    pub candidate: Option<String>,
    pub fallback_to: Option<String>,
}

/// Reason why a value did not match.
#[derive(Debug, Clone, PartialEq)]
pub enum Reason {
    SyntaxError,
    Typo,
    MissingToken,
    MissingComma,
    UnexpectedToken,
    UnexpectedSpace,
    UnexpectedNewline,
    UnexpectedComma,
    EmptyToken,
    OutOfRange,
    DoesntExistInEnum,
    Duplicated,
    IllegalCombination,
    IllegalOrder,
    ExtraToken,
    MustBePercentEncoded,
    MustBeSerialized,
    OutOfRangeWithBounds {
        gt: Option<f64>,
        gte: Option<f64>,
        lt: Option<f64>,
        lte: Option<f64>,
    },
    OutOfRangeLengthChar {
        gte: usize,
        lte: Option<usize>,
    },
    OutOfRangeLengthDigit {
        gte: usize,
        lte: Option<usize>,
    },
}

/// Description of what was expected.
#[derive(Debug, Clone)]
pub struct Expect {
    pub type_: ExpectType,
    pub value: String,
}

/// Category of an expectation.
#[derive(Debug, Clone, PartialEq)]
pub enum ExpectType {
    Common,
    Const,
    Format,
    Syntax,
    Regexp,
}

/// Type definition for validation.
///
/// Corresponds to the TS `Type` union.
#[derive(Debug, Clone)]
pub enum Type {
    /// A keyword type name like `"Any"`, `"BCP47"`, `"<color>"`, etc.
    Keyword(String),
    /// A fixed set of allowed values.
    Enum(EnumType),
    /// A separated list of tokens, each validated against a sub-type.
    List(ListType),
    /// A numeric value with optional range constraints.
    Number(NumberType),
    /// A prefix pattern followed by a token validated against a sub-type.
    Directive(DirectiveType),
    /// A regex or literal pattern.
    Pattern(PatternType),
}

/// Fixed set of allowed values.
#[derive(Debug, Clone)]
pub struct EnumType {
    pub enum_values: Vec<String>,
    pub case_insensitive: bool,
    pub disallow_to_surround_by_spaces: bool,
}

impl Default for EnumType {
    fn default() -> Self {
        Self {
            enum_values: Vec::new(),
            case_insensitive: true,
            disallow_to_surround_by_spaces: true,
        }
    }
}

/// Separated list type.
#[derive(Debug, Clone)]
#[allow(clippy::struct_excessive_bools)]
pub struct ListType {
    pub token: Box<Type>,
    pub separator: Separator,
    pub allow_empty: bool,
    pub disallow_to_surround_by_spaces: bool,
    pub ordered: bool,
    pub unique: bool,
    pub case_insensitive: bool,
    pub number: Option<ListNumber>,
}

impl Default for ListType {
    fn default() -> Self {
        Self {
            token: Box::new(Type::Keyword("Any".into())),
            separator: Separator::Space,
            allow_empty: true,
            disallow_to_surround_by_spaces: false,
            ordered: false,
            unique: false,
            case_insensitive: true,
            number: None,
        }
    }
}

/// Separator type for lists.
#[derive(Debug, Clone, PartialEq)]
pub enum Separator {
    Space,
    Comma,
}

/// Constraint on the number of list tokens.
#[derive(Debug, Clone)]
pub enum ListNumber {
    ZeroOrMore,
    OneOrMore,
    Range { min: Option<usize>, max: Option<usize> },
}

/// Numeric type with optional range constraints.
#[derive(Debug, Clone)]
pub struct NumberType {
    pub number_type: NumericKind,
    pub gt: Option<f64>,
    pub gte: Option<f64>,
    pub lt: Option<f64>,
    pub lte: Option<f64>,
    pub clampable: bool,
}

/// Kind of numeric value.
#[derive(Debug, Clone, PartialEq)]
pub enum NumericKind {
    Integer,
    Float,
}

/// Directive type: prefix pattern + token validation.
#[derive(Debug, Clone)]
pub struct DirectiveType {
    pub directive: Vec<String>,
    pub token: Box<Type>,
    pub ref_: Option<String>,
}

/// Pattern type: regex or literal.
#[derive(Debug, Clone)]
pub struct PatternType {
    pub pattern: String,
}

// --- Helper constructors ---

/// Create a matched result.
#[must_use]
pub fn matched() -> CheckResult {
    CheckResult::Matched
}

/// Create an unmatched result with a reason.
#[must_use]
pub fn unmatched(raw: &str, reason: Reason) -> CheckResult {
    CheckResult::Unmatched(UnmatchedResult {
        ref_: None,
        raw: raw.to_owned(),
        length: raw.len(),
        offset: 0,
        line: 1,
        column: 1,
        reason,
        pass_count: None,
        part_name: None,
        expects: Vec::new(),
        extra: None,
        candidate: None,
        fallback_to: None,
    })
}

/// Create an unmatched result with additional options.
#[must_use]
pub fn unmatched_with(raw: &str, reason: Reason, opts: UnmatchedOpts) -> CheckResult {
    CheckResult::Unmatched(UnmatchedResult {
        ref_: opts.ref_,
        raw: raw.to_owned(),
        length: raw.len(),
        offset: opts.offset.unwrap_or(0),
        line: opts.line.unwrap_or(1),
        column: opts.column.unwrap_or(1),
        reason,
        pass_count: opts.pass_count,
        part_name: opts.part_name,
        expects: opts.expects.unwrap_or_default(),
        extra: opts.extra,
        candidate: opts.candidate,
        fallback_to: opts.fallback_to,
    })
}

/// Options for creating an unmatched result.
#[derive(Debug, Clone, Default)]
pub struct UnmatchedOpts {
    pub ref_: Option<String>,
    pub offset: Option<usize>,
    pub line: Option<usize>,
    pub column: Option<usize>,
    pub pass_count: Option<usize>,
    pub part_name: Option<String>,
    pub expects: Option<Vec<Expect>>,
    pub extra: Option<Expect>,
    pub candidate: Option<String>,
    pub fallback_to: Option<String>,
}
