import React from 'react';
import { graphql, Link } from 'gatsby';
import Layout from '../layouts';
import { Helmet } from 'react-helmet';
import NavSide from '../components/nav-side';

interface RuleTmplProps {
	data: {
		markdownRemark: {
			html: string;
			frontmatter: {
				title: string;
			};
		};
		allMarkdownRemark: {
			edges: {
				node: {
					id: string;
					frontmatter: {
						title: string;
					};
					fields: { rule: string; page: string };
				};
			}[];
		};
	};
}

export const query = graphql`
	query($rule: String!) {
		markdownRemark(fields: { rule: { eq: $rule } }) {
			html
			frontmatter {
				title
			}
		}

		allMarkdownRemark(filter: { fields: { page: { regex: "/^/rules//i" } } }) {
			edges {
				node {
					id
					frontmatter {
						title
					}
					fields {
						rule
						page
					}
				}
			}
		}
	}
`;

const Rule: React.FunctionComponent<RuleTmplProps> = ({ data }) => {
	const { markdownRemark, allMarkdownRemark } = data;
	const { html, frontmatter } = markdownRemark;
	const { title } = frontmatter;
	const { edges } = allMarkdownRemark;
	return (
		<>
			<Helmet>
				<title>{title}</title>
			</Helmet>
			<Layout
				side={
					<NavSide
						heading={{
							id: 'rule',
							path: '/rules',
							title: 'Rules',
						}}
						links={edges.map(edge => ({
							id: edge.node.id,
							path: edge.node.fields.page,
							title: edge.node.frontmatter.title,
						}))}
					/>
				}
			>
				<div dangerouslySetInnerHTML={{ __html: html }} />
			</Layout>
		</>
	);
};

export default Rule;
