#!/usr/bin/env node
// V31: Validate generated answer pages for lochbot.com
'use strict';

const fs = require('fs');
const path = require('path');

const ANSWERS_DIR = path.join(__dirname, '..', 'answers');
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
const BASE_URL = 'https://lochbot.com';

let errors = 0;
let warnings = 0;

function error(file, msg) {
  console.error(`  ERROR [${file}]: ${msg}`);
  errors++;
}

function warn(file, msg) {
  console.warn(`  WARN  [${file}]: ${msg}`);
  warnings++;
}

const files = fs.readdirSync(ANSWERS_DIR).filter(f => f.endsWith('.html'));
console.log(`Validating ${files.length} answer pages...\n`);

const titles = new Set();
const canonicals = new Set();
const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');

for (const file of files) {
  const filepath = path.join(ANSWERS_DIR, file);
  const html = fs.readFileSync(filepath, 'utf8');

  // 1. Word count (index.html exempt — it's a hub page)
  const textOnly = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = textOnly.split(' ').length;
  if (file !== 'index.html' && wordCount < 400) {
    error(file, `Only ${wordCount} words (minimum 400)`);
  }

  // 2. Unique title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (!titleMatch) {
    error(file, 'Missing <title> tag');
  } else {
    if (titles.has(titleMatch[1])) error(file, `Duplicate title: "${titleMatch[1]}"`);
    titles.add(titleMatch[1]);
  }

  // 3. Required meta tags
  if (!html.includes('<meta name="description"')) error(file, 'Missing meta description');
  if (!html.includes('<meta name="robots"')) error(file, 'Missing robots meta');
  if (!html.includes('rel="canonical"')) error(file, 'Missing canonical URL');
  if (!html.includes('og:title')) error(file, 'Missing OG title');
  if (!html.includes('og:description')) error(file, 'Missing OG description');
  if (!html.includes('twitter:card')) error(file, 'Missing Twitter card');

  // 4. Canonical uniqueness
  const canonicalMatch = html.match(/rel="canonical"\s+href="([^"]+)"/);
  if (canonicalMatch) {
    if (canonicals.has(canonicalMatch[1])) error(file, `Duplicate canonical: ${canonicalMatch[1]}`);
    canonicals.add(canonicalMatch[1]);
  }

  // 5. FAQPage JSON-LD (index.html exempt — it's a hub page)
  if (file !== 'index.html' && !html.includes('"FAQPage"')) {
    error(file, 'Missing FAQPage JSON-LD schema');
  }

  // 6. Structural elements
  if (!html.includes('<h1')) error(file, 'Missing H1');
  if (!html.includes('class="breadcrumb"')) error(file, 'Missing breadcrumb');
  if (!html.includes('class="site-footer"')) error(file, 'Missing footer');
  if (!html.includes('class="zovo-network"')) error(file, 'Missing Zovo network');

  // 7. No template artifacts (skip {{ inside <code> blocks — legitimate code examples)
  const htmlNoCode = html.replace(/<code>[\s\S]*?<\/code>/g, '');
  if (htmlNoCode.includes('{{') || htmlNoCode.includes('}}')) error(file, 'Contains template artifact {{ }}');
  if (html.includes('undefined')) warn(file, 'Contains "undefined" text');
  if (html.includes('NaN')) error(file, 'Contains NaN');
  if (html.includes('TODO')) warn(file, 'Contains TODO');
  if (html.includes('FIXME')) warn(file, 'Contains FIXME');

  // 8. Valid HTML structure
  if (!html.includes('<!DOCTYPE html>')) error(file, 'Missing DOCTYPE');
  if (!html.includes('</html>')) error(file, 'Missing closing </html>');

  // 9. Internal links validity
  const linkMatches = html.matchAll(/href="\/answers\/([^"]+)"/g);
  for (const m of linkMatches) {
    const linkedFile = m[1];
    if (linkedFile && !fs.existsSync(path.join(ANSWERS_DIR, linkedFile))) {
      warn(file, `Broken internal link: /answers/${linkedFile}`);
    }
  }

  // 10. Sitemap inclusion
  const expectedUrl = file === 'index.html'
    ? `${BASE_URL}/answers/`
    : `${BASE_URL}/answers/${file}`;
  if (!sitemap.includes(expectedUrl)) {
    error(file, `Not in sitemap: ${expectedUrl}`);
  }

  console.log(`  OK: ${file} (${wordCount} words)`);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Files validated: ${files.length}`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) {
  console.log('\nValidation FAILED.');
  process.exit(1);
} else {
  console.log('\nValidation PASSED.');
  process.exit(0);
}
