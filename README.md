# Prompt Injection Checker — Test AI Prompts Against 30+ Injection Attacks

**[Test Your Prompts →](https://lochbot.com)** | [About](https://lochbot.com/about.html) | [Blog](https://lochbot.com/blog/)

Prompt Injection Checker scans your AI system prompts against 30+ known injection attack patterns. Get a vulnerability score, see which attacks your prompt is susceptible to, and receive actionable fix suggestions. Built for developers shipping LLM-powered features who need to harden their prompts before production. Catches jailbreaks, data exfiltration, role hijacking, and more.

## Features

- **30+ injection attack patterns** — jailbreaks, role hijacking, data exfiltration, encoding tricks
- **Vulnerability scoring** — overall risk score with per-category breakdown
- **Fix suggestions** — actionable recommendations to harden each weakness
- **Custom attack testing** — paste your own adversarial inputs to test edge cases
- **Detailed attack explanations** — understand why each pattern is dangerous

## How It Works

Paste your system prompt (or any prompt template) into the analyzer. The checker runs it against a library of 30+ known injection attack patterns, including direct jailbreaks, indirect injection via user input, encoding-based bypasses, and multi-turn manipulation. Each matched vulnerability is scored by severity. You get a composite risk score and a prioritized list of fixes. Everything runs client-side — your prompts are never sent to any server.

## Built With

- Vanilla JavaScript (no frameworks, no dependencies)
- Client-side only — your data never leaves your browser
- Part of the [Zovo Tools](https://zovo.one) open network

## Related Tools

- [Claude Prompt Library](https://claudhq.com) — start with battle-tested prompts that resist injection
- [AI Workflow Builder](https://claudflow.com) — design workflows with built-in prompt safety layers
- [Webhook Request Builder](https://invokebot.com) — test API endpoints that serve your hardened prompts

## Contributing

Found a bug or have a feature request? [Open an issue](https://github.com/theluckystrike/lochbot.com/issues).

## License

MIT
