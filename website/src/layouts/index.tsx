import React from 'react';
import styled from 'styled-components';
import Header from '../components/header';

const Grid = styled.div`
	display: grid;
	grid-template-areas:
		'header header'
		'side   main'
		'footer footer';
	grid-template-rows: auto 1fr auto;
	grid-template-columns: auto 1fr;
`;

const GridHeader = styled.div`
	grid-area: header;
`;

const GridSide = styled.div`
	grid-area: side;
`;

const GridMain = styled.div`
	grid-area: main;
`;

const GridFooter = styled.div`
	grid-area: footer;
`;

interface LayoutProps {
	side?: React.ReactNode;
}

const Layout: React.FunctionComponent<LayoutProps> = ({ children: page, side }) => {
	return (
		<Grid>
			<GridHeader>
				<Header />
			</GridHeader>
			{side ? <GridSide>{side}</GridSide> : null}
			<GridMain>
				<main role="main">{page}</main>
			</GridMain>
			<GridFooter>
				<footer role="contentinfo">
					<small>Copyright©{new Date().getFullYear()} markuplint. Under the MIT License.</small>
				</footer>
			</GridFooter>
		</Grid>
	);
};

export default Layout;
