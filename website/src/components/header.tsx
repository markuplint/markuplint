import React from 'react';
import { Link } from 'gatsby';
import styled from 'styled-components';
import Logo from './logo';

const Style = styled.div`
	header {
		display: flex;
		justify-content: space-between;
		align-items: stretch;
		background: var(--header-color);
		padding: 1em;

		a {
			display: block;
			color: var(--primary-text-color);
			text-decoration: none;
		}

		nav {
			ul {
				display: flex;
				margin: 0;
				padding: 0;
				align-items: center;
				height: 100%;

				li {
					display: block;
					margin: 0 0.5em;
					padding: 0;
				}
			}
		}
	}
`;

const Header: React.FunctionComponent = () => {
	return (
		<Style>
			<header role="banner">
				<Link to="/">
					<Logo />
				</Link>
				<nav role="navigation" aria-label="メインメニュー">
					<ul role="list">
						<li role="listitem">
							<Link to="/playground">Playground</Link>
						</li>
						<li role="listitem">
							<Link to="/rules">Rules</Link>
						</li>
					</ul>
				</nav>
			</header>
		</Style>
	);
};

export default Header;
