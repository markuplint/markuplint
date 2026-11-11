/**
 * @module @markuplint/react-spec
 *
 * Provides React-specific extended specifications for markuplint: the
 * specification of `@markuplint/react-spec/react-18` (React's JSX global
 * attributes, and the attributes of controlled and uncontrolled form
 * components) with what a React that moves elements to the `<head>` has.
 *
 * Such a React moves some elements to the `<head>` wherever they are
 * written (`movedToHead`), so the content model of the element that contains
 * them does not apply to them, and has the attributes that ask it to
 * (`precedence` and `href` of `<style>`, `precedence` of `<link>`). A project
 * on a React that outputs every element where it is written names
 * `@markuplint/react-spec/react-18` in `specs` instead: the subpath is named
 * for the last major version of React that does so.
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

import react18 from './react-18.js';

/**
 * The React framework extended specification, for a React that moves elements to the `<head>`.
 */
const spec: ExtendedSpec = {
	...react18,
	/**
	 * The elements that React places in the document's `<head>` regardless of where in the React
	 * tree they are rendered, under the conditions the reference of each gives. Attribute names are the
	 * names that `MLAttr` resolves JSX props to (`itemProp` is `itemprop`, `onLoad` is `onload`).
	 *
	 * What decides it in React is `isHostHoistableType` of `react-dom-bindings`, which is stricter than
	 * the references. A comment of it says:
	 *
	 * > Global opt out of hoisting for anything in SVG Namespace or anything with an itemProp inside an itemScope
	 *
	 * A type selector without a namespace matches the SVG element as well, so `:not(svg|…)` leaves it
	 * out. A `<link>` needs `rel` and a non-empty `href`, and a `<style>` a non-empty `href` and
	 * `precedence`.
	 *
	 * What it does not tell, which the selectors cannot express:
	 *
	 * - `disabled={false}` on a stylesheet: React does not move it (`disabled == null`), while the attribute
	 *   is read as absent, so it is taken as moved
	 * - An element whose attributes are all spread (`<link {...props} />`): the attributes are not known,
	 *   so it is not taken as moved, and its position is checked
	 *
	 * The reference of each element says when React moves it:
	 *
	 * `<title>`:
	 *
	 * > React will always place the DOM element corresponding to the `<title>` component within the
	 * > document's `<head>`, regardless of where in the React tree it is rendered.
	 *
	 * `<meta>`:
	 *
	 * > if `<meta>` has an `itemProp` prop, there is no special behavior
	 *
	 * `<link>`:
	 *
	 * > If the `<link>` has a `rel="stylesheet"` prop, then it has to also have a `precedence` prop to
	 * > get this special behavior. […] If the `<link>` has an `itemProp` prop, there is no special
	 * > behavior […] If the `<link>` has an `onLoad` or `onError` prop, because in that case you are
	 * > managing the loading of the linked resource manually within your React component.
	 *
	 * > If you supply any of the `onLoad`, `onError`, or `disabled` props, there is no special behavior
	 *
	 * `<style>`:
	 *
	 * > To opt into this behavior, provide the `href` and `precedence` props.
	 *
	 * @see https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js#isHostHoistableType
	 * @see https://react.dev/reference/react-dom/components/title#special-rendering-behavior
	 * @see https://react.dev/reference/react-dom/components/meta#special-rendering-behavior
	 * @see https://react.dev/reference/react-dom/components/link#special-rendering-behavior
	 * @see https://react.dev/reference/react-dom/components/link#special-behavior-for-stylesheets
	 * @see https://react.dev/reference/react-dom/components/style#special-rendering-behavior
	 */
	movedToHead: [
		'title:not(svg|title):not([itemprop])',
		'meta:not(svg|meta):not([itemprop])',
		'link:not(svg|link)[rel][href]:not([href=""]):not([rel=stylesheet]):not([itemprop]):not([onload]):not([onerror])',
		'link:not(svg|link)[rel=stylesheet][href]:not([href=""])[precedence]:not([itemprop]):not([onload]):not([onerror]):not([disabled])',
		'style:not(svg|style)[href]:not([href=""])[precedence]:not([itemprop])',
	],
	specs: [
		...(react18.specs ?? []),
		{
			name: 'style',
			attributes: {
				/**
				 * Allows React to de-duplicate styles that have the same `href`, and with
				 * `precedence` to move the `<style>` to the document's `<head>`.
				 */
				href: {
					type: 'Any',
				},
				/**
				 * Tells React where to rank the `<style>` relative to others in the
				 * document's `<head>`; React drops the other props when it is given.
				 */
				precedence: {
					type: 'Any',
				},
			},
		},
		{
			name: 'link',
			attributes: {
				/**
				 * Tells React where to rank the stylesheet (`rel="stylesheet"`) relative
				 * to others in the document's `<head>`.
				 */
				precedence: {
					type: 'Any',
				},
			},
		},
	],
};

export default spec;
