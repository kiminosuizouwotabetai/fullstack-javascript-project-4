#!/usr/bin/env node

const path = require('path');
const downloadPage = require('../src/index');

const args = process.argv.slice(2);
let outputDir = process.cwd();
let url = null;

// Парсинг аргументов: --output <dir> или -o <dir>
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--output' || args[i] === '-o') {
    outputDir = path.resolve(args[i + 1]);
    i += 1;
  } else {
    url = args[i];
  }
}

if (!url) {
  console.error('Usage: page-loader --output <dir> <url>');
  process.exit(1);
}

downloadPage(url, outputDir)
  .then((filePath) => {
    console.log(filePath);
  })
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
