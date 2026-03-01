/**
 * @module @markuplint/datastar-spec
 *
 * Provides Datastar-specific extended specifications for markuplint.
 * Defines Datastar's global attributes (`data-signals`, `data-bind`,
 * `data-on`, `data-text`, `data-show`, `data-ref`, etc.) that are
 * available on any HTML element.
 *
 * Datastar is a hypermedia framework that uses `data-*` attributes
 * exclusively for reactive behavior, event handling, and server
 * communication directly in HTML.
 *
 * @see https://data-star.dev/reference/attributes
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * The Datastar framework extended specification.
 *
 * Registers global Datastar attributes available on every HTML element.
 * Datastar attributes are all global and prefixed with `data-`.
 */
const spec: ExtendedSpec = {
	cites: ['https://data-star.dev/reference/attributes'],
	directivePatterns: [
		/**
		 * Browser plugin event handlers (must precede generic data-on pattern):
		 * data-on-intersect, data-on-interval, data-on-signal-patch,
		 * data-on-raf, data-on-resize
		 * with optional `__modifier` suffixes.
		 * @see https://data-star.dev/reference/attributes#data-on-intersect
		 */
		{
			pattern: '^data-on[-:](?:intersect|interval|signal-patch|raf|resize)(?:__.*)?$',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Event handlers: data-on-click, data-on:keydown, data-on-click__debounce.500ms
		 * Supports both `-` and `:` separators after `on`, and `__modifier` suffixes.
		 * @see https://data-star.dev/reference/attributes#data-on
		 */
		{
			pattern: '^data-on[-:]([a-z]+)(?:__.*)?$',
			potentialName: 'on$1',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Attribute binding: data-attr-href, data-attr:class
		 * Sets the value of any HTML attribute to an expression.
		 * @see https://data-star.dev/reference/attributes#data-attr
		 */
		{
			pattern: '^data-attr[-:]([^_]+)(?:__.*)?$',
			potentialName: '$1',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Class/style binding with suffix: data-class:active, data-style:color
		 * @see https://data-star.dev/reference/attributes#data-class
		 * @see https://data-star.dev/reference/attributes#data-style
		 */
		{
			pattern: '^data-(?:class|style)[-:].+$',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Signal/binding directives with key suffix:
		 * data-signals:foo, data-computed:total, data-bind:name,
		 * data-indicator:loading, data-ref:myEl, data-persist:prefs
		 * @see https://data-star.dev/reference/attributes#data-signals
		 * @see https://data-star.dev/reference/attributes#data-bind
		 */
		{
			pattern: '^data-(?:signals|computed|bind|indicator|ref|persist)[-:].+$',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Static directives with `__modifier` suffix:
		 * data-init__delay.500ms, data-ignore__self, data-persist__session,
		 * data-scroll-into-view__smooth, data-query-string__history, etc.
		 * @see https://data-star.dev/reference/attributes#data-init
		 */
		{
			pattern: '^data-(?:init|ignore|json-signals|scroll-into-view|persist|query-string)__.+$',
			isDirective: true,
		},
	],
	def: {
		'#globalAttrs': {
			'#extends': {
				/**
				 * Sets the value of any HTML attribute to an expression,
				 * and keeps it in sync
				 * @see https://data-star.dev/reference/attributes#data-attr
				 */
				'data-attr': {
					type: 'Any',
				},
				/**
				 * Creates a signal and sets up two-way data binding
				 * between it and an element's value
				 * @see https://data-star.dev/reference/attributes#data-bind
				 */
				'data-bind': {
					type: 'Any',
				},
				/**
				 * Adds or removes a class to or from an element
				 * based on an expression
				 * @see https://data-star.dev/reference/attributes#data-class
				 */
				'data-class': {
					type: 'Any',
				},
				/**
				 * Creates a signal that is computed based on an expression
				 * @see https://data-star.dev/reference/attributes#data-computed
				 */
				'data-computed': {
					type: 'Any',
				},
				/**
				 * Executes an expression on page load and whenever any
				 * signals in the expression change
				 * @see https://data-star.dev/reference/attributes#data-effect
				 */
				'data-effect': {
					type: 'Any',
				},
				/**
				 * Tells Datastar to ignore an element and its descendants
				 * @see https://data-star.dev/reference/attributes#data-ignore
				 */
				'data-ignore': {
					type: 'Boolean',
				},
				/**
				 * Skips processing an element and its children when
				 * morphing elements
				 * @see https://data-star.dev/reference/attributes#data-ignore-morph
				 */
				'data-ignore-morph': {
					type: 'Boolean',
				},
				/**
				 * Creates a signal set to true while a fetch request
				 * is in flight, otherwise false
				 * @see https://data-star.dev/reference/attributes#data-indicator
				 */
				'data-indicator': {
					type: 'Any',
				},
				/**
				 * Runs an expression when the attribute is initialized
				 * @see https://data-star.dev/reference/attributes#data-init
				 */
				'data-init': {
					type: 'Any',
				},
				/**
				 * Sets text content to a reactive JSON stringified
				 * version of signals
				 * @see https://data-star.dev/reference/attributes#data-json-signals
				 */
				'data-json-signals': {
					type: 'Any',
				},
				/**
				 * Runs an expression when the element intersects
				 * with the viewport
				 * @see https://data-star.dev/reference/attributes#data-on-intersect
				 */
				'data-on-intersect': {
					type: 'Any',
				},
				/**
				 * Runs an expression at a regular interval
				 * @see https://data-star.dev/reference/attributes#data-on-interval
				 */
				'data-on-interval': {
					type: 'Any',
				},
				/**
				 * Runs an expression whenever any signals are patched
				 * @see https://data-star.dev/reference/attributes#data-on-signal-patch
				 */
				'data-on-signal-patch': {
					type: 'Any',
				},
				/**
				 * Filters which signals to watch with data-on-signal-patch
				 * @see https://data-star.dev/reference/attributes#data-on-signal-patch-filter
				 */
				'data-on-signal-patch-filter': {
					type: 'Any',
				},
				/**
				 * Preserves the value of an attribute when morphing DOM elements
				 * @see https://data-star.dev/reference/attributes#data-preserve-attr
				 */
				'data-preserve-attr': {
					type: 'Any',
				},
				/**
				 * Creates a new signal that is a reference to the element
				 * @see https://data-star.dev/reference/attributes#data-ref
				 */
				'data-ref': {
					type: 'Any',
				},
				/**
				 * Shows or hides an element based on whether an expression
				 * evaluates to true or false
				 * @see https://data-star.dev/reference/attributes#data-show
				 */
				'data-show': {
					type: 'Any',
				},
				/**
				 * Patches (adds, updates or removes) one or more signals
				 * @see https://data-star.dev/reference/attributes#data-signals
				 */
				'data-signals': {
					type: 'Any',
				},
				/**
				 * Sets the value of inline CSS styles on an element
				 * based on an expression
				 * @see https://data-star.dev/reference/attributes#data-style
				 */
				'data-style': {
					type: 'Any',
				},
				/**
				 * Binds the text content of an element to an expression
				 * @see https://data-star.dev/reference/attributes#data-text
				 */
				'data-text': {
					type: 'Any',
				},

				// ───── Pro Attributes ─────

				/**
				 * Animates element attributes over time reactively
				 * @see https://data-star.dev/reference/attributes#data-animate
				 */
				'data-animate': {
					type: 'Any',
				},
				/**
				 * Allows you to add custom validity to an element
				 * using an expression
				 * @see https://data-star.dev/reference/attributes#data-custom-validity
				 */
				'data-custom-validity': {
					type: 'Any',
				},
				/**
				 * Runs an expression on every requestAnimationFrame event
				 * @see https://data-star.dev/reference/attributes#data-on-raf
				 */
				'data-on-raf': {
					type: 'Any',
				},
				/**
				 * Runs an expression whenever an element's dimensions change
				 * @see https://data-star.dev/reference/attributes#data-on-resize
				 */
				'data-on-resize': {
					type: 'Any',
				},
				/**
				 * Persists signals in local storage
				 * @see https://data-star.dev/reference/attributes#data-persist
				 */
				'data-persist': {
					type: 'Any',
				},
				/**
				 * Syncs query string params to signal values on page load
				 * @see https://data-star.dev/reference/attributes#data-query-string
				 */
				'data-query-string': {
					type: 'Any',
				},
				/**
				 * Replaces the URL in the browser without reloading the page
				 * @see https://data-star.dev/reference/attributes#data-replace-url
				 */
				'data-replace-url': {
					type: 'Any',
				},
				/**
				 * Creates a Rocket web component for server communication
				 * @see https://data-star.dev/reference/attributes#data-rocket
				 */
				'data-rocket': {
					type: 'Any',
				},
				/**
				 * Scrolls the element into view
				 * @see https://data-star.dev/reference/attributes#data-scroll-into-view
				 */
				'data-scroll-into-view': {
					type: 'Boolean',
				},
				/**
				 * Sets the view-transition-name style attribute explicitly
				 * @see https://data-star.dev/reference/attributes#data-view-transition
				 */
				'data-view-transition': {
					type: 'Any',
				},
			},
		},
	},
};

export default spec;
