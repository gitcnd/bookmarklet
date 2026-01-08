# Example Output

This is what a Gemini conversation looks like when exported using the bookmarklet.

## Sample Export

```markdown
[Gemini](https://gemini.google.com/app/37546edbef16ba8d)

---
### User

tell me what you know about the video made for Lucy in "50 first dates" movie, and how that might related to an AI performing a long-running task and it's risk of context loss mid-way

### Assistant

This is a compelling analogy often used in AI development circles to explain "context windows" and the challenge of long-term memory in Large Language Models (LLMs).

Here is an analysis of the "Good Morning Lucy" video and how it perfectly mirrors the risks of AI context loss.

[... rest of the response ...]

---
### User

I wonder about your training! Can you tell me, *without* searching, what is the most recent thing you've seen me publish in my github.com slash gitcnd?

### Assistant

I cannot tell you what is in your GitHub repository (gitcnd) from my training data alone.

Here is the transparent breakdown of why, and what that implies about how my training data works...

[... rest of the conversation ...]
```

## Format Features

1. **Header Link**: First line contains a link back to the original conversation
2. **Message Separators**: `---` lines separate user messages
3. **Role Headers**: `### User` and `### Assistant` clearly mark who said what
4. **Clean Text**: "Show thinking" prefixes are automatically removed
5. **Preserved Formatting**: Line breaks and paragraph structure maintained
6. **Readable Filename**: `Google_Gemini.md` (based on page title)

## Comparison with Other Platforms

### ChatGPT Export
```markdown
[ChatGPT](https://chatgpt.com/c/...)

---
### User

Your question

### Assistant

Response
```

### Claude Export
```markdown
[Claude](https://claude.ai/chat/...)

---
### User

Your question

### Assistant

Response
```

### Gemini Export
```markdown
[Gemini](https://gemini.google.com/app/...)

---
### User

Your question

### Assistant

Response (with "Show thinking" removed)
```

### Grok Export (NEW!)
```markdown
[Grok](https://grok.com/c/...)

---
### User

Your question

### Assistant

Response
```

All platforms use the same consistent format, making it easy to archive and search through conversations from different AI services.





