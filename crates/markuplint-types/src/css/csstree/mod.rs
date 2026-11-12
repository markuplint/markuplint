//! A port of the parts of [css-tree](https://github.com/csstree/csstree) (v3) that TS
//! `@markuplint/types` checks CSS values with: the lexer (`lexer.match()`, behind TS
//! `cssSyntaxMatch`) and the parser of a media query list (`parse(value, { context:
//! 'mediaQueryList' })`, behind TS `checkMediaQueryList`).
//!
//! The port follows css-tree's algorithms, not only their results: the tokenizer, the match graph,
//! the backtracking state machine with its iteration limit, the generic types, the mismatch
//! location, and the parser's fallbacks. A type check must report what TS reports — matched or
//! not, and where the mismatch is — and that is decided by those details.
//!
//! `crate::css::value_match` is a separate matcher (recursive descent over mdn-data) that
//! `markuplint-builder` exposes; the type checks of this crate do not use it.
//!
//! css-tree copyright: Copyright (C) 2016-2026 by Roman Dvornov, MIT License.
//! <https://github.com/csstree/csstree/blob/master/LICENSE>

pub mod lexer;
pub mod parser;
pub mod tokenizer;
