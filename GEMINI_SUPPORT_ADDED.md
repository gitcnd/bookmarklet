# Gemini Support Added to Bookmarklet

## Summary

Successfully added Google Gemini (gemini.google.com) support to the AI chat export bookmarklet.

## Implementation Details

### DOM Structure Analysis

Gemini uses custom web components for its chat interface:
- `<user-query>` elements contain user messages
- `<model-response>` elements contain AI responses
- Messages are wrapped in `.conversation-container` divs

### Extraction Logic

```javascript
if (hostname.includes("gemini.google.com")) {
  siteName = "Gemini";
  const containers = document.querySelectorAll(".conversation-container");
  containers.forEach(container => {
    const userQuery = container.querySelector("user-query");
    const modelResponse = container.querySelector("model-response");
    
    if (userQuery) {
      const userText = userQuery.innerText?.trim();
      if (userText) {
        conversationMarkdown += `---\n### User\n\n${userText}\n\n`;
      }
    }
    
    if (modelResponse) {
      let modelText = modelResponse.innerText?.trim();
      if (modelText) {
        // Remove "Show thinking" prefix if present
        if (modelText.startsWith("Show thinking")) {
          modelText = modelText.replace(/^Show thinking\s*/, "");
        }
        conversationMarkdown += `### Assistant\n\n${modelText}\n\n`;
      }
    }
  });
  
  filename = document.title.replace(/[^\w\d]+/g, "_").slice(0, 60) || "gemini_chat";
}
```

### Special Handling

1. **"Show thinking" prefix removal**: Gemini sometimes displays a "Show thinking" label before responses. This is automatically stripped from the exported text.

2. **Fallback filename**: If the page title is empty, defaults to "gemini_chat" instead of "chat_export".

3. **Optional chaining**: Uses `?.trim()` to safely handle cases where `innerText` might be undefined.

## Testing

Tested on live Gemini conversation at:
- URL: https://gemini.google.com/app/37546edbef16ba8d
- Successfully extracted 4 message pairs (8 total messages)
- Generated markdown file: `Google_Gemini.md`
- File size: ~15KB of conversation data

## Files Modified

1. **bookmarklet_source.js** - Added Gemini extraction logic
2. **bookmarklet/01_readme.md** - Updated with new minified bookmarklet including Gemini support
3. **README.md** - Added documentation for Gemini support

## Compatibility

The updated bookmarklet maintains full backward compatibility with:
- ChatGPT
- Perplexity
- DeepSeek
- OpenRouter
- Claude

No changes were made to existing platform extraction logic.





