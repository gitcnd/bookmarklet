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
    
    // Check if this is a shared conversation (uses different structure)
    const sharedUserMessages = document.querySelectorAll(".user-message-bubble-color");
    const sharedAssistantMessages = document.querySelectorAll("div[data-message-author-role='assistant']");
    
    if (sharedUserMessages.length > 0) {
      // Shared conversation format
      const userArray = Array.from(sharedUserMessages);
      const assistantArray = Array.from(sharedAssistantMessages);
      
      for (let i = 0; i < Math.max(userArray.length, assistantArray.length); i++) {
        if (i < userArray.length) {
          const userText = (userArray[i].textContent || "").trim();
          if (userText) {
            conversationMarkdown += `---\n### User\n\n${userText}\n\n`;
          }
        }
        if (i < assistantArray.length) {
          const assistantText = (assistantArray[i].textContent || "").trim();
          if (assistantText) {
            conversationMarkdown += `### Assistant\n\n${assistantText}\n\n`;
          }
        }
      }
    } else {
      // Regular conversation format
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
    }
    filename = document.title.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  } else if (hostname.includes("perplexity.ai")) {
    siteName = "Perplexity";
    // Perplexity uses virtualized/lazy-loaded DOM, so we fetch data via their REST API
    // Extract thread ID from URL: /search/{threadId} or similar patterns
    const pathMatch = window.location.pathname.match(/\/search\/([^/?]+)/);
    const threadId = pathMatch ? pathMatch[1] : null;
    if (threadId) {
      // Use async IIFE to fetch API data - this makes the bookmarklet async
      (async () => {
        try {
          const response = await fetch(`/rest/thread/${threadId}`, { credentials: "include" });
          if (!response.ok) throw new Error(`API returned ${response.status}`);
          const data = await response.json();
          const entries = data.entries || [];
          entries.forEach(entry => {
            try {
              const steps = JSON.parse(entry.text);
              const userQuery = steps.find(s => s.step_type === "INITIAL_QUERY")?.content?.query;
              const finalStep = steps.find(s => s.step_type === "FINAL")?.content?.answer;
              if (userQuery) {
                conversationMarkdown += `---\n### User\n\n${userQuery}\n\n`;
              }
              if (finalStep) {
                try {
                  const answerObj = JSON.parse(finalStep);
                  if (answerObj.answer) {
                    conversationMarkdown += `### Assistant\n\n${answerObj.answer}\n\n`;
                  }
                } catch {
                  conversationMarkdown += `### Assistant\n\n${finalStep}\n\n`;
                }
              }
            } catch {}
          });
          // Generate and trigger download
          filename = document.title.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
          const fullMarkdown = `[${siteName}](${url})\n\n${conversationMarkdown}`;
          const blob = new Blob([fullMarkdown], { type: "text/markdown" });
          const downloadLink = document.createElement("a");
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = `${filename || "chat_export"}.md`;
          downloadLink.click();
        } catch (e) {
          alert(`Failed to fetch Perplexity thread: ${e.message}`);
        }
      })();
      return; // Exit early - async handler will complete the download
    }
    // Fallback to DOM scraping if API fails or no thread ID found
    const userQueryElements = document.querySelectorAll('[class*="group/query"]');
    const answerBlocks = document.querySelectorAll('div[class*="prose dark:prose-invert inline leading-relaxed"]');
    userQueryElements.forEach((queryEl, idx) => {
      const userQuery = queryEl.textContent?.trim();
      if (!userQuery) return;
      conversationMarkdown += `---\n### User\n\n${userQuery}\n\n`;
      if (idx < answerBlocks.length) {
        let answerText = answerBlocks[idx].innerText?.trim() || "";
        answerText = answerText.replace(/^(Sources|Reviewed \d+ sources?)\s*/gi, "")
                               .replace(/\n{3,}/g, "\n\n")
                               .trim();
        if (answerText) {
          conversationMarkdown += `### Assistant\n\n${answerText}\n\n`;
        }
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

