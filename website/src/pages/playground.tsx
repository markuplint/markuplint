import React from 'react';
import { graphql, Link } from 'gatsby';
import { Helmet } from 'react-helmet';
import Layout from '../layouts';
import styled from 'styled-components';
import loadable from '@loadable/component';

const Editor = loadable(() => import('../components/editor'));

const EditorFallback = styled.div`
	height: 500px;
	margin: 0 0 2em;
	/* monaco editor */
	background: #1e1e1e;
	color: #fff;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', 'HelveticaNeue-Light', 'Ubuntu',
		'Droid Sans', sans-serif;
	font-size: 12px;
	padding: 1em;
`;

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
				<Editor fallback={<EditorFallback>Editor is booting...</EditorFallback>} />
			</Layout>
		</>
	);
});
