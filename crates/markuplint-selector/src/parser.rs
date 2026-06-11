//! CSS selector parser.

use crate::ast::{
    AttrOperator, AttributeSelector, Combinator, ComplexSelector, CompoundSelector, PseudoClassSelector, SelectorList,
    SimpleSelector,
};

/// # Errors
///
/// Returns an error string if the selector is malformed.
pub fn parse(input: &str) -> Result<SelectorList, String> {
    let mut parser = Parser::new(input);
    let list = parser.parse_selector_list()?;
    Ok(list)
}

struct Parser<'a> {
    input: &'a str,
    pos: usize,
}

impl<'a> Parser<'a> {
    fn new(input: &'a str) -> Self {
        Self { input, pos: 0 }
    }

    fn remaining(&self) -> &str {
        &self.input[self.pos..]
    }

    fn peek(&self) -> Option<char> {
        self.remaining().chars().next()
    }

    fn advance(&mut self) -> Option<char> {
        let ch = self.remaining().chars().next()?;
        self.pos += ch.len_utf8();
        Some(ch)
    }

    fn skip_whitespace(&mut self) {
        while self.peek().is_some_and(|c| c.is_ascii_whitespace()) {
            self.advance();
        }
    }

    fn parse_selector_list(&mut self) -> Result<SelectorList, String> {
        let mut selectors = vec![self.parse_complex_selector()?];
        loop {
            self.skip_whitespace();
            if self.peek() == Some(',') {
                self.advance();
                self.skip_whitespace();
                selectors.push(self.parse_complex_selector()?);
            } else {
                break;
            }
        }
        Ok(SelectorList { selectors })
    }

    fn parse_complex_selector(&mut self) -> Result<ComplexSelector, String> {
        self.skip_whitespace();
        let first = self.parse_compound_selector()?;
        let mut compounds = vec![first];
        let mut combinators = Vec::new();

        loop {
            let had_whitespace = self.skip_whitespace_and_check();
            match self.peek() {
                Some('>') => {
                    self.advance();
                    self.skip_whitespace();
                    combinators.push(Combinator::Child);
                    compounds.push(self.parse_compound_selector()?);
                }
                Some('+') => {
                    self.advance();
                    self.skip_whitespace();
                    combinators.push(Combinator::NextSibling);
                    compounds.push(self.parse_compound_selector()?);
                }
                Some('~') => {
                    self.advance();
                    self.skip_whitespace();
                    combinators.push(Combinator::SubsequentSibling);
                    compounds.push(self.parse_compound_selector()?);
                }
                Some(c) if had_whitespace && is_selector_start(c) => {
                    combinators.push(Combinator::Descendant);
                    compounds.push(self.parse_compound_selector()?);
                }
                _ => break,
            }
        }

        let subject = compounds.pop().unwrap();
        let mut chain = Vec::new();
        for (compound, combinator) in compounds.into_iter().zip(combinators.into_iter()) {
            chain.push((combinator, compound));
        }
        chain.reverse();

        Ok(ComplexSelector { subject, chain })
    }

    fn skip_whitespace_and_check(&mut self) -> bool {
        let start = self.pos;
        self.skip_whitespace();
        self.pos > start
    }

    fn parse_compound_selector(&mut self) -> Result<CompoundSelector, String> {
        let mut parts = Vec::new();

        loop {
            match self.peek() {
                Some('*') => {
                    self.advance();
                    parts.push(SimpleSelector::Universal);
                }
                Some('#') => {
                    self.advance();
                    let name = self.parse_ident()?;
                    parts.push(SimpleSelector::Id(name));
                }
                Some('.') => {
                    self.advance();
                    let name = self.parse_ident()?;
                    parts.push(SimpleSelector::Class(name));
                }
                Some('[') => {
                    parts.push(SimpleSelector::Attribute(self.parse_attribute_selector()?));
                }
                Some(':') => {
                    parts.push(SimpleSelector::PseudoClass(self.parse_pseudo_class()?));
                }
                Some(c) if is_ident_start(c) => {
                    let name = self.parse_ident()?;
                    if self.peek() == Some('|') {
                        self.advance();
                        let local = self.parse_ident()?;
                        parts.push(SimpleSelector::Namespace(name));
                        parts.push(SimpleSelector::Type(local));
                    } else {
                        parts.push(SimpleSelector::Type(name));
                    }
                }
                _ => break,
            }
        }

        if parts.is_empty() {
            return Err(format!("Expected selector at position {}", self.pos));
        }

        Ok(CompoundSelector { parts })
    }

