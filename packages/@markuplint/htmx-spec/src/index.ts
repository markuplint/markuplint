/**
 * @module @markuplint/htmx-spec
 *
 * Provides htmx-specific extended specifications for markuplint.
 * Defines htmx's global attributes (`hx-get`, `hx-post`, `hx-trigger`,
 * `hx-target`, `hx-swap`, etc.) that are available on any HTML element.
 *
 * htmx is a library that allows access to modern browser features
 * directly from HTML, using attributes to configure AJAX requests,
 * CSS transitions, WebSockets, and Server-Sent Events.
 *
 * This package is merged into the base HTML spec by `schemaToSpec`
 * in `@markuplint/ml-spec`. It intentionally has no test suite:
 * conformance is enforced at build time by the `ExtendedSpec` type,
 * and the merged spec is exercised by the downstream
 * `@markuplint/ml-spec` and `@markuplint/ml-core` tests.
 *
 * @see https://htmx.org/reference/
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * The htmx framework extended specification.
 *
 * Registers global htmx attributes available on every HTML element.
 * htmx attributes are all global and prefixed with `hx-`.
 */
const spec: ExtendedSpec = {
	cites: ['https://htmx.org/reference/'],
	directivePatterns: [
		/**
		 * htmx event with explicit prefix: hx-on:htmx:event or hx-on-htmx-event
		 * @see https://htmx.org/attributes/hx-on/
		 */
		{
			pattern: '^hx-on([:-])htmx\\1(.+)$',
			potentialName: 'hx-on:htmx:$2',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * htmx event with shorthand double separator: hx-on::event
		 * @see https://htmx.org/attributes/hx-on/
		 */
		{
			pattern: '^hx-on[:-]{2}(.+)$',
			potentialName: 'hx-on:htmx:$1',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Native DOM event: hx-on:click, hx-on-click
		 * @see https://htmx.org/attributes/hx-on/
		 */
		{
			pattern: '^hx-on[:-]([a-z]+)$',
			potentialName: 'on$1',
			isDirective: true,
			isDynamicValue: true,
		},
	],
	def: {
		'#globalAttrs': {
			'#extends': {
				/**
				 * Issues a GET request to the given URL
				 */
				'hx-get': {
					type: 'Any',
				},
				/**
				 * Issues a POST request to the given URL
				 */
				'hx-post': {
					type: 'Any',
				},
				/**
				 * Issues a PUT request to the given URL
				 */
				'hx-put': {
					type: 'Any',
				},
				/**
				 * Issues a PATCH request to the given URL
				 */
				'hx-patch': {
					type: 'Any',
				},
				/**
				 * Issues a DELETE request to the given URL
				 */
				'hx-delete': {
					type: 'Any',
				},
				/**
				 * Specifies the event that triggers the request.
				 * Accepts standard DOM events, special events (load, revealed, intersect),
				 * polling syntax (every Ns), event filters, and modifiers.
				 */
				'hx-trigger': {
					type: 'Any',
				},
				/**
				 * Specifies the target element for the response content swap.
				 * Accepts CSS selectors, `this`, `closest <selector>`,
				 * `find <selector>`, `next`, `previous`.
				 */
				'hx-target': {
					type: 'Any',
				},
				/**
				 * Controls how the response content is swapped into the DOM.
				 * Values: innerHTML, outerHTML, textContent, beforebegin,
				 * afterbegin, beforeend, afterend, delete, none.
				 */
				'hx-swap': {
					type: 'Any',
				},
				/**
				 * Marks content in the response for out-of-band swap
				 */
				'hx-swap-oob': {
					type: 'Any',
				},
				/**
				 * Selects a subset of the response HTML to swap in
				 */
				'hx-select': {
					type: 'Any',
				},
				/**
				 * Selects content from the response to be swapped out-of-band
				 */
				'hx-select-oob': {
					type: 'Any',
				},
				/**
				 * Progressively enhances anchor tags and forms to use AJAX
				 */
				'hx-boost': {
					type: 'Boolean',
				},
				/**
				 * Pushes the request URL into the browser location bar, creating a history entry
				 */
				'hx-push-url': {
					type: 'Any',
				},
				/**
				 * Replaces the current URL in the browser location bar without adding to history
				 */
				'hx-replace-url': {
					type: 'Any',
				},
				/**
				 * Includes additional element values in the request
				 */
				'hx-include': {
					type: 'Any',
				},
				/**
				 * Filters which parameters are submitted with the request
				 */
				'hx-params': {
					type: 'Any',
				},
				/**
				 * Adds additional values to the request parameters (JSON or js: prefix)
				 */
				'hx-vals': {
					type: 'Any',
				},
				/**
				 * Adds custom headers to the AJAX request (JSON format)
				 */
				'hx-headers': {
					type: 'Any',
				},
				/**
				 * Changes the request encoding type (e.g., multipart/form-data)
				 */
				'hx-encoding': {
					type: 'Any',
				},
				/**
				 * Configures various aspects of the AJAX request
				 */
				'hx-request': {
					type: 'Any',
				},
				/**
				 * Specifies the element that receives the `htmx-request` class during the request
				 */
				'hx-indicator': {
					type: 'Any',
				},
				/**
				 * Specifies elements that get the `disabled` attribute during the request
				 */
				'hx-disabled-elt': {
					type: 'Any',
				},
				/**
				 * Shows a confirm() dialog before issuing the request
				 */
				'hx-confirm': {
					type: 'Any',
				},
				/**
				 * Shows a prompt() dialog; the user's input is included
				 * in the request as the HX-Prompt header
				 */
				'hx-prompt': {
					type: 'Any',
				},
				/**
				 * Disables attribute inheritance for specified htmx attributes on child elements
				 */
				'hx-disinherit': {
					type: 'Any',
				},
				/**
				 * Explicitly enables attribute inheritance for specified attributes
				 */
				'hx-inherit': {
					type: 'Any',
				},
				/**
				 * Enables htmx extensions for the element and its children
				 */
				'hx-ext': {
					type: 'Any',
				},
				/**
				 * Disables htmx processing for the element and all its children
				 */
				'hx-disable': {
					type: 'Boolean',
				},
				/**
				 * Prevents sensitive data from being saved to the history cache
				 */
				'hx-history': {
					type: 'Any',
				},
				/**
				 * Designates the element as the snapshot/restore target during history navigation
				 */
				'hx-history-elt': {
					type: 'Boolean',
				},
				/**
				 * Preserves an element unchanged across requests (requires an id)
				 */
				'hx-preserve': {
					type: 'Boolean',
				},
				/**
				 * Synchronizes AJAX requests between multiple elements to prevent race conditions
				 */
				'hx-sync': {
					type: 'Any',
				},
				/**
				 * Forces elements to validate themselves before a request is made
				 */
				'hx-validate': {
					type: 'Boolean',
				},
			},
		},
	},
};

export default spec;
