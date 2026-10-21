//! The name that the DOM gives an attribute (TS `MLAttr#nameKey`), which two spellings of a name
//! share when they are one attribute (`ID` and `id` on a `<div>`, `VIEWBOX` and `viewbox` on an
//! `<svg>` that the HTML parser reads).
//!
//! It depends on how the name gets into the DOM (`DocumentSettings::attr_name_route`) and on the
//! element: the HTML parser lower-cases a name and restores the case of the names of SVG and
//! `MathML`; `setAttribute` lower-cases a name only on an element of the HTML namespace, so `ROLE`
//! on an `<svg>` that code sets is `ROLE`, which is not `role`. The attribute of a component is a
//! prop, which keeps its spelling, except in Vue where `my-label` and `myLabel` are one prop.
//!
//! - <https://dom.spec.whatwg.org/#dom-element-setattribute>
//! - <https://html.spec.whatwg.org/multipage/parsing.html#attribute-name-state>

use markuplint_core::mlast::{AttrNameRoute, DocumentSettings, ElementType, MLASTHTMLAttr, NamespaceURI};
use markuplint_dom::helpers::adjust_foreign_attr_name;
use markuplint_dom::node::ElementData;

use crate::aria_check::attr_name;

/// The attributes of one element, keyed as the DOM keys them.
pub(crate) struct AttrNames<'a> {
    el: &'a ElementData,
    settings: DocumentSettings,
}

impl<'a> AttrNames<'a> {
    pub(crate) fn new(el: &'a ElementData, settings: DocumentSettings) -> Self {
        Self { el, settings }
    }

    fn is_authored(&self) -> bool {
        self.el.element_type == ElementType::Authored
    }

    fn is_foreign(&self) -> bool {
        self.el.namespace != NamespaceURI::XHTML
    }

    /// TS `MLAttr#isSetThroughDOMAPI`: the name of the attribute reaches the DOM through the DOM
    /// API (`setAttribute`) and not through the HTML parser of the browser.
    fn is_set_through_dom_api(&self, attr: &MLASTHTMLAttr) -> bool {
        match self.settings.attr_name_route {
            AttrNameRoute::HtmlParser => false,
            AttrNameRoute::DomApi => true,
            AttrNameRoute::DomApiWhenDynamic => attr.is_dynamic_value == Some(true),
        }
    }

    /// TS `MLAttr#keyOf`: the key of `name`, a name of a spec, of an option or of a lookup, as
    /// this attribute is keyed. Only the ASCII letters fold, as the HTML syntax says.
    pub(crate) fn key_of(&self, attr: &MLASTHTMLAttr, name: &str) -> String {
        if self.is_authored() {
            return if self.settings.component_name_variants {
                camelize(name)
            } else {
                name.to_owned()
            };
        }
        if !self.is_foreign() {
            return name.to_ascii_lowercase();
        }
        if self.is_set_through_dom_api(attr) {
            return name.to_owned();
        }
        adjust_foreign_attr_name(name, &self.el.namespace)
    }

    /// TS `MLAttr#nameKey`.
    fn name_key(&self, attr: &MLASTHTMLAttr) -> String {
        self.key_of(attr, attr_name(attr))
    }

    /// TS `namespaceKeyOf`: the name that a namespace of names (`data-*`, `aria-*`, the
    /// predefined groups of `attr-order`) is told by. For the prop of a component it is the name
    /// as written in ASCII lower case instead, because the key camelizes it in Vue (`data-x` is
    /// `dataX`) and a prefix cannot be told then.
    pub(crate) fn namespace_key_of(&self, attr: &MLASTHTMLAttr) -> String {
        if self.is_authored() {
            attr_name(attr).to_ascii_lowercase()
        } else {
            self.name_key(attr)
        }
    }

    /// TS `MLAttr#isNamedBy`: whether `name` is the name of this attribute, as it is written or
    /// as another spelling that the DOM makes the same attribute.
    pub(crate) fn is_named_by(&self, attr: &MLASTHTMLAttr, name: &str) -> bool {
        if name == attr_name(attr) {
            return true;
        }
        if self.is_framework_prop_name(attr, name) {
            return false;
        }
        self.key_of(attr, name) == self.name_key(attr)
    }

    /// TS `MLAttr#isFrameworkPropName`: a name with a capital letter that code sets on an element
    /// of the HTML namespace is a prop of the framework (`defaultValue` of React), not an
    /// attribute of the DOM, so only its exact spelling is it.
    fn is_framework_prop_name(&self, attr: &MLASTHTMLAttr, name: &str) -> bool {
        !self.is_authored()
            && !self.is_foreign()
            && self.is_set_through_dom_api(attr)
            && name.bytes().any(|b| b.is_ascii_uppercase())
    }
}

/// TS `camelize`: `foo-bar` is `fooBar`, as `camelize` of `@vue/shared` does. A hyphen that no
/// word character follows stays.
fn camelize(name: &str) -> String {
    let mut result = String::with_capacity(name.len());
    let mut chars = name.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '-'
            && let Some(next) = chars.peek().copied()
            && (next.is_ascii_alphanumeric() || next == '_')
        {
            result.push(next.to_ascii_uppercase());
            chars.next();
        } else {
            result.push(c);
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::camelize;

    #[test]
    fn camelize_turns_a_hyphen_before_a_word_character_into_a_capital() {
        assert_eq!(camelize("my-label"), "myLabel");
        assert_eq!(camelize("data-x-y"), "dataXY");
        assert_eq!(camelize("a--b"), "a-B");
        assert_eq!(camelize("trailing-"), "trailing-");
        assert_eq!(camelize("myLabel"), "myLabel");
    }
}
