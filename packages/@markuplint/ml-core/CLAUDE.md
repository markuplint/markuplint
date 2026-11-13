# @markuplint/ml-core

## MLDOM implements no DOM interface

`MLElement`, `MLNode`, `MLAttr` and the other MLDOM classes declare no `implements` of a `lib.dom` interface, and they have no `UnexpectedCallError` stub for a DOM member markuplint never calls. Do not add either back to satisfy a caller that wants the browser's `Element`: the callers read `SpecElement` (`@markuplint/ml-spec`) and `SelectorElement` (`@markuplint/selector`), which list what the algorithms use, so a new member goes into the MLDOM class and into that interface together.

The members follow the naming of the Rust DOM (`crates/markuplint-dom`: `parent`, `prev_sibling`, `get_attr_value`, `has_attr`, `find_element_by_id`, `pure_children_of`) and keep the DOM's name otherwise: the JSDoc of `MLNode` (`ml-dom/node/node.ts`) lists the renamed ones. A DOM name that the Rust DOM spells with another meaning is not reused (`children` is every child node in Rust and only the elements in the DOM, so MLDOM says `childElements`).

The `.d.ts` of this package therefore does not depend on the `lib.dom` of a consumer: a TypeScript release that adds a property to a DOM interface no longer breaks the build of ml-core or of the consumer's `skipLibCheck: false`.
