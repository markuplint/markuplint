import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * @see https://htmx.org/extensions/#reference
 */
const extensionList = new Set([
	'ajax-header',
	'alpine-morph',
	'class-tools',
	'client-side-templates',
	'debug',
	'event-header',
	'head-support',
	'include-vals', // cspell: disable-line
	'json-enc',
	'idiomorph', // cspell: disable-line
	'loading-states',
	'method-override',
	'morphdom-swap',
	'multi-swap',
	'path-deps',
	'preload',
	'remove-me',
	'response-targets',
	'restored',
	'server-sent-events',
	'web-sockets',
	'path-params',
]);

const spec: ExtendedSpec = {
	def: {
		'#globalAttrs': {
			'#extends': {
				/**
				 * @see https://htmx.org/attributes/hx-boost/
				 */
				'hx-boost': {
					type: {
						enum: ['true', 'false'],
					},
				},

				/**
				 * @see https://htmx.org/attributes/hx-confirm/
				 */
				'hx-confirm': {
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-delete/
				 */
				'hx-delete': {
					type: 'URL',
				},

				/**
				 * @see https://htmx.org/attributes/hx-disable/
				 */
				'hx-disable': {
					type: 'Boolean',
				},

				/**
				 * @see https://htmx.org/attributes/hx-disabled-elt/
				 */
				'hx-disabled-elt': {
					type: [
						'<complex-selector-list>',
						{
							enum: ['this'],
						},
						{
							directive: [String.raw`/^closest\s+(?<token>.+)$/`],
							token: '<complex-selector-list>',
						},
					],
				},

				/**
				 * @see https://htmx.org/attributes/hx-disinherit/
				 */
				'hx-disinherit': {
					type: {
						separator: 'space',
						allowEmpty: false,
						unique: true,
						caseInsensitive: true,
						token: {
							enum: [
								'*',
								'hx-boost',
								'hx-confirm',
								'hx-delete',
								'hx-disable',
								'hx-get',
								'hx-headers',
								'hx-history-elt',
								'hx-history',
								'hx-include',
								'hx-indicator',
								'hx-on',
								'hx-params',
								'hx-patch',
								'hx-post',
								'hx-preserve',
								'hx-prompt',
								'hx-push-url',
								'hx-put',
								'hx-replace-url',
								'hx-request',
								'hx-select-oob',
								'hx-select',
								'hx-sse',
								'hx-swap-oob',
								'hx-swap',
								'hx-sync',
								'hx-target',
								'hx-trigger',
								'hx-validate',
								'hx-vals', // cspell: disable-line
								'hx-vars',
								'hx-ws',
							],
						},
					},
				},

				/**
				 * @see https://htmx.org/attributes/hx-encoding/
				 */
				'hx-encoding': {
					type: {
						enum: ['multipart/form-data'],
					},
				},

				/**
				 * @see https://htmx.org/attributes/hx-ext/
				 */
				'hx-ext': {
					type: {
						separator: 'comma',
						allowEmpty: false,
						unique: true,
						caseInsensitive: true,
						token: {
							enum: [
								//
								...extensionList,
								// ignore:*
								...[...extensionList].map(ext => `ignore:${ext}`),
							] as unknown as [string, ...string[]],
						},
					},
				},

				/**
				 * @see https://htmx.org/attributes/hx-get/
				 */
				'hx-get': {
					type: 'URL',
				},

				/**
				 * @see https://htmx.org/attributes/hx-headers/
				 */
				'hx-headers': {
					type: 'JSON',
				},

				/**
				 * @see https://htmx.org/attributes/hx-history-elt/
				 */
				'hx-history-elt': {
					type: 'Boolean',
				},

				/**
				 * @see https://htmx.org/attributes/hx-history/
				 */
				'hx-history': {
					type: {
						enum: ['false'],
					},
				},

				/**
				 * @see https://htmx.org/attributes/hx-include/
				 */
				'hx-include': {
					type: [
						'<complex-selector-list>',
						{
							enum: ['this'],
						},
						{
							directive: [
								String.raw`/^closest\s+(?<token>.+)$/`,
								String.raw`/^find\s+(?<token>.+)$/`,
								String.raw`/^next\s+(?<token>.+)$/`,
								String.raw`/^previous\s+(?<token>.+)$/`,
							],
							token: '<complex-selector-list>',
						},
					],
				},

				/**
				 * @see https://htmx.org/attributes/hx-indicator/
				 */
				'hx-indicator': {
					type: [
						'<complex-selector-list>',
						{
							directive: [
								String.raw`/^closest\s+(?<token>.+)$/`,
								String.raw`/^previous\s+(?<token>.+)$/`,
							],
							token: '<complex-selector-list>',
						},
					],
				},

				/**
				 * Note:
				 *  - `hx-on:*` is evaluated by the parser
				 *
				 * @see https://htmx.org/attributes/hx-on/
				 */
				'hx-on': {
					type: 'Any',
					deprecated: true,
				},

				/**
				 * @see https://htmx.org/attributes/hx-params/
				 */
				'hx-params': {
					// Too complex to define
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-patch/
				 */
				'hx-patch': {
					type: 'URL',
				},

				/**
				 * @see https://htmx.org/attributes/hx-post/
				 */
				'hx-post': {
					type: 'URL',
				},

				/**
				 * @see https://htmx.org/attributes/hx-preserve/
				 * @see https://github.com/bigskysoftware/htmx/blob/57595bc0390b6ed98ada45a5d27156322e308757/src/ext/head-support.js#L56
				 */
				'hx-preserve': {
					type: {
						enum: ['true'],
					},
				},

				/**
				 * @see https://htmx.org/attributes/hx-prompt/
				 */
				'hx-prompt': {
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-push-url/
				 */
				'hx-push-url': {
					type: [
						'URL',
						{
							enum: ['true', 'false'],
						},
					],
				},

				/**
				 * @see https://htmx.org/attributes/hx-put/
				 */
				'hx-put': {
					type: 'URL',
				},

				/**
				 * @see https://htmx.org/attributes/hx-replace-url/
				 */
				'hx-replace-url': {
					type: [
						'URL',
						{
							enum: ['true', 'false'],
						},
					],
				},

				/**
				 * @see https://htmx.org/attributes/hx-request/
				 */
				'hx-request': {
					// Too complex to define
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-select-oob/
				 */
				'hx-select-oob': {
					// Too complex to define
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-select/
				 */
				'hx-select': {
					type: '<complex-selector-list>',
				},

				/**
				 * @see https://htmx.org/attributes/hx-sse/
				 */
				'hx-sse': {
					// Too complex to define
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-swap-oob/
				 */
				'hx-swap-oob': {
					// Too complex to define
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-swap/
				 */
				'hx-swap': {
					// Too complex to define
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-sync/
				 */
				'hx-sync': {
					// Too complex to define
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-target/
				 */
				'hx-target': {
					type: [
						'<complex-selector-list>',
						{
							enum: ['this', 'next', 'previous'],
						},
						{
							directive: [
								String.raw`/^closest\s+(?<token>.+)$/`,
								String.raw`/^find\s+(?<token>.+)$/`,
								String.raw`/^next\s+(?<token>.+)$/`,
								String.raw`/^previous\s+(?<token>.+)$/`,
							],
							token: '<complex-selector-list>',
						},
					],
				},

				/**
				 * @see https://htmx.org/attributes/hx-trigger/
				 */
				'hx-trigger': {
					// Too complex to define
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-validate/
				 */
				'hx-validate': {
					type: {
						enum: ['true', 'false'],
					},
				},

				/**
				 * @see https://htmx.org/attributes/hx-vals/
				 */
				// cspell: disable-next-line
				'hx-vals': {
					type: [
						'JSON',
						{
							directive: ['/^js:(?<token>.+)$/', '/^javascript:(?<token>.+)$/'],
							// Too complex to define: Specify a returned object from the JavaScript function
							token: 'Any',
						},
					],
				},

				/**
				 * @see https://htmx.org/attributes/hx-vars/
				 */
				'hx-vars': {
					// Too complex to define: Specify a returned object from the JavaScript function
					type: 'Any',
				},

				/**
				 * @see https://htmx.org/attributes/hx-ws/
				 */
				'hx-ws': {
					// Too complex to define
					type: 'Any',
				},
			},
		},
	},
};

export default spec;
