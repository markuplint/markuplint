import type { MDXProvider } from '@mdx-js/react';
import type { PropsWithChildren } from 'react';

import innerText from 'react-innertext';

let h2: string;
let h3: string;
let h4: string;
let h5: string;

const MDXElement: React.ComponentProps<typeof MDXProvider>['components'] = {
  h1: _ => null,
  h2: (props: PropsWithChildren<{}>) => {
    const id = createId(innerText(props.children));
    h2 = id;
    return (
      <h2>
        <a {...props} id={id} href={`#${id}`}>
          {props.children}
        </a>
      </h2>
    );
  },
  h3: (props: PropsWithChildren<{}>) => {
    const _id = createId(innerText(props.children));
    const id = `${h2}/${_id}`;
    h3 = _id;
    return (
      <h3>
        <a {...props} id={id} href={`#${id}`}>
          {props.children}
        </a>
      </h3>
    );
  },
  h4: (props: PropsWithChildren<{}>) => {
    const _id = createId(innerText(props.children));
    const id = `${h2}/${h3}/${_id}`;
    h4 = _id;
    return (
      <h4>
        <a {...props} id={id} href={`#${id}`}>
          {props.children}
        </a>
      </h4>
    );
  },
  h5: (props: PropsWithChildren<{}>) => {
    const _id = createId(innerText(props.children));
    const id = `${h2}/${h3}/${h4}/${_id}`;
    h5 = _id;
    return (
      <h5>
        <a {...props} id={id} href={`#${id}`}>
          {props.children}
        </a>
      </h5>
    );
  },
  h6: (props: PropsWithChildren<{}>) => {
    const _id = createId(innerText(props.children));
    const id = `${h2}/${h3}/${h4}/${h5}/${_id}`;
    return (
      <h6>
        <a {...props} id={id} href={`#${id}`}>
          {props.children}
        </a>
      </h6>
    );
  },
  a: (props: PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => {
    const isExternal = props.href && /^https?:\/\//.test(props.href);
    return (
      <a {...props} target={isExternal ? '_blank' : undefined} referrerPolicy={isExternal ? 'no-referrer' : undefined}>
        {props.children}
      </a>
    );
  },
  img: (props: PropsWithChildren<React.ImgHTMLAttributes<HTMLImageElement>>) => {
    return <img {...props} loading="lazy" />;
  },
  table: (props: PropsWithChildren<{}>) => {
    return (
      <div className="__table-wrapper">
        <table {...props}>{props.children}</table>
      </div>
    );
  },
};

function createId(text: string) {
  return text
    .replace(/\s+/gi, '-')
    .replace(/^[A-Z]/, $0 => $0.toLowerCase())
    .replace(/(?<!^)[A-Z]/g, $0 => `-${$0.toLowerCase()}`)
    .replace(/-+/g, '-');
}

export default MDXElement;
