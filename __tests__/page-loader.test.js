/* eslint-disable no-restricted-syntax, no-await-in-loop */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const nock = require('nock');
const downloadPage = require('../src/index');

describe('page-loader', () => {
  let tempDir;
  const testUrl = 'https://ru.hexlet.io/courses';
  const expectedFileName = 'ru-hexlet-io-courses.html';
  const htmlContent = '<html><body>Test page</body></html>';

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    nock.cleanAll();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should download page and return file path', async () => {
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, htmlContent, { 'Content-Type': 'text/html' });

    const filePath = await downloadPage(testUrl, tempDir);
    expect(filePath).toBe(path.join(tempDir, expectedFileName));

    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe(htmlContent);
  });

  test('should use current directory when output not specified', async () => {
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, htmlContent);

    const originalCwd = process.cwd();
    const tempCwd = await fs.mkdtemp(path.join(os.tmpdir(), 'cwd-'));
    process.chdir(tempCwd);

    try {
      const filePath = await downloadPage(testUrl);
      expect(filePath).toBe(path.join(tempCwd, expectedFileName));
      await fs.access(filePath);
    } finally {
      process.chdir(originalCwd);
      await fs.rm(tempCwd, { recursive: true, force: true });
    }
  });

  test('should handle network error', async () => {
    nock('https://ru.hexlet.io')
      .get('/courses')
      .replyWithError('Network error');

    await expect(downloadPage(testUrl, tempDir)).rejects.toThrow();
  });

  test('should handle 404 response', async () => {
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(404, 'Not Found');

    await expect(downloadPage(testUrl, tempDir)).rejects.toThrow();
  });

  test('should generate correct filename for various URLs', async () => {
    const urls = [
      ['http://example.com', 'example-com.html'],
      ['https://www.google.com/search?q=hello', 'www-google-com-search-q-hello.html'],
      ['ftp://invalid', 'ftp-invalid.html'], // протокол не http/https, но замена сработает
    ];

    for (const [url, expectedFile] of urls) {
      const domain = new URL(url).host;
      const { pathname } = new URL(url);
      nock(domain)
        .get(pathname)
        .reply(200, 'test');

      const filePath = await downloadPage(url, tempDir);
      expect(path.basename(filePath)).toBe(expectedFile);
    }
  });

  test('should download images and replace src', async () => {
    const htmlFixture = '<!DOCTYPE html>...';
    const imageBuffer = Buffer.from('fake image data');

    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, htmlFixture, { 'Content-Type': 'text/html' });
    nock('https://ru.hexlet.io')
      .get('/assets/professions/nodejs.png')
      .reply(200, imageBuffer, { 'Content-Type': 'image/png' });

    const filePath = await downloadPage('https://ru.hexlet.io/courses', tempDir);
    const filesDir = path.join(tempDir, 'ru-hexlet-io-courses_files');
    const imgPath = path.join(filesDir, 'ru-hexlet-io-assets-professions-nodejs.png');

    await expect(fs.access(imgPath)).resolves.toBeUndefined();

    const updatedHtml = await fs.readFile(filePath, 'utf-8');
    expect(updatedHtml).toContain('src="ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png"');
  });
});

test('should download css, js and replace links', async () => {
  const htmlFixture = `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="/assets/application.css">
    <script src="/packs/js/runtime.js"></script>
    <link href="/courses" rel="canonical">
  </head>
  <body></body>
</html>`;
  const cssBuffer = Buffer.from('body { color: red; }');
  const jsBuffer = Buffer.from('console.log("runtime");');
  const pageBuffer = Buffer.from('<html>sub page</html>');

  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, pageBuffer, { 'Content-Type': 'text/html' });
  nock('https://ru.hexlet.io')
    .get('/assets/application.css')
    .reply(200, cssBuffer, { 'Content-Type': 'text/css' });
  nock('https://ru.hexlet.io')
    .get('/packs/js/runtime.js')
    .reply(200, jsBuffer, { 'Content-Type': 'application/javascript' });

  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, htmlFixture, { 'Content-Type': 'text/html' });

  const filePath = await downloadPage('https://ru.hexlet.io/courses', tempDir);
  const filesDir = path.join(tempDir, 'ru-hexlet-io-courses_files');

  await expect(fs.access(path.join(filesDir, 'ru-hexlet-io-assets-application.css'))).resolves.toBeUndefined();
  await expect(fs.access(path.join(filesDir, 'ru-hexlet-io-packs-js-runtime.js'))).resolves.toBeUndefined();
  await expect(fs.access(path.join(filesDir, 'ru-hexlet-io-courses.html'))).resolves.toBeUndefined();

  const modifiedHtml = await fs.readFile(filePath, 'utf-8');
  expect(modifiedHtml).toContain('href="ru-hexlet-io-courses_files/ru-hexlet-io-assets-application.css"');
  expect(modifiedHtml).toContain('src="ru-hexlet-io-courses_files/ru-hexlet-io-packs-js-runtime.js"');
  expect(modifiedHtml).toContain('href="ru-hexlet-io-courses_files/ru-hexlet-io-courses.html"');
});

test('should ignore external resources', async () => {
  const htmlFixture = `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="https://cdn2.hexlet.io/assets/menu.css">
    <script src="https://js.stripe.com/v3/"></script>
  </head>
  <body></body>
</html>`;

  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, htmlFixture, { 'Content-Type': 'text/html' });

  const filePath = await downloadPage('https://ru.hexlet.io/courses', tempDir);
  const modifiedHtml = await fs.readFile(filePath, 'utf-8');

  expect(modifiedHtml).toContain('href="https://cdn2.hexlet.io/assets/menu.css"');
  expect(modifiedHtml).toContain('src="https://js.stripe.com/v3/"');

  const filesDir = path.join(tempDir, 'ru-hexlet-io-courses_files');
  await expect(fs.access(filesDir)).rejects.toThrow();
});
