import type { RestEndpointMethodTypes } from '@octokit/rest';

import contributors from '@site/contributors.json';
import React from 'react';

import Profile from '../Profile';

type Contributor = RestEndpointMethodTypes['repos']['listContributors']['response']['data'][0];

export default function Contributors() {
  return (
    <>
      {contributors.map((contributor: Contributor) => (
        <Profile
          key={contributor.login}
          mini
          avatar={contributor.avatar_url ?? 'N/A'}
          name={contributor.login ?? 'N/A'}
          github={contributor.html_url}
        />
      ))}
    </>
  );
}
