import type { RestEndpointMethodTypes } from '@octokit/rest';

import contributors from '@site/contributors.json';
import React from 'react';

import Profile from '../Profile';

type Contributor = RestEndpointMethodTypes['repos']['listContributors']['response']['data'][0];

// contributors.json is written by scripts/prebuild/get-contributors.mts from the GitHub API, or as []
// when the request fails; typing it here keeps the type-check independent of what the API returned.
const contributorList = contributors as Contributor[];

export default function Contributors() {
	return (
		<>
			{contributorList.map(contributor => (
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
