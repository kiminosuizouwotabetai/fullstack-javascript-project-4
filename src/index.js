const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { getFileName, getFilesDirName, getAssetFileName } = require('./utils');

const downloadPage = (url, outputDir = process.cwd()) => {
  const htmlFileName = getFileName(url);
  const htmlFilePath = path.join(outputDir, htmlFileName);
  const filesDirName = getFilesDirName(url);
  const filesDirPath = path.join(outputDir, filesDirName);

  return axios.get(url, { responseType: 'arraybuffer' })
    .then((response) => {
      const htmlContent = response.data.toString('utf-8');
      const $ = cheerio.load(htmlContent);
      const baseHost = new URL(url).host;

      const assetPromises = new Map(); // url -> promise
      const replacements = []; // { element, attr, localPath }

      const processAttribute = (element, attrName, baseUrl, baseHost, filesDirName) => {
        const attrValue = $(element).attr(attrName);
        if (!attrValue) return;

        try {
          const absoluteUrl = new URL(attrValue, baseUrl).href;
          const { host } = new URL(absoluteUrl);
          if (host !== baseHost) return; // внешний ресурс – игнорируем

          const fileName = getAssetFileName(absoluteUrl);
          const localPath = path.join(filesDirName, fileName);
          const absoluteLocalPath = path.join(filesDirPath, fileName);

          replacements.push({
            element,
            attr: attrName,
            newValue: localPath,
          });

          if (!assetPromises.has(absoluteUrl)) {
            const downloadPromise = axios.get(absoluteUrl, { responseType: 'arraybuffer' })
              .then((res) => fs.writeFile(absoluteLocalPath, res.data))
              .catch((err) => {
                // Логируем ошибку, но не прерываем загрузку остальных
                console.error(`Failed to download ${absoluteUrl}: ${err.message}`);
              });
            assetPromises.set(absoluteUrl, downloadPromise);
          }
        } catch (err) {
          console.error(`Invalid URL: ${attrValue} on ${baseUrl}`);
        }
      };

      $('img[src]').each((i, el) => {
        processAttribute(el, 'src', url, baseHost, filesDirName);
      });

      $('link[href]').each((i, el) => {
        processAttribute(el, 'href', url, baseHost, filesDirName);
      });

      $('script[src]').each((i, el) => {
        processAttribute(el, 'src', url, baseHost, filesDirName);
      });

      replacements.forEach(({ element, attr, newValue }) => {
        $(element).attr(attr, newValue);
      });

      const createDirPromise = assetPromises.size > 0
        ? fs.mkdir(filesDirPath, { recursive: true })
        : Promise.resolve();

      return createDirPromise
        .then(() => Promise.all(Array.from(assetPromises.values())))
        .then(() => {
          const modifiedHtml = $.html();
          return fs.writeFile(htmlFilePath, modifiedHtml);
        })
        .then(() => htmlFilePath);
    });
};

module.exports = downloadPage;
