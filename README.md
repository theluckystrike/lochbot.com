# LochBot -- Prompt Injection Vulnerability Checker for Chatbots

**[-> Use LochBot (live tool)](https://lochbot.com/)**

LochBot is a free prompt injection vulnerability checker that analyzes your chatbot's system prompt against 31 known attack patterns across 7 categories. Get a 0-100 security score, letter grade assessment, and specific fix suggestions for every vulnerability detected. All analysis runs 100% client-side -- your system prompt never leaves your browser.

## Features

- Tests against 31 prompt injection attack patterns
- 7 vulnerability categories: direct injection, context manipulation, delimiter attacks, data extraction, role play jailbreaks, encoding attacks, prompt leaking
- 0-100 security score with letter grade (A through F)
- Specific fix suggestions for each detected vulnerability
- JSON export for compliance reporting and documentation
- Severity ratings: critical, high, medium, low per vulnerability
- 100% client-side -- your data never leaves your browser
- Open source -- inspect the code yourself

## Tech Stack

- Vanilla JavaScript (no frameworks, no build step)
- Static HTML hosted on GitHub Pages
- Cloudflare DNS + SSL
- Zero dependencies, zero tracking, zero cookies

## Part of Zovo Tools

LochBot is part of [Zovo Tools](https://zovo.one/tools) -- a collection of free developer tools.

**Other tools in the network:**
- [EpochPilot](https://epochpilot.com) -- 30+ timestamp and timezone tools
- [HeyTensor](https://heytensor.com) -- PyTorch tensor shape calculator
- [KappaKit](https://kappakit.com) -- Developer toolkit (Base64, JWT, hash, UUID)
- [ABWex](https://abwex.com) -- A/B test significance calculator

## License

MIT
