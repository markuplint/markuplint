import 'normalize.css';
import '../global.css';

import { MDXProvider, MDXProviderComponentsProp } from '@mdx-js/react';
import { AppProps } from 'next/app';
import { PropsWithChildren } from 'react';

const mdComponents: MDXProviderComponentsProp = {
	h1: props => null,
	h2: (props: PropsWithChildren<{}>) => (
		<h2>
			<a {...props} id={props.children?.toString()} href={`#${props.children?.toString()}`}>
				{props.children}
			</a>
		</h2>
	),
	h3: (props: PropsWithChildren<{}>) => (
		<h3>
			<a {...props} id={props.children?.toString()} href={`#${props.children?.toString()}`}>
				{props.children}
			</a>
		</h3>
	),
	h4: (props: PropsWithChildren<{}>) => (
		<h4>
			<a {...props} id={props.children?.toString()} href={`#${props.children?.toString()}`}>
				{props.children}
			</a>
		</h4>
	),
	h5: (props: PropsWithChildren<{}>) => (
		<h5>
			<a {...props} id={props.children?.toString()} href={`#${props.children?.toString()}`}>
				{props.children}
			</a>
		</h5>
	),
	h6: (props: PropsWithChildren<{}>) => (
		<h6>
			<a {...props} id={props.children?.toString()} href={`#${props.children?.toString()}`}>
				{props.children}
			</a>
		</h6>
	),
	a: (props: PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => {
		const isExternal = props.href && /^https?:\/\//.test(props.href);
		return (
			<a
				{...props}
				target={isExternal ? '_blank' : undefined}
				referrerPolicy={isExternal ? 'noreferrer noopener' : undefined}
			>
				{props.children}
			</a>
		);
	},
	img: (props: PropsWithChildren<React.ImgHTMLAttributes<HTMLImageElement>>) => {
		return <img {...props} loading="lazy" />;
	},
};

export default function App({ Component, pageProps }: AppProps) {
	return (
		<MDXProvider components={mdComponents}>
			<Component {...pageProps} />
		</MDXProvider>
	);
}
