const getFileName = (url) => {
  const withoutProtocol = url.replace(/^https?:\/\//, '');
  const fileName = withoutProtocol.replace(/[^a-zA-Z0-9]/g, '-');
  return `${fileName}.html`;
};

const getFilesDirName = (pageUrl) => {
  const baseName = getFileName(pageUrl).replace(/\.html$/, '');
  return `${baseName}_files`;
};

const getAssetFileName = (assetUrl) => {
  const urlObj = new URL(assetUrl);
  const { pathname } = urlObj;
  const lastSegment = pathname.split('/').pop();
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(lastSegment);

  let nameWithExt = assetUrl.replace(/^https?:\/\//, '');
  if (!hasExtension) {
    nameWithExt += '.html';
  }
  return nameWithExt.replace(/[^a-zA-Z0-9.]/g, '-');
};

module.exports = { getFileName, getFilesDirName, getAssetFileName };
