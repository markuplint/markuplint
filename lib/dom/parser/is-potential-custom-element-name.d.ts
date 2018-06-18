/**
 * valid name of custom element
 *
 * > A valid custom element name is a sequence of characters name that meets all of the following requirements:
 * >
 * > name must match the PotentialCustomElementName production:
 * >
 * > PotentialCustomElementName ::=
 * >   [a-z] (PCENChar)* '-' (PCENChar)*
 * > PCENChar ::=
 * >   "-" | "." | [0-9] | "_" | [a-z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] | [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
 *
 * ASCII-case-insensitively. Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
 *
 * @param tagName
 */
export default function isPotentialCustomElementName(tagName: string): boolean;
