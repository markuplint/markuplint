import React from 'react';
import { graphql, Link } from 'gatsby';
import { Helmet } from 'react-helmet';
import Layout from '../layouts';
import Hero from '../components/hero';
import styled from 'styled-components';

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

const Nav = styled.div`
	ul {
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 0;
		padding: 1em 0;

		li {
			display: flex;
			align-items: center;
			margin: 0;
			padding: 0;

			&:not(:last-child)::after {
				content: '/';
				display: block;
				color: var(--primary-text-color-pale);
				margin: 0 1em;
			}

			a {
				display: block;
				text-decoration: none;

				&:hover {
					text-decoration: underline;
				}
			}
		}
	}
`;

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
			<Helmet
				htmlAttributes={{
					lang: 'en',
				}}
			>
				<title>{props.data.site.siteMetadata.siteName}</title>
			</Helmet>
			<Layout>
				<Hero />
				<Nav>
					<ul>
						<li>
							<Link to="/playground">Playground</Link>
						</li>
						<li>
							<Link to="/rules">Rules</Link>
						</li>
					</ul>
				</Nav>
			</Layout>
		</>
	);
});
