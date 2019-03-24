import React from 'react';
import styled from 'styled-components';
import { StaticQuery, graphql } from 'gatsby';

const Style = styled.div`
	position: relative;
	top: 0;
	left: 50%;
	width: 100vw;
	transform: translate(-50%, 0);
	color: var(--lightest-color);
	padding: 4em 2em;
	text-align: center;
	overflow: hidden;

	background-color: var(--primary-color);
	background-image: linear-gradient(
			to right bottom,
			transparent 0,
			transparent 50%,
			var(--primary-color) 50.1%,
			var(--primary-color) 100%
		),
		linear-gradient(to right, var(--primary-color), var(--primary-color-dark));
	background-position: center top;
	background-repeat: no-repeat;
	background-size: 100% 100%;

	h1 {
		position: relative;
		font-size: 5rem;
		font-weight: 100;
		letter-spacing: -0.04em;
		margin-top: 0;
	}

	p {
		position: relative;
		font-size: 2rem;
		opacity: 0.8;
		margin-bottom: 0;
	}
`;

interface Props {
	site: {
		siteMetadata: {
			name: string;
			description: string;
		};
	};
}

const Hero: React.FunctionComponent = () => {
	return (
		<StaticQuery
			query={graphql`
				query {
					site {
						siteMetadata {
							name
							description
						}
					}
				}
			`}
			render={(props: Props) => (
				<Style>
					<h1>{props.site.siteMetadata.name}</h1>
					<p>{props.site.siteMetadata.description}</p>
				</Style>
			)}
		/>
	);
};

export default Hero;
