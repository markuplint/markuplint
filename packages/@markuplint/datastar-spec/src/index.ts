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
 * @see https://data-star.dev/reference/plugins_core
 */

import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * The Datastar framework extended specification.
 *
 * Registers global Datastar attributes available on every HTML element.
 * Datastar attributes are all global and prefixed with `data-`.
 */
const spec: ExtendedSpec = {
	cites: ['https://data-star.dev/reference/plugins_core'],
	directivePatterns: [
		/**
		 * Event handlers: data-on-click, data-on:keydown, data-on-click__debounce.500ms
		 * Supports both `-` and `:` separators after `on`, and `__modifier` suffixes.
		 * @see https://data-star.dev/reference/plugins_dom#on
		 */
		{
			pattern: '^data-on[-:]([a-z]+)(?:__.*)?$',
			potentialName: 'on$1',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Attribute binding: data-attr-href, data-attr:class
		 * Binds HTML attributes via expressions.
		 * @see https://data-star.dev/reference/plugins_dom#attr
		 */
		{
			pattern: '^data-attr[-:]([^_]+)(?:__.*)?$',
			potentialName: '$1',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Class/style binding with suffix: data-class:active, data-style:color
		 * @see https://data-star.dev/reference/plugins_dom#class
		 * @see https://data-star.dev/reference/plugins_dom#style
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
		 * @see https://data-star.dev/reference/plugins_core#signals
		 * @see https://data-star.dev/reference/plugins_dom#bind
		 */
		{
			pattern: '^data-(?:signals|computed|bind|indicator|ref|persist)[-:].+$',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Browser plugin event handlers:
		 * data-on-intersect, data-on-interval, data-on-signal-patch,
		 * data-on-raf, data-on-resize
		 * with optional `__modifier` suffixes.
		 * @see https://data-star.dev/reference/plugins_browser
		 */
		{
			pattern: '^data-on[-:](?:intersect|interval|signal-patch|raf|resize)(?:__.*)?$',
			isDirective: true,
			isDynamicValue: true,
		},
		/**
		 * Static directives with `__modifier` suffix:
		 * data-init__delay.500ms, data-ignore__self, data-persist__local,
		 * data-scroll-into-view__smooth, data-query-string__push, etc.
		 * @see https://data-star.dev/reference/plugins_core
		 */
		{
			pattern: '^data-(?:init|ignore|json-signals|scroll-into-view|persist|query-string)__.+$',
			isDirective: true,
		},
	],
	def: {
		'#globalAttrs': {
			'#extends': {
				// ───── Core Plugin ─────

				/**
				 * Defines reactive signals (state) on the element
				 * @see https://data-star.dev/reference/plugins_core#signals
				 */
				'data-signals': {
					type: 'Any',
				},
				/**
				 * Defines read-only computed signals derived from other signals
				 * @see https://data-star.dev/reference/plugins_core#computed
				 */
				'data-computed': {
					type: 'Any',
				},
				/**
				 * Runs an initialization expression when the element is first processed
				 * @see https://data-star.dev/reference/plugins_core#init
				 */
				'data-init': {
					type: 'Any',
				},
				/**
				 * Runs a reactive side-effect expression whenever its dependencies change
				 * @see https://data-star.dev/reference/plugins_core#effect
				 */
				'data-effect': {
					type: 'Any',
				},

				// ───── DOM Plugin ─────

				/**
				 * Sets HTML attributes via an expression or object
				 * @see https://data-star.dev/reference/plugins_dom#attr
				 */
				'data-attr': {
					type: 'Any',
				},
				/**
				 * Two-way data binding between a form element and a signal
				 * @see https://data-star.dev/reference/plugins_dom#bind
				 */
				'data-bind': {
					type: 'Any',
				},
				/**
				 * Conditionally applies CSS classes based on expressions
				 * @see https://data-star.dev/reference/plugins_dom#class
				 */
				'data-class': {
					type: 'Any',
				},
				/**
				 * Sets reactive inline styles on the element
				 * @see https://data-star.dev/reference/plugins_dom#style
				 */
				'data-style': {
					type: 'Any',
				},
				/**
				 * Sets the text content of the element reactively
				 * @see https://data-star.dev/reference/plugins_dom#text
				 */
				'data-text': {
					type: 'Any',
				},
				/**
				 * Conditionally shows or hides the element
				 * @see https://data-star.dev/reference/plugins_dom#show
				 */
				'data-show': {
					type: 'Any',
				},
				/**
				 * Prevents Datastar from processing this element and its children
				 * @see https://data-star.dev/reference/plugins_dom#ignore
				 */
				'data-ignore': {
					type: 'Boolean',
				},
				/**
				 * Prevents the element from being morphed during DOM updates
				 * @see https://data-star.dev/reference/plugins_dom#ignore-morph
				 */
				'data-ignore-morph': {
					type: 'Boolean',
				},
				/**
				 * Creates a signal reference to the element
				 * @see https://data-star.dev/reference/plugins_dom#ref
				 */
				'data-ref': {
					type: 'Any',
				},

				// ───── Browser Plugin ─────

				/**
				 * Tracks fetch/request status via an indicator signal
				 * @see https://data-star.dev/reference/plugins_browser#indicator
				 */
				'data-indicator': {
					type: 'Any',
				},
				/**
				 * Handles viewport intersection events
				 * @see https://data-star.dev/reference/plugins_browser#on-intersect
				 */
				'data-on-intersect': {
					type: 'Any',
				},
				/**
				 * Executes expressions at a regular interval
				 * @see https://data-star.dev/reference/plugins_browser#on-interval
				 */
				'data-on-interval': {
					type: 'Any',
				},
				/**
				 * Handles signal change events
				 * @see https://data-star.dev/reference/plugins_browser#on-signal-patch
				 */
				'data-on-signal-patch': {
					type: 'Any',
				},
				/**
				 * Filters which signal changes trigger the handler
				 * @see https://data-star.dev/reference/plugins_browser#on-signal-patch
				 */
				'data-on-signal-patch-filter': {
					type: 'Any',
				},
				/**
				 * Preserves specified attributes during DOM morphing
				 * @see https://data-star.dev/reference/plugins_browser#preserve-attr
				 */
				'data-preserve-attr': {
					type: 'Any',
				},
				/**
				 * Displays signals as JSON for debugging
				 * @see https://data-star.dev/reference/plugins_browser#json-signals
				 */
				'data-json-signals': {
					type: 'Any',
				},

				// ───── Pro Plugins ─────

				/**
				 * Animates the element
				 * @see https://data-star.dev/reference/plugins_pro#animate
				 */
				'data-animate': {
					type: 'Any',
				},
				/**
				 * Sets custom form validation messages
				 * @see https://data-star.dev/reference/plugins_pro#custom-validity
				 */
				'data-custom-validity': {
					type: 'Any',
				},
				/**
				 * Handles requestAnimationFrame events
				 * @see https://data-star.dev/reference/plugins_pro#on-raf
				 */
				'data-on-raf': {
					type: 'Any',
				},
				/**
				 * Handles element resize events via ResizeObserver
				 * @see https://data-star.dev/reference/plugins_pro#on-resize
				 */
				'data-on-resize': {
					type: 'Any',
				},
				/**
				 * Persists signal values across page loads
				 * @see https://data-star.dev/reference/plugins_pro#persist
				 */
				'data-persist': {
					type: 'Any',
				},
				/**
				 * Synchronizes signals with URL query parameters
				 * @see https://data-star.dev/reference/plugins_pro#query-string
				 */
				'data-query-string': {
					type: 'Any',
				},
				/**
				 * Replaces the current URL without navigation
				 * @see https://data-star.dev/reference/plugins_pro#replace-url
				 */
				'data-replace-url': {
					type: 'Any',
				},
				/**
				 * Rocket web component for server communication
				 * @see https://data-star.dev/reference/plugins_pro#rocket
				 */
				'data-rocket': {
					type: 'Any',
				},
				/**
				 * Scrolls the element into the viewport
				 * @see https://data-star.dev/reference/plugins_pro#scroll-into-view
				 */
				'data-scroll-into-view': {
					type: 'Boolean',
				},
				/**
				 * Sets the view-transition-name for the element
				 * @see https://data-star.dev/reference/plugins_pro#view-transition
				 */
				'data-view-transition': {
					type: 'Any',
				},
			},
		},
	},
};

export default spec;
