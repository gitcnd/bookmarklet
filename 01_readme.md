Keeping a "save as markdown" link on my toolbar so I can keep local copies of my AI chats.

📗.md

Supports: ChatGPT, Perplexity, DeepSeek, OpenRouter, Claude, Gemini, Google AI Studio, X.com, Grok, Microsoft Copilot, WhatsApp Web, and Z.ai!

**Want to test first?** Copy the line from bookmarklet/bookmarklet_minified.txt WITHOUT the first "j" (i.e. `avascript:...`), type `j` in Chrome's address bar, paste, and hit Enter. (Chrome blocks pasting `javascript:` for security.)

## How it's built

- `bookmarklet_source.js` is the readable source. Each supported site has its own `else if (hostname...)` branch that grabs that site's conversation (some via the site's own API, most by scraping the DOM) and turns it into Markdown.
- `bookmarklet_minified.txt` is the thing you actually put on the toolbar: the source minified by `create_bookmarklet.js` (terser) with `javascript:` prepended. Regenerate it with `node create_bookmarklet.js` (or `make`) from this folder after editing the source.

## Heads-up: Chrome "escapes" bookmarklet characters

A bookmarklet is just a `javascript:` URL, so the browser applies URL rules to it. Two of those rules have bitten us, and both look like Chrome "eating" or "escaping" characters:

1. **Pasting `javascript:` is blocked.** Chrome strips a leading `javascript:` when you paste it into the address bar (anti self-XSS). That is why the "test first" trick above pastes `avascript:...` and has you type the `j` yourself.

2. **`%` followed by two hex digits gets URL-decoded.** Before the browser runs a `javascript:` URL, it percent-decodes it. So `%50` becomes the character `P` (0x50 = "P"), `%20` becomes a space, and so on. This silently rewrites the code.

   This is exactly what broke us, via the JavaScript remainder/modulo operator. Source like `scrollIterations % 50` is harmless while the space is there, but minification removes the space and turns it into `scrollIterations%50`. The browser then decodes `%50` to `P`, leaving `scrollIterationsP` and a dead bookmarklet. (This is an old, well-known bookmarklet trap; the brute-force fix is to write the percent itself as `%25`, e.g. `%2550`.)

   Our fix keeps the *minified* output from ever placing a `%` right before two hex digits. The WhatsApp branch does this by parking the number in a variable, so the modulo minifies to `h%g` (operator + 1-char variable) instead of `h%50`:

```js
const statusUpdateInterval = 50; // keep "50" out of the "%NN" slot after minify
// ...
if (scrollIterations % statusUpdateInterval === 0) { /* ... */ }
```

   `create_bookmarklet.js` guards this automatically: it refuses to write `bookmarklet_minified.txt` (and exits with an error) if the output contains any `%`-plus-two-hex-digits sequence, so the bug cannot quietly creep back in.

Note: ordinary characters (spaces, punctuation, emoji like the 📗 in the toolbar label) round-trip fine in practice. The specific landmine is `%` sitting next to two hex digits.
