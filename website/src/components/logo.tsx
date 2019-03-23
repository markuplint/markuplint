import React from 'react';
import styled from 'styled-components';
import { StaticQuery, graphql } from 'gatsby';

const Style = styled.div`
	img {
		width: auto;
		height: 2em;
		display: block;
	}
`;

interface Props {
	file: {
		publicURL: string;
	};
}

const Logo: React.FunctionComponent = () => {
	return (
		<StaticQuery
			query={graphql`
				query {
					file(name: { eq: "logo-v" }) {
						publicURL
					}
				}
			`}
			render={(props: Props) => (
				<Style>
					<img src={props.file.publicURL} alt="markuplint" />
				</Style>
			)}
		/>
	);
};

export default Logo;
