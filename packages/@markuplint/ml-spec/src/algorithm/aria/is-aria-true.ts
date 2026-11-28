import { asciiLowerCase } from '@markuplint/shared';

/**
 * Whether a state or property of the true/false type (`aria-hidden`, `aria-busy`, `aria-selected`, …) is `true`, as a
 * browser reads it to decide what the element is: the keyword is compared ASCII case-insensitively, and the value is
 * not trimmed (`" true "` is not `true`). WAI-ARIA defines the keyword only; the engines compare the whole value,
 * WebKit ASCII case-insensitively and Gecko case-sensitively, so `TRUE` is taken for `true` with the majority.
 *
 * @see https://w3c.github.io/aria/#valuetype_true-false
 * @see https://github.com/WebKit/WebKit/blob/main/Source/WebCore/accessibility/AccessibilityObject.cpp
 * @see https://github.com/mozilla-firefox/firefox/blob/main/accessible/base/nsAccUtils.cpp
 * @param value - The value of the attribute, or null when the element has none
 * @returns `true` if it is the value `true`
 */
export function isAriaTrue(value: string | null | undefined): boolean {
	return value != null && asciiLowerCase(value) === 'true';
}