    fn parse_ident(&mut self) -> Result<String, String> {
        let mut name = String::new();
        // Allow leading hyphen(s) for custom elements / dashed-ident
        while self.peek() == Some('-') {
            name.push('-');
            self.advance();
        }
        match self.peek() {
            Some(c) if c.is_ascii_alphabetic() || c == '_' || !c.is_ascii() => {
                name.push(c);
                self.advance();
            }
            _ if !name.is_empty() => {
                // Bare hyphens (e.g., CSS custom properties)
                return Ok(name);
            }
            _ => {
                return Err(format!("Expected identifier at position {}", self.pos));
            }
        }
        while let Some(c) = self.peek() {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' || !c.is_ascii() {
                name.push(c);
                self.advance();
            } else {
                break;
            }
        }
        Ok(name)
    }

    fn parse_attribute_selector(&mut self) -> Result<AttributeSelector, String> {
        self.advance(); // skip '['
        self.skip_whitespace();

        let name = self.parse_ident()?;
        self.skip_whitespace();

        if self.peek() == Some(']') {
            self.advance();
            return Ok(AttributeSelector {
                name,
                operator: None,
                value: None,
                case_insensitive: false,
            });
        }

        let operator = self.parse_attr_operator()?;
        self.skip_whitespace();
        let value = self.parse_attr_value()?;
        self.skip_whitespace();

        let case_insensitive = if self.peek() == Some('i') || self.peek() == Some('I') {
            self.advance();
            self.skip_whitespace();
            true
        } else {
            false
        };

        if self.peek() != Some(']') {
            return Err(format!("Expected ']' at position {}", self.pos));
        }
        self.advance();

        Ok(AttributeSelector {
            name,
            operator: Some(operator),
            value: Some(value),
            case_insensitive,
        })
    }

    fn parse_attr_operator(&mut self) -> Result<AttrOperator, String> {
        match self.peek() {
            Some('=') => {
                self.advance();
                Ok(AttrOperator::Equals)
            }
            Some('~') => {
                self.advance();
                self.expect('=')?;
                Ok(AttrOperator::Includes)
            }
            Some('|') => {
                self.advance();
                self.expect('=')?;
                Ok(AttrOperator::DashMatch)
            }
            Some('^') => {
                self.advance();
                self.expect('=')?;
                Ok(AttrOperator::PrefixMatch)
            }
            Some('$') => {
                self.advance();
                self.expect('=')?;
                Ok(AttrOperator::SuffixMatch)
            }
            Some('*') => {
                self.advance();
                self.expect('=')?;
                Ok(AttrOperator::SubstringMatch)
            }
            _ => Err(format!("Expected attribute operator at position {}", self.pos)),
        }
    }

    fn parse_attr_value(&mut self) -> Result<String, String> {
        match self.peek() {
            Some('"' | '\'') => self.parse_quoted_string(),
            Some(c) if is_ident_start(c) || c == '-' || c == '.' => self.parse_unquoted_attr_value(),
            _ => Err(format!("Expected attribute value at position {}", self.pos)),
        }
    }

    /// Permissive (allows dots, digits, etc.) to match postcss-selector-parser
    /// behavior for values like `.svg`.
    fn parse_unquoted_attr_value(&mut self) -> Result<String, String> {
        let mut value = String::new();
        while let Some(c) = self.peek() {
            if c == ']' || c == ' ' || c == '\t' || c == '\n' || c == '\r' {
                break;
            }
            value.push(c);
            self.advance();
        }
        if value.is_empty() {
            return Err(format!("Expected attribute value at position {}", self.pos));
        }
        Ok(value)
    }

    fn parse_quoted_string(&mut self) -> Result<String, String> {
        let quote = self.advance().unwrap();
        let mut value = String::new();
        loop {
            match self.advance() {
                Some(c) if c == quote => break,
                Some('\\') => {
                    if let Some(escaped) = self.advance() {
                        value.push(escaped);
                    }
                }
                Some(c) => value.push(c),
                None => return Err("Unterminated string".to_string()),
            }
        }
        Ok(value)
    }

    fn parse_pseudo_class(&mut self) -> Result<PseudoClassSelector, String> {
        self.advance();
        // A second `:` denotes a pseudo-element, which is unsupported.
        if self.peek() == Some(':') {
            return Err(format!("Pseudo-elements not supported at position {}", self.pos));
        }

        let name = self.parse_ident()?;

        if self.peek() == Some('(') {
            self.advance();
            let lower = name.to_ascii_lowercase();
            match lower.as_str() {
                "not" => {
                    let list = self.parse_selector_list()?;
                    self.skip_whitespace();
                    self.expect(')')?;
                    Ok(PseudoClassSelector::Not(list))
                }
                "is" => {
                    let list = self.parse_selector_list()?;
                    self.skip_whitespace();
                    self.expect(')')?;
                    Ok(PseudoClassSelector::Is(list))
                }
                "has" => {
                    let list = self.parse_selector_list()?;
                    self.skip_whitespace();
                    self.expect(')')?;
                    Ok(PseudoClassSelector::Has(list))
                }
                "where" => {
                    let list = self.parse_selector_list()?;
                    self.skip_whitespace();
                    self.expect(')')?;
                    Ok(PseudoClassSelector::Where(list))
                }
                "closest" => {
                    let list = self.parse_selector_list()?;
                    self.skip_whitespace();
                    self.expect(')')?;
                    Ok(PseudoClassSelector::Closest(list))
                }
                "model" => {
                    let content = self.parse_paren_content()?;
                    Ok(PseudoClassSelector::Model(content))
                }
                "role" => {
                    let content = self.parse_paren_content()?;
                    validate_role_content(&content)?;
                    Ok(PseudoClassSelector::Role(content))
                }
                "aria" => {
                    let content = self.parse_paren_content()?;
                    validate_aria_content(&content)?;
                    Ok(PseudoClassSelector::Aria(content))
                }
                _ => Err(format!("Unsupported pseudo-class :{name}()")),
            }
        } else {
            let lower = name.to_ascii_lowercase();
            match lower.as_str() {
                "scope" => Ok(PseudoClassSelector::Scope),
                "root" => Ok(PseudoClassSelector::Root),
                _ => Err(format!("Unsupported pseudo-class :{name}")),
            }
        }
    }

    fn parse_paren_content(&mut self) -> Result<String, String> {
        let mut content = String::new();
        let mut depth = 1u32;
        loop {
            match self.advance() {
                Some('(') => {
                    depth += 1;
                    content.push('(');
                }
                Some(')') => {
                    depth -= 1;
                    if depth == 0 {
                        break;
                    }
                    content.push(')');
                }
                Some(c) => content.push(c),
                None => return Err("Unterminated parentheses".to_string()),
            }
        }
        Ok(content.trim().to_string())
    }

    fn expect(&mut self, expected: char) -> Result<(), String> {
        match self.advance() {
            Some(c) if c == expected => Ok(()),
            Some(c) => Err(format!(
                "Expected '{expected}' but found '{c}' at position {}",
                self.pos
            )),
            None => Err(format!("Expected '{expected}' but reached end of input")),
        }
    }
}

