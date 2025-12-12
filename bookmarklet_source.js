// Bookmarklet to export AI chat conversations to Markdown
// Supports: ChatGPT, Perplexity, DeepSeek, OpenRouter, Claude, Gemini

(() => {
  const hostname = window.location.hostname;
  const url = window.location.href;
  let conversationMarkdown = "";
  let filename = "";
  let siteName = "";

  if (hostname.includes("chatgpt.com")) {
    siteName = "ChatGPT";
    const messages = document.querySelectorAll("div[data-message-author-role]");
    const messageArray = Array.from(messages);
    
    for (let i = 0; i < messageArray.length; i++) {
      const msg = messageArray[i];
      const role = msg.getAttribute("data-message-author-role");
      
      if (role === "user") {
        // User message - get text from .whitespace-pre-wrap or textContent
        const preWrap = msg.querySelector(".whitespace-pre-wrap");
        const userText = preWrap ? (preWrap.innerText || preWrap.textContent || "").trim() : (msg.textContent || "").trim();
        if (userText) {
          conversationMarkdown += `---\n### User\n\n${userText}\n\n`;
        }
        
        // Now collect everything until the next user message as the assistant response
        let assistantText = "";
        let j = i + 1;
        while (j < messageArray.length && messageArray[j].getAttribute("data-message-author-role") !== "user") {
          const assistantMsg = messageArray[j];
          const text = (assistantMsg.textContent || "").trim();
          if (text) {
            assistantText += text + "\n\n";
          }
          j++;
        }
        
        if (assistantText.trim()) {
          conversationMarkdown += `### Assistant\n\n${assistantText.trim()}\n\n`;
        }
        
        // Skip ahead past the assistant messages we just processed
        i = j - 1;
      }
    }
    filename = document.title.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  } else if (hostname.includes("perplexity.ai")) {
    siteName = "Perplexity";
    document.querySelectorAll("h1").forEach(h1 => {
      const userQuery = h1.textContent.trim();
      conversationMarkdown += `---\n### User\n\n${userQuery}\n\n`;
      let answer = "";
      let parent = h1;
      for (let i = 0; i < 15 && parent; i++) {
        parent = parent.parentElement;
        if (!parent) break;
        const answerIdx = parent.textContent.indexOf("Answer");
        if (answerIdx > -1) {
          const afterAnswer = parent.textContent.substring(answerIdx + 6);
          const shareIdx = afterAnswer.indexOf("Share");
          answer = shareIdx > -1 ? afterAnswer.substring(0, shareIdx).trim() : afterAnswer.substring(0, 3000).trim();
          break;
        }
      }
      if (answer) {
        answer = answer.replace(/^(Sources|Steps|Answer).*?\n/, "").replace(/Sources·.*?Steps/, "").replace(/^\s+/, "").replace(/\n{3,}/g, "\n\n");
        conversationMarkdown += `### Assistant\n\n${answer}\n\n`;
      }
    });
    filename = document.title.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  } else if (hostname.includes("deepseek.com")) {
    siteName = "DeepSeek";
    const messages = document.querySelectorAll("div.fbb737a4, div.ds-markdown");
    messages.forEach(msg => {
      const header = msg.classList.contains("fbb737a4") ? "### User" : "### Assistant";
      const text = msg.innerText.trim();
      if (text) {
        conversationMarkdown += `${header}\n\n${text}\n\n---\n\n`;
      }
    });
    filename = document.title.replace(" - DeepSeek", "").trim().replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  } else if (hostname.includes("openrouter.ai")) {
    siteName = "OpenRouter";
    const lines = document.body.innerText.split("\n").map(l => l.trim()).filter(l => l);
    let firstQuery = "";
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line === "Chris" || line === "User") {
        i++;
        if (i < lines.length) {
          const query = lines[i];
          if (!firstQuery) {
            firstQuery = query.substring(0, 60);
          }
          conversationMarkdown += `---\n### User\n\n${query}\n\n`;
          i++;
          while (i < lines.length && lines[i].match(/(minute|hour|day|month)s? ago/)) {
            i++;
          }
        }
      } else if (line.match(/.*(free|paid)\)$/) || line === "Deleted") {
        const model = line === "Deleted" ? "Assistant" : line;
        conversationMarkdown += `### Assistant (${model})\n\n`;
        i++;
        if (lines[i]?.startsWith("Reasoning")) {
          conversationMarkdown += `**${lines[i]}**\n\n`;
          i += 2;
          while (i < lines.length && lines[i] !== "Collapse reasoning") {
            conversationMarkdown += lines[i] + "\n\n";
            i++;
          }
          i++;
        }
        let response = "";
        while (i < lines.length && !lines[i].match(/(minute|hour|day|month)s? ago/)) {
          if (lines[i] === "Chris" || lines[i] === "User" || lines[i].match(/.*(free|paid)\)$/) || lines[i] === "Deleted") {
            break;
          }
          response += lines[i] + "\n\n";
          i++;
        }
        if (response) {
          conversationMarkdown += response;
        }
        while (i < lines.length && lines[i].match(/(minute|hour|day|month)s? ago/)) {
          i++;
        }
      } else {
        i++;
      }
    }
    filename = firstQuery.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "openrouter_chat";
  } else if (hostname.includes("claude.ai")) {
    siteName = "Claude";
    const messages = document.querySelectorAll("div[data-test-render-count]");
    messages.forEach(msg => {
      const header = msg.closest('[class*="font-user"]') ? "### User" : "### Assistant";
      const text = msg.innerText.trim();
      if (text) {
        conversationMarkdown += `---\n${header}\n\n${text}\n\n`;
      }
    });
    filename = document.title.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  } else if (hostname.includes("gemini.google.com")) {
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
    // Get conversation title from active conversation in sidebar
    const activeConv = document.querySelector(".conversation.active, .conversation.selected, .conversation[aria-current=\"page\"]");
    const convTitle = activeConv?.querySelector(".conversation-title")?.textContent?.trim();
    filename = (convTitle || document.title).replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "gemini_chat";
  } else if (hostname.includes("aistudio.google.com")) {
    siteName = "Google AI Studio";
    const containers = document.querySelectorAll(".chat-turn-container");
    containers.forEach(container => {
      const isUser = container.classList.contains("user");
      const isModel = container.classList.contains("model");
      if (isUser || isModel) {
        const header = isUser ? "### User" : "### Assistant";
        let text = (container.textContent || "").trim();
        // Remove UI button text and labels
        text = text.replace(/^(edit|more_vert|User|Model|Thoughts|Expand to view model thoughts|chevron_right|content_copy|thumb_up|thumb_down|flag|share)+\s*/g, "")
                   .replace(/\s+(edit|more_vert|content_copy|thumb_up|thumb_down|flag|share)\s*$/g, "")
                   .replace(/Google Search Suggestions.*$/s, "")
                   .trim();
        if (text) {
          conversationMarkdown += `---\n${header}\n\n${text}\n\n`;
        }
      }
    });
    // Get chat name from h1 element
    const chatName = document.querySelector("h1")?.textContent?.trim();
    filename = (chatName || document.title).replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "ai_studio_chat";
  } else {
    alert("Unsupported chat site. Supported: ChatGPT, Perplexity, DeepSeek, OpenRouter, Claude, Gemini, Google AI Studio");
    return;
  }

  if (!conversationMarkdown) {
    alert("No conversation found to export");
    return;
  }

  const fullMarkdown = `[${siteName}](${url})\n\n${conversationMarkdown}`;
  const blob = new Blob([fullMarkdown], { type: "text/markdown" });
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `${filename || "chat_export"}.md`;
  downloadLink.click();
})();

