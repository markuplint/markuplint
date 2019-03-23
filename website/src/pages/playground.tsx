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

interface S {
	loaded: boolean;
}

class E extends React.Component<{}, S> {
	state: S = {
		loaded: false,
	};

	e = null;

	componentDidMount() {
		import('../components/editor').then(e => {
			// @ts-ignore
			this.e = e;
			this.setState({ loaded: true });
		});
	}

	render() {
		// @ts-ignore
		const Editor = this.e && this.e.default;
		// @ts-ignore
		return Editor ? <Editor /> : null;
	}
}

export default React.memo((props: PageProps) => {
	return (
		<>
			<Helmet>
				<title>Playground | {props.data.site.siteMetadata.siteName}</title>
			</Helmet>
			<Layout>
				<h1>Playground</h1>
				<E />
			</Layout>
		</>
	);
});
