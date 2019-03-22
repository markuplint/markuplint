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
	};
}

export const pageQuery = graphql`
	query {
		site {
			siteMetadata {
				siteName
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
				<h1>Playground</h1>
				<p>🚧 Work in progress</p>
			</Layout>
		</>
	);
});
