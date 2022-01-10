import { createRule } from '@markuplint/ml-core';

/**
 * Step 0-1. Define the type of principal value
 *
 * You can define it as either `string` or `number` or `boolean` or `Array`.
 * If you define a complex structure, you should define `boolean` to this
 * and define that structure to the options.
 */
type MainValue = string;

/**
 * Step 0-2. Define the type of options
 *
 * You can define it as an _Object_. Set `null` if it is empty.
 */
type Options = {
	foo?: string;
	bar?: number[];
};

export default createRule<MainValue, Options>({
	/**
	 * Step 1-1. Choose the severity from `error` or `warning`
	 *
	 * Deafult is `error`
	 */
	defaultServerity: 'error',

	/**
	 * Step 1-2. Set the default principal value
	 *
	 * It adopts this value in the evaluation
	 * if it sets `true` or undefined (in other words, it doesn't set)
	 * to the configuration.
	 */
	defaultValue: '__DEFAULT_MAIN_VALUE__',

	/**
	 * Step 1-3. Set the default options
	 *
	 * It adopts this value in the evaluation
	 * if it doesn't set to the configuration.
	 */
	defaultOptions: {},

	/**
	 * Step 2. Write a process.
	 *
	 * @param context
	 */
	async verify({ document, report, t }) {
		/**
		 * Example: Use `walk` method to traverse the node tree
		 */
		await document.walk(node => {
			/**
			 * Example: Compare the type of the node to filter it
			 */
			if (node.type !== 'Comment') {
				return;
			}

			/**
			 * Example: Access the property of the node to get needed data
			 */
			const commentText = node.raw.trim();

			/**
			 * Example: Compare data according to your design to report the violation
			 */
			if (/^<!--\s*todo:/i.test(commentText)) {
				/**
				 * Example: It delivers the violation to the linter engine
				 *
				 * This `report` method can call many times.
				 */
				report({
					/**
					 * Example: Define the scope.
					 *
					 * Set the _node_ that gives
					 * the location (line number and column number)
					 * to the linter engine.
					 */
					scope: node,

					/**
					 * Example: The message that is output to a user.
					 *
					 * You can set just strings without through the translator.
					 */
					message: t('It is {0}', 'TODO'),
				});
			}
		});
	},
});
