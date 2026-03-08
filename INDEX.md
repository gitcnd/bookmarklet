# Bookmarklet Documentation Index

## For Users

📌 **Start Here:**
- **[QUICK_START.md](QUICK_START.md)** - 30-second installation guide
- **[01_readme.md](01_readme.md)** - The actual bookmarklet code to copy

📖 **Reference:**
- **[README.md](README.md)** - Full documentation and usage instructions
- **[EXAMPLE_OUTPUT.md](EXAMPLE_OUTPUT.md)** - See what exported files look like

## For Developers

🔧 **Source Code:**
- **[bookmarklet_source.js](bookmarklet_source.js)** - Unminified, commented source code
- **[create_bookmarklet.js](create_bookmarklet.js)** - Build script to create minified version
- **[bookmarklet_minified.txt](bookmarklet_minified.txt)** - Minified output

📝 **Technical Documentation:**
- **[GEMINI_SUPPORT_ADDED.md](GEMINI_SUPPORT_ADDED.md)** - Implementation details for Gemini
- **[COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md)** - Project completion report

## Quick Links

| I want to... | Go to... |
|--------------|----------|
| Install the bookmarklet | [QUICK_START.md](QUICK_START.md) |
| Copy the bookmarklet code | [01_readme.md](01_readme.md) line 9 |
| See what it exports | [EXAMPLE_OUTPUT.md](EXAMPLE_OUTPUT.md) |
| Understand how it works | [README.md](README.md) |
| Modify the code | [bookmarklet_source.js](bookmarklet_source.js) |
| Build after changes | Run `node create_bookmarklet.js` |
| Learn about Gemini support | [GEMINI_SUPPORT_ADDED.md](GEMINI_SUPPORT_ADDED.md) |

## File Structure

```
bookmarklet/
├── 01_readme.md                 # User-facing bookmarklet code
├── README.md                    # Main documentation
├── QUICK_START.md              # Installation guide
├── EXAMPLE_OUTPUT.md           # Sample exports
├── INDEX.md                    # This file
├── bookmarklet_source.js       # Source code
├── create_bookmarklet.js       # Build script
├── bookmarklet_minified.txt    # Minified output
├── GEMINI_SUPPORT_ADDED.md    # Gemini implementation
└── COMPLETION_SUMMARY.md      # Project summary
```

## Supported Platforms

✅ ChatGPT (chatgpt.com)  
✅ Perplexity (perplexity.ai)  
✅ DeepSeek (deepseek.com)  
✅ OpenRouter (openrouter.ai)  
✅ Claude (claude.ai)  
✅ Gemini (gemini.google.com)  
✅ Google AI Studio (aistudio.google.com)  
✅ X / Twitter (x.com)  
✅ Grok (grok.com + x.com/i/grok)  
✅ **Microsoft Copilot (copilot.microsoft.com)** ← NEW!  
✅ WhatsApp Web (web.whatsapp.com) (auto-scrolls to capture all)

## Version History

- **v2.0** - Added Gemini support (current)
- **v1.0** - Original version with ChatGPT, Perplexity, DeepSeek, OpenRouter, Claude

## Contributing

To add support for a new platform:

1. Edit `bookmarklet_source.js`
2. Add a new `else if` block for the platform
3. Implement the extraction logic
4. Run `node create_bookmarklet.js` to rebuild
5. Update `01_readme.md` with the new minified code
6. Test thoroughly
7. Update documentation

See [GEMINI_SUPPORT_ADDED.md](GEMINI_SUPPORT_ADDED.md) for a detailed example.





