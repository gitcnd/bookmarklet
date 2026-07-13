# bookmarklet

Two one-liners you can put in your chrome quick-access toolbar:

- **📗.md** - saves your AI chat session to a markdown file with 1 click (this section)
- **🧹nags** - deactivates popups, dimming overlays, and scroll-blocking on nagging websites with 1 click (see [Nag Neutralizer](#nag-neutralizer-bookmarklet-) below, or [NAG_NEUTRALIZER_README.md](NAG_NEUTRALIZER_README.md))

# AI Chat Export Bookmarklet 📗.md

A browser bookmarklet to save AI chat conversations as Markdown files.

## Supported Platforms

- **ChatGPT** (chatgpt.com)
- **Perplexity** (perplexity.ai)
- **DeepSeek** (deepseek.com)
- **OpenRouter** (openrouter.ai)
- **Claude** (claude.ai)
- **Gemini** (gemini.google.com)
- **Google AI Studio** (aistudio.google.com)
- **X / Twitter** (x.com)
- **Grok** (grok.com + x.com/i/grok)
- **Microsoft Copilot** (copilot.microsoft.com)
- **Z.ai** (chat.z.ai, GLM models) ✨ NEW!
- **WhatsApp Web** (web.whatsapp.com)
  - ⚠️ **Scroll to top manually first**, then scroll down/up to verify
  - Captures all messages as it scrolls back down
  - Preserves sender names and timestamps

## Installation

1. Create a new bookmark in your browser
2. Name it: `📗.md` (or any name you prefer)
3. Copy the code from `bookmarklet_minified.txt` (the long `javascript:...` line)
4. Paste it as the URL/Location of the bookmark
5. Save the bookmark to your bookmarks bar

## Want to test it first?

Before creating a bookmark, you can test the bookmarklet directly in Chrome's address bar:

1. Open `bookmarklet_minified.txt`
2. Copy the text **BUT DO NOT COPY THE FIRST "j" in "javascript"** - i.e. copy `avascript:(()=>{const e=wind...`
3. In Chrome's address bar, manually type the letter `j`
4. Paste (Ctrl or Cmd+V) the rest of the code after the `j`
5. Hit Enter to run it

**Why?** Chrome blocks pasting `javascript:` for security reasons - at least part of it must be typed manually.

## Usage

1. Open any supported AI chat conversation
2. Click the `📗.md` bookmark in your toolbar
3. A Markdown file will automatically download with the conversation

## File Format

The exported file includes:
- A link to the original conversation at the top
- Alternating User and Assistant messages
- Proper Markdown formatting
- Filename based on the conversation title

Example:
```markdown
[Gemini](https://gemini.google.com/app/...)

---
### User

Your question here

### Assistant

The AI's response here
```

## Development

### Files

- `bookmarklet_source.js` - Unminified source code with comments
- `create_bookmarklet.js` - Script to minify the bookmarklet
- `bookmarklet_minified.txt` - Minified bookmarklet code
- `01_readme.md` - User-facing file with the bookmarklet
- `Makefile` - Rebuilds (via `create_bookmarklet.js`) and syncs the files to the public repo: `make`

### Building

To rebuild the bookmarklet after making changes:

```bash
node create_bookmarklet.js
```

This will update `bookmarklet_minified.txt` with the minified code. It also aborts if the output contains a `%` immediately followed by two hex digits, which Chrome would URL-decode and corrupt -- see `01_readme.md` for the details.

## Notes

- The bookmarklet extracts visible text from the page
- For ChatGPT, it works with both regular conversations and shared conversations (chatgpt.com/gg/...)
- For Gemini, it automatically removes "Show thinking" prefixes
- For Google AI Studio, filenames are based on the chat name (from the h1 heading)
- Filenames are sanitized and limited to 60 characters
- The export format is compatible with most Markdown viewers

# Nag Neutralizer Bookmarklet 🧹

One click deactivates the junk some sites put between you and their content:

- full-viewport modal popups (adblock walls, subscribe boxes, cookie sheets)
- the dimming backdrop layers behind them
- transparent full-screen "click catcher" layers
- scroll locking (`overflow:hidden` or `position:fixed` tricks on html/body)
- paywall-style blur over article text, text-selection blocking, and `inert` interaction traps

Key design point: overlays are deactivated **in place** (hidden with `!important`
inline styles) rather than removed, because many sites watch for their nag being
deleted and re-insert it. It then keeps watch for 30 seconds and re-asserts
itself if the page fights back. Clicking it again on stubborn pages is safe --
it re-scans without stacking duplicate watchers. Like the exporter, it is a
multifunction button: a generic engine handles most sites, and a per-hostname
dispatch table handles sites needing bespoke extra steps.

## Installation

1. Create a new bookmark in your browser
2. Name it: `🧹nags` (or any name you prefer)
3. Copy the code from `nag_neutralizer_bookmarklet_minified.txt` (the long `javascript:...` line)
4. Paste it as the URL/Location of the bookmark
5. Save the bookmark to your bookmarks bar

The same "test it first in the address bar" trick from the exporter above works
for this one too (type the `j`, paste the rest).

## Usage

1. When a page nags you (popup + dimmed page + no scrolling), click `🧹nags`
2. A small toast bottom-right reports what was deactivated
3. If a site re-nags later than 30 seconds after your click, click again

Full details -- what counts as a nag, the fight-back/stand-down design, the
per-site dispatch table, files, build instructions, and limitations -- are in
[NAG_NEUTRALIZER_README.md](NAG_NEUTRALIZER_README.md).

Its files: `nag_neutralizer_bookmarklet_source.js` (readable source),
`create_nag_neutralizer_bookmarklet.js` (build script),
`nag_neutralizer_bookmarklet_minified.txt` (the toolbar one-liner). Rebuild
after changes with `node create_nag_neutralizer_bookmarklet.js`.

## License

Free to use and modify.





