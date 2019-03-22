const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);

exports.onCreateNode = ({ node, getNode, actions }) => {
	const { createNodeField } = actions;
	if (node.internal.type === `MarkdownRemark`) {
		const filePath = createFilePath({ node, getNode, basePath: `pages` });
		createNodeField({
			node,
			name: `rule`,
			value: filePath,
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
						}
					}
				}
			}
		}
	`).then(result => {
		result.data.allMarkdownRemark.edges.forEach(({ node }) => {
			const rule = node.fields.rule;
			const [_, ruleName, lang] = rule.match(/\/?([a-z0-9_-]+)\/readme(?:\.([a-z-]+))?/i) || [];
			const pagePath = (lang ? `/${lang}` : '') + `/rules/${ruleName}/`;
			createPage({
				path: pagePath,
				component: path.resolve(__dirname, `src/templates/rule.tsx`),
				context: {
					rule,
				},
			});
		});
	});
};
