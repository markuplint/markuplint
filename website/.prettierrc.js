const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.resolve(__dirname, '../.prettierrc'), { encoding: 'utf-8' });
const json = JSON.parse(content);

module.exports = {
  ...json,
  tabWidth: 2,
  useTabs: false,
};
