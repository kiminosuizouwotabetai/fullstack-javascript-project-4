const getFileName = (url) => {
  const withoutProtocol = url.replace(/^https?:\/\//, '');
  const fileName = withoutProtocol.replace(/[^a-zA-Z0-9]/g, '-');
  return `${fileName}.html`;
};

const getResourceFileName = (resourceUrl) => {
  const withoutProtocol = resourceUrl.replace(/^https?:\/\//, '');
  const fileName = withoutProtocol.replace(/[^a-zA-Z0-9.]/g, '-');
  return fileName;
};

const getFilesDirName = (pageUrl) => {
  const baseName = getFileName(pageUrl).replace(/\.html$/, '');
  return `${baseName}_files`;
};

module.exports = { getFileName, getResourceFileName, getFilesDirName };
