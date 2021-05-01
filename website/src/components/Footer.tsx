import IconGitHub from './IconGitHub';
import IconTwitter from './IconTwitter';
import { memo } from 'react';

export default memo(() => {
	return (
		<>
			<footer>
				<ul>
					<li>
						<a href="https://github.com/markuplint/markuplint" target="_blank" rel="noreferrer noopener">
							<IconGitHub />
						</a>
					</li>
					<li>
						<a href="https://twitter.com/markuplint" target="_blank" rel="noreferrer noopener">
							<IconTwitter />
						</a>
					</li>
				</ul>
				<p>
					<small>&copy; 2021 markuplint.</small>
				</p>
			</footer>
			<style jsx>{`
				footer {
					background: var(--base-color-back);
					padding: 3em 5em;
					display: flex;
					justify-content: flex-end;
					align-items: center;
				}

				p {
					margin: 0 0 0 1em;
					padding: 0;
				}

				small {
					font-size: 1em;
				}

				ul {
					display: flex;
					justify-content: flex-end;
					align-items: center;
					list-style: none;
					margin: 0;
					padding: 0;
				}

				li {
					margin: 0 0.5em;
					padding: 0;
				}

				a {
					color: inherit;
					display: block;
					margin: 0;
					padding: 0;
				}

				@media (max-width: calc(780 / 16 * 1em)) {
					footer {
						padding: 2em;
					}
				}
			`}</style>
		</>
	);
});
