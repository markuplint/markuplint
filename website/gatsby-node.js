const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);

exports.onCreateNode = ({ node, getNode, actions }) => {
	const { createNodeField } = actions;
	if (node.internal.type === `MarkdownRemark`) {
		const filePath = createFilePath({ node, getNode, basePath: `pages` });
		const [_, ruleName, lang] = filePath.match(/\/?([a-z0-9_-]+)\/readme(?:\.([a-z-]+))?/i) || [];
		const pagePath = (lang ? `/${lang}` : '') + `/rules/${ruleName}/`;
		createNodeField({
			node,
			name: `rule`,
			value: filePath,
		});
		createNodeField({
			node,
			name: `page`,
			value: pagePath,
		});
	}
};

exports.createPages = ({ graphql, actions }) => {
	const { createPage } = actions;
	return graphql(`
		{
			allMarkdownRemark {
				edges {
					node {
						fields {
							rule
							page
						}
					}
				}
			}
		}
	`).then(result => {
		result.data.allMarkdownRemark.edges.forEach(({ node }) => {
			const { rule, page } = node.fields;
			createPage({
				path: page,
				component: path.resolve(__dirname, `src/templates/rule.tsx`),
				context: {
					rule,
				},
			});
		});
	});
};

const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
exports.onCreateWebpackConfig = ({ stage, rules, loaders, plugins, actions }) => {
	actions.setWebpackConfig({
		plugins: [
			new MonacoWebpackPlugin({
				// available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
				languages: ['html'],
			}),
		],
	});
};
