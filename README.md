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
- **Gemini** (gemini.google.com) ✨ NEW!

## Installation

1. Create a new bookmark in your browser
2. Name it: `📗.md` (or any name you prefer)
3. Copy the code from `01_readme.md` (the long `javascript:...` line)
4. Paste it as the URL/Location of the bookmark
5. Save the bookmark to your bookmarks bar

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
- For Gemini, it automatically removes "Show thinking" prefixes
- Filenames are sanitized and limited to 60 characters
- The export format is compatible with most Markdown viewers

## License

Free to use and modify.





