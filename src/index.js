const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { getFileName, getResourceFileName, getFilesDirName } = require('./utils');

const downloadPage = (url, outputDir = process.cwd()) => {
  const htmlFileName = getFileName(url);
  const htmlFilePath = path.join(outputDir, htmlFileName);
  const filesDirName = getFilesDirName(url);
  const filesDirPath = path.join(outputDir, filesDirName);

  return axios.get(url, { responseType: 'arraybuffer' })
    .then((response) => {
      const htmlContent = response.data.toString('utf-8');
      const $ = cheerio.load(htmlContent);
      const imgTags = $('img');
      const imgPromises = [];

      imgTags.each((i, img) => {
        const src = $(img).attr('src');
        if (src) {
          const absoluteUrl = new URL(src, url).href;
          const imgFileName = getResourceFileName(absoluteUrl);
          const localImgPath = path.join(filesDirPath, imgFileName);
          const relativeImgPath = path.join(filesDirName, imgFileName);

          $(img).attr('src', relativeImgPath);

          imgPromises.push(
            axios.get(absoluteUrl, { responseType: 'arraybuffer' })
              .then((imgResponse) => fs.writeFile(localImgPath, imgResponse.data)),
          );
        }
      });

      // Создаём директорию для ресурсов, если есть изображения
      const createDirPromise = imgPromises.length > 0
        ? fs.mkdir(filesDirPath, { recursive: true })
        : Promise.resolve();

      return createDirPromise
        .then(() => Promise.all(imgPromises))
        .then(() => {
          const modifiedHtml = $.html();
          return fs.writeFile(htmlFilePath, modifiedHtml);
        })
        .then(() => htmlFilePath);
    });
};

module.exports = downloadPage;
