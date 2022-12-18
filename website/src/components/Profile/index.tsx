import React from 'react';

import Avatar from '../Avatar';

import styles from './styles.module.css';

type Props = {
  avatar: string;
  name: string;
  desc?: string;
  github?: string;
  twitter?: string;
  mini?: boolean;
};

export default function Profile({ avatar, name, desc, github, twitter, mini }: Props) {
  return !mini ? (
    <div className={styles.profile}>
      <>
        <figure>
          <Avatar src={avatar} alt="" />
          <figcaption>{name}</figcaption>
        </figure>
        {desc && <p>{desc}</p>}
        <div className={styles.sns}>
          {github && (
            <a href={github} target="_blank" rel="noreferrer" className="iconLink iconLink--github">
              <span className="visually-hidden">{name} GitHub Account</span>
            </a>
          )}
          {twitter && (
            <a href={twitter} target="_blank" rel="noreferrer" className="iconLink iconLink--twitter">
              <span className="visually-hidden">{name} Twitter Account</span>
            </a>
          )}
        </div>
      </>
    </div>
  ) : (
    <a className={styles.profile} href={github} target="_blank" rel="noreferrer">
      <figure>
        <Avatar src={avatar} alt="" />
        <figcaption>{name}</figcaption>
      </figure>
    </a>
  );
}
