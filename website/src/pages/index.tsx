import React from 'react';
import { graphql, Link } from 'gatsby';
import { Helmet } from 'react-helmet';
import Layout from '../layouts';

interface IndexPageProps {
	data: {
		site: {
			siteMetadata: {
				siteName: string;
				navigation: string;
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

export default React.memo((props: IndexPageProps) => {
	return (
		<>
			<Helmet>
				<title>{props.data.site.siteMetadata.siteName}</title>
			</Helmet>
			<Layout>
				<h1>hello {props.data.site.siteMetadata.siteName}</h1>
				<ul>
					<li>
						<Link to="/playground">Playground</Link>
					</li>
					<li>
						<Link to="/rules">Rules</Link>
					</li>
				</ul>
			</Layout>
		</>
	);
});
