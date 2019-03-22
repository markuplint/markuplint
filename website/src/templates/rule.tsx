import React from 'react';
import { graphql, Link } from 'gatsby';
import Layout from '../layouts';
import { Helmet } from 'react-helmet';

interface RuleTmplProps {
	data: {
		markdownRemark: {
			html: string;
			frontmatter: {
				title: string;
			};
		};
		allSitePage: {
			edges: {
				node: { path: string; id: string };
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

		allSitePage(filter: { path: { regex: "/^/rules//i" } }) {
			edges {
				node {
					path
					id
				}
			}
		}
	}
`;

const Rule: React.FunctionComponent<RuleTmplProps> = ({ data }) => {
	const { markdownRemark, allSitePage } = data;
	const { html, frontmatter } = markdownRemark;
	const { title } = frontmatter;
	const { edges } = allSitePage;
	return (
		<>
			<Helmet>
				<title>{title}</title>
			</Helmet>
			<Layout
				side={
					<nav role="navigation">
						<ul>
							{edges.map(edge => (
								<li key={edge.node.id}>
									<Link to={edge.node.path}>{edge.node.path}</Link>
								</li>
							))}
						</ul>
					</nav>
				}
			>
				<div>
					<h1>{title}</h1>
					<div dangerouslySetInnerHTML={{ __html: html }} />
				</div>
			</Layout>
		</>
	);
};

export default Rule;
