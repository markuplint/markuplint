/**
 * The names of a component in a Vue template.
 *
 * Vue resolves a tag `T` to a component registered (or imported under `<script setup>`) as `N`
 * when `N` is `T`, `camelize(T)` or `capitalize(camelize(T))`: a component named `MyComponent`
 * "can be referenced inside a Vue template (or inside an HTML element rendered by Vue) via both
 * `<MyComponent>` and `<my-component>`", and under `<script setup>` "the kebab-case equivalent
 * `<my-component>` also works in the template". Nothing makes `<mycomponent>` a reference to it.
 *
 * @see https://vuejs.org/guide/components/registration.html#component-name-casing
 * @see https://vuejs.org/api/sfc-script-setup.html#using-components
 * @see https://github.com/vuejs/core/blob/main/packages/compiler-core/src/transforms/transformElement.ts (`resolveSetupReference`)
 * @module
 */

/**
 * Turns a kebab-case name into camelCase, as `camelize` of `@vue/shared` does: `foo-bar` is `fooBar`.
 * A name without a hyphen is returned as it is.
 *
 * @param name - A name as written
 * @returns The camelCase name
 */
export function camelize(name: string): string {
	return name.replaceAll(/-(\w)/g, (_, char: string) => char.toUpperCase());
}

/**
 * Makes the first character upper-case, as `capitalize` of `@vue/shared` does.
 *
 * @param name - A name as written
 * @returns The name with the first character upper-case
 */
export function capitalize(name: string): string {
	return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Turns a name into PascalCase: `capitalize(camelize(name))`. `foo-bar` and `fooBar` are `FooBar`.
 *
 * @param name - A name as written
 * @returns The PascalCase name
 */
export function pascalize(name: string): string {
	return capitalize(camelize(name));
}

/**
 * The key by which a Vue template gives a prop the attribute of the usage site: the camelCase of the name,
 * and nothing else. `my-label` and `myLabel` are one key, and `mylabel` is another, as Vue resolves them
 * (a prop is a JavaScript identifier, and `camelize` is all that a template does to the name of an
 * attribute). `data-id` and `dataId` are one prop to Vue, so when a usage site writes both the
 * first one written is the one that is found.
 *
 * @see https://vuejs.org/guide/components/props.html#prop-name-casing
 *
 * @param name - The name of an attribute at the usage site, or of a prop
 * @returns The key
 */
export function vuePropKey(name: string): string {
	return camelize(name);
}

/**
 * Whether a name is made of more than one word: it has a hyphen (`foo-bar`) or a lower-case
 * letter or a digit followed by an upper-case letter (`FooBar`, `fooBar`). The one word of
 * `Foo` / `foo` is the same name as written in any case, so it may as well be an HTML element.
 *
 * @param name - A name as written
 * @returns Whether the name has more than one word
 */
export function isMultiWordName(name: string): boolean {
	return name.includes('-') || /[a-z\d][A-Z]/.test(name);
}

/**
 * Whether the tag `tag` of a Vue template refers to the component registered as `registered`:
 * `registered` is `tag`, `camelize(tag)` or `pascalize(tag)`.
 *
 * It takes a name without a `.`. A member tag (`<ui.Item>`) is resolved by the name before the
 * first `.` (see {@link splitMemberTag}), and the rest is a property of what that name stands for.
 *
 * @param tag - The tag name as written
 * @param registered - The name a component is registered or imported under
 * @returns Whether Vue resolves the tag to the name
 */
export function resolvesToVueComponent(tag: string, registered: string): boolean {
	const camelName = camelize(tag);
	return registered === tag || registered === camelName || registered === capitalize(camelName);
}

/**
 * Splits a member tag (`UI.Item`, `UI.Sub.Item`) into the name before the first `.` and the
 * rest. A tag without a `.` has no rest.
 *
 * @param tag - The tag name as written
 * @returns The head name and the rest (`null` when there is none)
 */
export function splitMemberTag(tag: string): { readonly head: string; readonly rest: string | null } {
	const dot = tag.indexOf('.');
	return dot === -1 ? { head: tag, rest: null } : { head: tag.slice(0, dot), rest: tag.slice(dot + 1) };
}

/**
 * Whether the type name `selectorName` of a selector stands for the component tag `tagName` of a
 * Vue template, the other way round from {@link resolvesToVueComponent}: the selector is the
 * name a component is known by, the tag is how it is written.
 *
 * - A name of more than one word is the same component whichever way it is written
 *   (`FooBar`, `fooBar` and `foo-bar`), and a selector `FooBar` is not `<foobar>`.
 * - A name of one word is the selector as written or capitalized (`Transition` for `<transition>`).
 *   A selector `button` is not `<Button>`: a tag with a capital initial is a component, and a
 *   selector for an HTML element is written in lower case.
 * - A member tag (`<ui.Item>`) is the head by the rules above, and the rest as written.
 *
 * @param selectorName - The type name of the selector
 * @param tagName - The tag name as written
 * @returns Whether the selector stands for the tag
 */
export function vueTagNameMatches(selectorName: string, tagName: string): boolean {
	const selector = splitMemberTag(selectorName);
	const tag = splitMemberTag(tagName);
	if (selector.rest !== tag.rest) {
		return false;
	}
	if (isMultiWordName(selector.head) || isMultiWordName(tag.head)) {
		return pascalize(selector.head) === pascalize(tag.head);
	}
	return selector.head === tag.head || selector.head === capitalize(tag.head);
}
