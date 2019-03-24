import React from 'react';
import { Link } from 'gatsby';
import styled from 'styled-components';

const Style = styled.div`
	border-right: 1px solid var(--primary-border-color);
	height: 100%;

	h2 {
		margin: 0;
		padding: 0;
		line-height: 1;

		a {
			display: block;
			padding: 1em 1em 1em 1rem;
			text-decoration: none;
		}
	}

	ul {
		margin: 0;
		padding: 0;

		li {
			display: block;
			margin: 0;
			padding: 0;
			border-top: 1px solid var(--primary-border-color);

			a {
				display: block;
				padding: 0.7em 1em 0.7em 1rem;
				line-height: 1;
				color: var(--primary-text-color);
				text-decoration: none;
				border-left: 3px solid transparent;

				&[aria-current='page'] {
					font-weight: bold;
					border-left-color: var(--primary-color);
				}
			}
		}
	}
`;

interface Props {
	heading: LinkMeta;
	links: LinkMeta[];
}

interface LinkMeta {
	id: string;
	path: string;
	title: string;
}

export default (props: Props) => (
	<Style>
		<nav role="navigation">
			<h2>
				<Link to={props.heading.path}>{props.heading.title}</Link>
			</h2>
			<ul>
				{props.links.map(link => (
					<li key={link.id} role="listitem">
						<Link to={link.path}>
							<span>{link.title}</span>
						</Link>
					</li>
				))}
			</ul>
		</nav>
	</Style>
);
