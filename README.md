# bookmarklet

A one-liner you can put in your chrome quick-access toolbar which saves you AI chat session to a markdown file with 1 click.

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
- **Grok** (grok.com)
- **WhatsApp Web** (web.whatsapp.com) ✨ NEW!
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

### Building

To rebuild the bookmarklet after making changes:

```bash
node create_bookmarklet.js
```

This will update `bookmarklet_minified.txt` with the minified code.

## Notes

- The bookmarklet extracts visible text from the page
- For ChatGPT, it works with both regular conversations and shared conversations (chatgpt.com/gg/...)
- For Gemini, it automatically removes "Show thinking" prefixes
- For Google AI Studio, filenames are based on the chat name (from the h1 heading)
- Filenames are sanitized and limited to 60 characters
- The export format is compatible with most Markdown viewers

## License

Free to use and modify.





