import React from 'react';
import { graphql, Link } from 'gatsby';
import { Helmet } from 'react-helmet';
import Layout from '../layouts';

interface PageProps {
	data: {
		site: {
			siteMetadata: {
				siteName: string;
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

export const pageQuery = graphql`
	query {
		site {
			siteMetadata {
				siteName
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

export default React.memo((props: PageProps) => {
	return (
		<>
			<Helmet>
				<title>Playground | {props.data.site.siteMetadata.siteName}</title>
			</Helmet>
			<Layout>
				<h1>Rules</h1>
				<ul>
					{props.data.allMarkdownRemark.edges.map(edge => (
						<li key={edge.node.id}>
							<Link to={edge.node.fields.page}>{edge.node.frontmatter.title}</Link>
						</li>
					))}
				</ul>
			</Layout>
		</>
	);
});
