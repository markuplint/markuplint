import React from 'react';
import styled from 'styled-components';
import Header from '../components/header';
import Footer from '../components/footer';
import 'normalize.css';
import './index.css';

const Grid = styled.div`
	display: grid;
	grid-template-areas:
		'header header'
		'side   main'
		'footer footer';
	grid-template-rows: auto 1fr auto;
	grid-template-columns: auto 1fr;
	min-height: 100vh;
`;

const GridHeader = styled.div`
	grid-area: header;
`;

const GridSide = styled.div`
	grid-area: side;
	padding: 0;
`;

const GridMain = styled.div`
	grid-area: main;
	padding: 0 2em 2em;

	main {
		max-width: 800px;
		margin: 0 auto;
	}
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
				<Footer />
			</GridFooter>
		</Grid>
	);
};

export default Layout;
