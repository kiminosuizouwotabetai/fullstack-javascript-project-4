const getFileName = (url) => {
  // Убираем протокол (http:// или https://)
  const withoutProtocol = url.replace(/^https?:\/\//, '');
  // Заменяем все символы, кроме букв и цифр, на дефис
  const fileName = withoutProtocol.replace(/[^a-zA-Z0-9]/g, '-');
  return `${fileName}.html`;
};

module.exports = getFileName;
