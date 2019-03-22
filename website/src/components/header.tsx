import React from 'react';
import styled from 'styled-components';

const Style = styled.div`
	header {
		background: #0071bc;
		color: #fff;
	}
`;

const Header: React.FunctionComponent = () => {
	return (
		<Style>
			<header role="banner">
				<div>
					<img src="" alt="markuplint" />
				</div>
			</header>
		</Style>
	);
};

export default Header;
