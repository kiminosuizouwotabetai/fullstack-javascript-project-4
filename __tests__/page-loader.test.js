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
});
