const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const getFileName = require('./utils');

const downloadPage = (url, outputDir = process.cwd()) => {
  const fileName = getFileName(url);
  const filePath = path.join(outputDir, fileName);

  return axios({
    method: 'get',
    url,
    responseType: 'arraybuffer',
  })
    .then((response) => fs.writeFile(filePath, response.data))
    .then(() => filePath);
};

module.exports = downloadPage;