fn is_ident_start(c: char) -> bool {
    c.is_ascii_alphabetic() || c == '_' || c == '-' || !c.is_ascii()
}

fn is_selector_start(c: char) -> bool {
    is_ident_start(c) || matches!(c, '*' | '#' | '.' | '[' | ':')
}

/// Accepted syntax: `hasName`, `has name`, `hasNoName`, `has no name`,
/// with optional version suffix `|1.1`, `|1.2`, `|1.3`.
fn validate_aria_content(content: &str) -> Result<(), String> {
    let (query_str, version_str) = content.split_once('|').map_or((content, None), |(l, r)| (l, Some(r)));

    let normalized: String = query_str.split_whitespace().collect::<String>().to_lowercase();
    if normalized != "hasname" && normalized != "hasnoname" {
        return Err(format!("Unsupported :aria() syntax: \"{content}\""));
    }

    if let Some(v) = version_str {
        validate_aria_version(v.trim())?;
    }

    Ok(())
}

/// Accepted syntax: `roleName`, with optional version suffix `|1.1`, `|1.2`, `|1.3`.
fn validate_role_content(content: &str) -> Result<(), String> {
    let (role_name, version_str) = content.split_once('|').map_or((content, None), |(l, r)| (l, Some(r)));

    if role_name.trim().is_empty() {
        return Err("Empty :role() selector".to_string());
    }

    if let Some(v) = version_str {
        validate_aria_version(v.trim())?;
    }

    Ok(())
}

