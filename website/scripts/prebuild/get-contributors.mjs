import { writeFile } from 'node:fs/promises';

import { Octokit } from '@octokit/rest';

export async function getContributors() {
  let contributors = [];

  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_ACCESS_TOKEN_MARKUPLINT,
    });

    const owner = 'markuplint';
    const repo = 'markuplint';

    const response = await octokit.rest.repos.listContributors({
      owner,
      repo,
    });

    contributors = response.data.filter(
      contributor =>
        // Exclude bots
        contributor.type === 'User' && contributor.login !== 'fossabot',
    );
  } catch {
    //
  }

  await writeFile('./contributors.json', JSON.stringify(contributors, null, 2), 'utf8');
}
