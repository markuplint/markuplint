require('dotenv').config();

const IS_NEXT_VERSION = !!process.env.NEXT_VERSION;

module.exports = {
  isNextVersion: IS_NEXT_VERSION,
  // NOTE: `url` and `algoliaIndexName` need to be changed when the deployment destination is change.
  url: `https://${IS_NEXT_VERSION ? 'next.' : ''}markuplint.dev`,
  algoliaIndexName: `markuplint${IS_NEXT_VERSION ? '@next' : ''}`,
  // NOTE: `editUrl` needs to be changed when the deployment source branch is change.
  editUrlBase: `https://github.com/markuplint/markuplint/edit/${IS_NEXT_VERSION ? 'dev' : 'main'}`,
};