/// Accepts `1.1`, `1.2`, `1.3`.
fn validate_aria_version(version: &str) -> Result<(), String> {
    match version {
        "1.1" | "1.2" | "1.3" => Ok(()),
        _ => Err(format!("Unsupported ARIA version: \"{version}\"")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_tag() {
        let list = parse("div").unwrap();
        assert_eq!(list.selectors.len(), 1);
        let sel = &list.selectors[0];
        assert!(sel.chain.is_empty());
        assert_eq!(sel.subject.parts.len(), 1);
        assert!(matches!(&sel.subject.parts[0], SimpleSelector::Type(n) if n == "div"));
    }

    #[test]
    fn parse_id() {
        let list = parse("#foo").unwrap();
        assert!(matches!(&list.selectors[0].subject.parts[0], SimpleSelector::Id(n) if n == "foo"));
    }

    #[test]
    fn parse_class() {
        let list = parse(".bar").unwrap();
        assert!(matches!(&list.selectors[0].subject.parts[0], SimpleSelector::Class(n) if n == "bar"));
    }

    #[test]
    fn parse_universal() {
        let list = parse("*").unwrap();
        assert!(matches!(&list.selectors[0].subject.parts[0], SimpleSelector::Universal));
    }

    #[test]
    fn parse_attribute_exists() {
        let list = parse("[href]").unwrap();
        if let SimpleSelector::Attribute(attr) = &list.selectors[0].subject.parts[0] {
            assert_eq!(attr.name, "href");
            assert!(attr.operator.is_none());
        } else {
            panic!("Expected attribute selector");
        }
    }

    #[test]
    fn parse_attribute_equals() {
        let list = parse("[type=checkbox]").unwrap();
        if let SimpleSelector::Attribute(attr) = &list.selectors[0].subject.parts[0] {
            assert_eq!(attr.name, "type");
            assert_eq!(attr.operator, Some(AttrOperator::Equals));
            assert_eq!(attr.value.as_deref(), Some("checkbox"));
        } else {
            panic!("Expected attribute selector");
        }
    }

    #[test]
    fn parse_attribute_case_insensitive() {
        let list = parse("[type=checkbox i]").unwrap();
        if let SimpleSelector::Attribute(attr) = &list.selectors[0].subject.parts[0] {
            assert!(attr.case_insensitive);
        } else {
            panic!("Expected attribute selector");
        }
    }

    #[test]
    fn parse_attribute_quoted() {
        let list = parse(r#"[type="check box"]"#).unwrap();
        if let SimpleSelector::Attribute(attr) = &list.selectors[0].subject.parts[0] {
            assert_eq!(attr.value.as_deref(), Some("check box"));
        } else {
            panic!("Expected attribute selector");
        }
    }

    #[test]
    fn parse_descendant() {
        let list = parse("div p").unwrap();
        let sel = &list.selectors[0];
        assert!(matches!(&sel.subject.parts[0], SimpleSelector::Type(n) if n == "p"));
        assert_eq!(sel.chain.len(), 1);
        assert_eq!(sel.chain[0].0, Combinator::Descendant);
    }

    #[test]
    fn parse_child() {
        let list = parse("div > p").unwrap();
        let sel = &list.selectors[0];
        assert!(matches!(&sel.subject.parts[0], SimpleSelector::Type(n) if n == "p"));
        assert_eq!(sel.chain[0].0, Combinator::Child);
    }

    #[test]
    fn parse_sibling() {
        let list = parse("h1 + p").unwrap();
        assert_eq!(list.selectors[0].chain[0].0, Combinator::NextSibling);
    }

    #[test]
    fn parse_subsequent_sibling() {
        let list = parse("h1 ~ p").unwrap();
        assert_eq!(list.selectors[0].chain[0].0, Combinator::SubsequentSibling);
    }

    #[test]
    fn parse_comma_separated() {
        let list = parse("div, p, span").unwrap();
        assert_eq!(list.selectors.len(), 3);
    }

    #[test]
    fn parse_compound() {
        let list = parse("div.foo#bar").unwrap();
        let parts = &list.selectors[0].subject.parts;
        assert_eq!(parts.len(), 3);
        assert!(matches!(&parts[0], SimpleSelector::Type(n) if n == "div"));
        assert!(matches!(&parts[1], SimpleSelector::Class(n) if n == "foo"));
        assert!(matches!(&parts[2], SimpleSelector::Id(n) if n == "bar"));
    }

    #[test]
    fn parse_not() {
        let list = parse(":not([href])").unwrap();
        if let SimpleSelector::PseudoClass(PseudoClassSelector::Not(inner)) = &list.selectors[0].subject.parts[0] {
            assert_eq!(inner.selectors.len(), 1);
        } else {
            panic!("Expected :not()");
        }
    }

    #[test]
    fn parse_is() {
        let list = parse(":is(div, p)").unwrap();
        if let SimpleSelector::PseudoClass(PseudoClassSelector::Is(inner)) = &list.selectors[0].subject.parts[0] {
            assert_eq!(inner.selectors.len(), 2);
        } else {
            panic!("Expected :is()");
        }
    }

    #[test]
    fn parse_model_extension() {
        let list = parse(":model(flow)").unwrap();
        if let SimpleSelector::PseudoClass(PseudoClassSelector::Model(cat)) = &list.selectors[0].subject.parts[0] {
            assert_eq!(cat, "flow");
        } else {
            panic!("Expected :model()");
        }
    }

    #[test]
    fn parse_role_extension() {
        let list = parse(":role(button)").unwrap();
        if let SimpleSelector::PseudoClass(PseudoClassSelector::Role(r)) = &list.selectors[0].subject.parts[0] {
            assert_eq!(r, "button");
        } else {
            panic!("Expected :role()");
        }
    }

    #[test]
    fn parse_complex_real_world() {
        // From html-spec: condition for <a> without href
        let list = parse(":not([href])").unwrap();
        assert_eq!(list.selectors.len(), 1);
    }

    #[test]
    fn parse_scope() {
        let list = parse(":scope").unwrap();
        assert!(matches!(
            &list.selectors[0].subject.parts[0],
            SimpleSelector::PseudoClass(PseudoClassSelector::Scope)
        ));
    }

    #[test]
    fn parse_has_descendant() {
        let list = parse(":has(div)").unwrap();
        assert!(matches!(
            &list.selectors[0].subject.parts[0],
            SimpleSelector::PseudoClass(PseudoClassSelector::Has(_))
        ));
    }

    #[test]
    fn parse_has_with_descendant() {
        let list = parse(":has(div span)").unwrap();
        assert!(matches!(
            &list.selectors[0].subject.parts[0],
            SimpleSelector::PseudoClass(PseudoClassSelector::Has(_))
        ));
    }

    // --- Error cases ---

    #[test]
    fn error_empty_string() {
        assert!(parse("").is_err());
    }

    #[test]
    fn error_bare_combinator() {
        assert!(parse(">").is_err());
        assert!(parse("+").is_err());
        assert!(parse("~").is_err());
    }

    #[test]
    fn error_unclosed_bracket() {
        assert!(parse("[href").is_err());
    }

    #[test]
    fn error_unclosed_paren() {
        assert!(parse(":not(div").is_err());
    }

    #[test]
    fn error_pseudo_element_rejected() {
        assert!(parse("::before").is_err());
        assert!(parse("::after").is_err());
    }

    #[test]
    fn error_unsupported_pseudo() {
        assert!(parse(":hover").is_err());
        assert!(parse(":focus").is_err());
    }

    #[test]
    fn error_trailing_combinator() {
        // "div >" with nothing after — parsed as compound `div` then
        // child combinator expects another compound but finds EOF
        assert!(parse("div >").is_err());
    }

    #[test]
    fn error_double_comma() {
        assert!(parse("div,,p").is_err());
    }

    #[test]
    fn error_invalid_attribute_operator() {
        assert!(parse("[href!=val]").is_err());
    }
}
