// Bookmarklet to export AI chat conversations to Markdown
// Supports: ChatGPT, Perplexity, DeepSeek, OpenRouter, Claude, Gemini, Google AI Studio, X.com, Grok, Microsoft Copilot, M365 Copilot, WhatsApp, Z.ai, Qwen, Teams, Slack Threads
// Version: 3.8.0

(() => {
  const VERSION = "3.8.0";
  console.log(`[Bookmarklet v${VERSION}] Starting extraction...`);
  
  const hostname = window.location.hostname;
  const url = window.location.href;
  let conversationMarkdown = "";
  let filename = "";
  let siteName = "";
  
  console.log(`[Bookmarklet v${VERSION}] Hostname: ${hostname}`);

  if (hostname.includes("chatgpt.com")) {
    siteName = "ChatGPT";
    // Three extraction strategies, tried in order:
    //   1. Backend API (full conversation from server, handles any length)
    //   2. React fiber tree (client-side state, no network, good fallback)
    //   3. DOM scraping (visible messages only, last resort)
    const chatgpt_conversation_id_from_url = window.location.pathname.match(/\/c\/([a-f0-9-]+)/)?.[1];
    if (chatgpt_conversation_id_from_url) {
      (async () => {
        let chatgpt_extraction_method_that_succeeded = "";

        // Strategy 1: Backend API -- fetches the full conversation tree from the server,
        // including messages the lazy-loading UI never rendered.
        try {
          const chatgpt_session_response = await fetch("/api/auth/session", { credentials: "include" });
          if (!chatgpt_session_response.ok) { throw new Error("Session fetch returned " + chatgpt_session_response.status); }
          const chatgpt_session_data = await chatgpt_session_response.json();
          if (!chatgpt_session_data.accessToken) { throw new Error("No accessToken in session"); }

          const chatgpt_api_conversation_response = await fetch(
            "/backend-api/conversation/" + chatgpt_conversation_id_from_url,
            { credentials: "include", headers: { "Authorization": "Bearer " + chatgpt_session_data.accessToken } }
          );
          if (!chatgpt_api_conversation_response.ok) { throw new Error("Conversation API returned " + chatgpt_api_conversation_response.status); }
          const chatgpt_api_conversation_data = await chatgpt_api_conversation_response.json();

          const chatgpt_api_node_mapping = chatgpt_api_conversation_data.mapping;
          const chatgpt_api_ordered_messages = [];
          let chatgpt_api_current_node_id = chatgpt_api_conversation_data.current_node;
          let chatgpt_api_walk_counter = 0;
          while (chatgpt_api_current_node_id && chatgpt_api_walk_counter < 10000) {
            const chatgpt_api_current_node = chatgpt_api_node_mapping[chatgpt_api_current_node_id];
            if (!chatgpt_api_current_node) { break; }
            const chatgpt_api_node_message = chatgpt_api_current_node.message;
            if (chatgpt_api_node_message && chatgpt_api_node_message.author) {
              const chatgpt_api_author_role = chatgpt_api_node_message.author.role;
              const chatgpt_api_content_type = chatgpt_api_node_message.content?.content_type;
              if ((chatgpt_api_author_role === "user" || chatgpt_api_author_role === "assistant") && (chatgpt_api_content_type === "text" || chatgpt_api_content_type === "multimodal_text")) {
                const chatgpt_api_content_parts = chatgpt_api_node_message.content?.parts || [];
                const chatgpt_api_text_parts = chatgpt_api_content_parts.filter(p => typeof p === "string");
                const chatgpt_api_joined_text = chatgpt_api_text_parts.join("\n");
                if (chatgpt_api_joined_text.length > 0) {
                  chatgpt_api_ordered_messages.unshift({ role: chatgpt_api_author_role, text: chatgpt_api_joined_text });
                }
              }
            }
            chatgpt_api_current_node_id = chatgpt_api_current_node.parent;
            chatgpt_api_walk_counter++;
          }
          if (chatgpt_api_ordered_messages.length > 0) {
            chatgpt_extraction_method_that_succeeded = "api";
            for (const chatgpt_api_msg of chatgpt_api_ordered_messages) {
              const chatgpt_api_role_header = chatgpt_api_msg.role === "user" ? "### User" : "### Assistant";
              conversationMarkdown += `---\n${chatgpt_api_role_header}\n\n${chatgpt_api_msg.text}\n\n`;
            }
            console.log(`[Bookmarklet v${VERSION}] ChatGPT: extracted ${chatgpt_api_ordered_messages.length} messages from backend API`);
          }
        } catch (chatgpt_api_extraction_error) {
          console.log(`[Bookmarklet v${VERSION}] ChatGPT API extraction failed: ${chatgpt_api_extraction_error.message}, trying React tree`);
        }

        // Strategy 2: React fiber tree -- walks the client-side conversation state.
        if (!chatgpt_extraction_method_that_succeeded) {
          try {
            const chatgpt_any_message_element = document.querySelector("[data-message-id]");
            if (chatgpt_any_message_element) {
              const chatgpt_react_fiber_key = Object.keys(chatgpt_any_message_element).find(k => k.startsWith("__reactFiber"));
              if (chatgpt_react_fiber_key) {
                let chatgpt_fiber_walker = chatgpt_any_message_element[chatgpt_react_fiber_key];
                let chatgpt_conversation_object = null;
                for (let chatgpt_depth = 0; chatgpt_depth < 15 && chatgpt_fiber_walker; chatgpt_depth++) {
                  if (chatgpt_fiber_walker.memoizedProps?.conversation) {
                    chatgpt_conversation_object = chatgpt_fiber_walker.memoizedProps.conversation;
                    break;
                  }
                  chatgpt_fiber_walker = chatgpt_fiber_walker.return;
                }
                if (chatgpt_conversation_object) {
                  const chatgpt_symbol_properties = Object.getOwnPropertySymbols(chatgpt_conversation_object);
                  let chatgpt_conversation_tree = null;
                  for (const chatgpt_sym of chatgpt_symbol_properties) {
                    try {
                      const chatgpt_signal_value = chatgpt_conversation_object[chatgpt_sym];
                      const chatgpt_resolved_value = typeof chatgpt_signal_value === "function" ? chatgpt_signal_value() : chatgpt_signal_value;
                      if (chatgpt_resolved_value && typeof chatgpt_resolved_value === "object" && chatgpt_resolved_value.tree && chatgpt_resolved_value.tree.nodes) {
                        chatgpt_conversation_tree = chatgpt_resolved_value.tree;
                        break;
                      }
                    } catch (chatgpt_signal_error) {}
                  }
                  if (chatgpt_conversation_tree) {
                    const chatgpt_all_nodes = chatgpt_conversation_tree.nodes;
                    const chatgpt_leaf_id = chatgpt_conversation_tree.currentLeafId;
                    const chatgpt_node_uuid_to_index = {};
                    for (const chatgpt_idx of Object.keys(chatgpt_all_nodes)) {
                      chatgpt_node_uuid_to_index[chatgpt_all_nodes[chatgpt_idx].id] = chatgpt_idx;
                    }
                    const chatgpt_ordered_branch_messages = [];
                    let chatgpt_current_node_index = chatgpt_node_uuid_to_index[chatgpt_leaf_id];
                    let chatgpt_traversal_safety_counter = 0;
                    while (chatgpt_current_node_index !== undefined && chatgpt_traversal_safety_counter < 10000) {
                      const chatgpt_current_node = chatgpt_all_nodes[chatgpt_current_node_index];
                      if (!chatgpt_current_node) { break; }
                      const chatgpt_node_message = chatgpt_current_node.message;
                      if (chatgpt_node_message && chatgpt_node_message.author) {
                        const chatgpt_author_role = chatgpt_node_message.author.role;
                        const chatgpt_content_type = chatgpt_node_message.content?.content_type;
                        if ((chatgpt_author_role === "user" || chatgpt_author_role === "assistant") && (chatgpt_content_type === "text" || chatgpt_content_type === "multimodal_text")) {
                          const chatgpt_content_parts = chatgpt_node_message.content?.parts || [];
                          const chatgpt_text_only_parts = chatgpt_content_parts.filter(p => typeof p === "string");
                          const chatgpt_joined_text = chatgpt_text_only_parts.join("\n");
                          if (chatgpt_joined_text.length > 0) {
                            chatgpt_ordered_branch_messages.unshift({ role: chatgpt_author_role, text: chatgpt_joined_text });
                          }
                        }
                      }
                      const chatgpt_parent_uuid = chatgpt_current_node.parentId;
                      chatgpt_current_node_index = chatgpt_parent_uuid ? chatgpt_node_uuid_to_index[chatgpt_parent_uuid] : undefined;
                      chatgpt_traversal_safety_counter++;
                    }
                    if (chatgpt_ordered_branch_messages.length > 0) {
                      chatgpt_extraction_method_that_succeeded = "react_tree";
                      for (const chatgpt_msg of chatgpt_ordered_branch_messages) {
                        const chatgpt_role_header = chatgpt_msg.role === "user" ? "### User" : "### Assistant";
                        conversationMarkdown += `---\n${chatgpt_role_header}\n\n${chatgpt_msg.text}\n\n`;
                      }
                      console.log(`[Bookmarklet v${VERSION}] ChatGPT: extracted ${chatgpt_ordered_branch_messages.length} messages from React state tree`);
                    }
                  }
                }
              }
            }
          } catch (chatgpt_react_extraction_error) {
            console.log(`[Bookmarklet v${VERSION}] ChatGPT React tree extraction failed: ${chatgpt_react_extraction_error.message}, falling back to DOM`);
          }
        }

        // Strategy 3: DOM scraping -- captures only what is currently visible in the viewport.
        if (!chatgpt_extraction_method_that_succeeded) {
          console.log(`[Bookmarklet v${VERSION}] ChatGPT: falling back to DOM scraping`);
          const chatgpt_dom_message_elements = document.querySelectorAll("div[data-message-author-role]");
          const chatgpt_dom_message_array = Array.from(chatgpt_dom_message_elements);
          for (let i = 0; i < chatgpt_dom_message_array.length; i++) {
            const chatgpt_dom_current_message = chatgpt_dom_message_array[i];
            const chatgpt_dom_current_role = chatgpt_dom_current_message.getAttribute("data-message-author-role");
            if (chatgpt_dom_current_role === "user") {
              const chatgpt_dom_pre_wrap_element = chatgpt_dom_current_message.querySelector(".whitespace-pre-wrap");
              const chatgpt_dom_user_text = chatgpt_dom_pre_wrap_element
                ? (chatgpt_dom_pre_wrap_element.innerText || chatgpt_dom_pre_wrap_element.textContent || "").trim()
                : (chatgpt_dom_current_message.textContent || "").trim();
              if (chatgpt_dom_user_text) { conversationMarkdown += `---\n### User\n\n${chatgpt_dom_user_text}\n\n`; }
            } else if (chatgpt_dom_current_role === "assistant") {
              const chatgpt_dom_assistant_text = (chatgpt_dom_current_message.textContent || "").trim();
              if (chatgpt_dom_assistant_text) { conversationMarkdown += `### Assistant\n\n${chatgpt_dom_assistant_text}\n\n`; }
            }
          }
          if (conversationMarkdown) { chatgpt_extraction_method_that_succeeded = "dom"; }
        }

        if (!conversationMarkdown) {
          console.log(`[Bookmarklet v${VERSION}] ERROR: No conversation content extracted from ChatGPT`);
          alert(`No conversation found to export\n\nBookmarklet v${VERSION}\nSite: ChatGPT\nAll 3 extraction strategies failed.\nCheck browser console for details.`);
          return;
        }

        filename = document.title.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
        const fullMarkdown = `[${siteName}](${url})\n\n${conversationMarkdown}`;
        const blob = new Blob([fullMarkdown], { type: "text/markdown" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${filename || "chat_export"}.md`;
        downloadLink.click();
        console.log(`[Bookmarklet v${VERSION}] Download triggered: ${filename || "chat_export"}.md (method: ${chatgpt_extraction_method_that_succeeded})`);
      })();
      return; // Exit early -- async handler completes the download
    }
    // Fallback for ChatGPT pages without a /c/ path (e.g. temporary chats at /?temporary-chat=true).
    // The 3-strategy async block above only runs when a conversation ID is in the URL, but
    // temporary chats have messages in the DOM despite having no /c/ path.  Scrape them here.
    const chatgpt_temp_chat_dom_elements = document.querySelectorAll("div[data-message-author-role]");
    const chatgpt_temp_chat_dom_array = Array.from(chatgpt_temp_chat_dom_elements);
    for (let chatgpt_temp_index = 0; chatgpt_temp_index < chatgpt_temp_chat_dom_array.length; chatgpt_temp_index++) {
      const chatgpt_temp_current_message = chatgpt_temp_chat_dom_array[chatgpt_temp_index];
      const chatgpt_temp_current_role = chatgpt_temp_current_message.getAttribute("data-message-author-role");
      if (chatgpt_temp_current_role === "user") {
        const chatgpt_temp_pre_wrap_element = chatgpt_temp_current_message.querySelector(".whitespace-pre-wrap");
        const chatgpt_temp_user_text = chatgpt_temp_pre_wrap_element
          ? (chatgpt_temp_pre_wrap_element.innerText || chatgpt_temp_pre_wrap_element.textContent || "").trim()
          : (chatgpt_temp_current_message.textContent || "").trim();
        if (chatgpt_temp_user_text) { conversationMarkdown += `---\n### User\n\n${chatgpt_temp_user_text}\n\n`; }
      } else if (chatgpt_temp_current_role === "assistant") {
        const chatgpt_temp_assistant_text = (chatgpt_temp_current_message.textContent || "").trim();
        if (chatgpt_temp_assistant_text) { conversationMarkdown += `### Assistant\n\n${chatgpt_temp_assistant_text}\n\n`; }
      }
    }
    if (conversationMarkdown) {
      console.log(`[Bookmarklet v${VERSION}] ChatGPT: extracted ${chatgpt_temp_chat_dom_array.length} messages via DOM (no /c/ path, likely temporary chat)`);
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
    // Use Claude's API for reliable extraction including artifacts
    const claude_chat_id_from_url = window.location.pathname.split("/").pop();
    if (claude_chat_id_from_url) {
      (async () => {
        try {
          const claude_org_api_response = await fetch("/api/organizations", { credentials: "include" });
          if (!claude_org_api_response.ok) { throw new Error("Failed to fetch organizations"); }
          const claude_organizations_list = await claude_org_api_response.json();
          if (!claude_organizations_list.length) { throw new Error("No organizations found"); }
          let claude_conversation_data = null;
          for (const claude_candidate_org of claude_organizations_list) {
            const claude_candidate_org_response = await fetch(
              `/api/organizations/${claude_candidate_org.uuid}/chat_conversations/${claude_chat_id_from_url}?tree=True&rendering_mode=messages&render_all_tools=true`,
              { credentials: "include" }
            );
            if (claude_candidate_org_response.ok) {
              claude_conversation_data = await claude_candidate_org_response.json();
              break;
            }
          }
          if (!claude_conversation_data) { throw new Error("Chat not found in any organization"); }
          const claude_chat_messages_array = claude_conversation_data.chat_messages || [];
          claude_chat_messages_array.forEach(claude_single_message => {
            const claude_message_sender_is_human = claude_single_message.sender === "human";
            const claude_message_role_header = claude_message_sender_is_human ? "### User" : "### Assistant";
            const claude_content_blocks_array = claude_single_message.content || [];
            let claude_assembled_message_text = "";
            let claude_assembled_artifact_sections = "";
            claude_content_blocks_array.forEach(claude_content_block => {
              if (claude_content_block.type === "text" && claude_content_block.text) {
                const claude_text_without_unsupported_block_markers = claude_content_block.text
                  .replace(/\n```\nThis block is not supported on your current device yet\.\n```\n/g, "")
                  .trim();
                if (claude_text_without_unsupported_block_markers) {
                  claude_assembled_message_text += claude_text_without_unsupported_block_markers + "\n\n";
                }
              } else if (claude_content_block.type === "tool_use" && claude_content_block.input) {
                if (claude_content_block.name === "create_file" && claude_content_block.input.file_text) {
                  const claude_artifact_file_name = claude_content_block.input.path
                    ? claude_content_block.input.path.split("/").pop()
                    : "artifact";
                  const claude_artifact_description_text = claude_content_block.input.description || "";
                  claude_assembled_artifact_sections += `\n---\n#### Artifact: ${claude_artifact_file_name}\n`;
                  if (claude_artifact_description_text) {
                    claude_assembled_artifact_sections += `*${claude_artifact_description_text}*\n\n`;
                  }
                  claude_assembled_artifact_sections += claude_content_block.input.file_text + "\n\n";
                }
              }
            });
            const claude_combined_text_with_artifacts = (claude_assembled_message_text + claude_assembled_artifact_sections).trim();
            if (claude_combined_text_with_artifacts) {
              conversationMarkdown += `---\n${claude_message_role_header}\n\n${claude_combined_text_with_artifacts}\n\n`;
            }
          });
          filename = document.title.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
          const fullMarkdown = `[${siteName}](${url})\n\n${conversationMarkdown}`;
          const blob = new Blob([fullMarkdown], { type: "text/markdown" });
          const downloadLink = document.createElement("a");
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = `${filename || "chat_export"}.md`;
          downloadLink.click();
        } catch (claude_api_extraction_error) {
          console.log(`[Bookmarklet v${VERSION}] Claude API extraction failed: ${claude_api_extraction_error.message}, falling back to DOM`);
          // DOM fallback: use data-testid to distinguish user vs assistant
          const claude_dom_message_elements = document.querySelectorAll("div[data-test-render-count]");
          claude_dom_message_elements.forEach(claude_dom_msg_element => {
            const claude_dom_msg_contains_user_testid = !!claude_dom_msg_element.querySelector('[data-testid="user-message"]');
            const claude_dom_role_header = claude_dom_msg_contains_user_testid ? "### User" : "### Assistant";
            const claude_dom_msg_text = claude_dom_msg_element.innerText.trim();
            if (claude_dom_msg_text) {
              conversationMarkdown += `---\n${claude_dom_role_header}\n\n${claude_dom_msg_text}\n\n`;
            }
          });
          filename = document.title.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
          const fullMarkdown = `[${siteName}](${url})\n\n${conversationMarkdown}`;
          const blob = new Blob([fullMarkdown], { type: "text/markdown" });
          const downloadLink = document.createElement("a");
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = `${filename || "chat_export"}.md`;
          downloadLink.click();
        }
      })();
      return;
    }
    // Fallback for non-chat Claude pages
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
  } else if (hostname.includes("grok.com") || (hostname.includes("x.com") && url.includes("/i/grok"))) {
    siteName = "Grok";
    console.log(`[Bookmarklet v${VERSION}] Detected Grok interface`);
    
    // Check if this is the new x.com/i/grok interface
    if (hostname.includes("x.com") && url.includes("/i/grok")) {
      console.log(`[Bookmarklet v${VERSION}] Using X.com Grok extraction`);
      
      // New X.com embedded Grok interface
      const primaryCol = document.querySelector('[data-testid="primaryColumn"]');
      console.log(`[Bookmarklet v${VERSION}] primaryColumn found:`, !!primaryCol);
      
      if (primaryCol) {
        const fullText = primaryCol.innerText;
        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        console.log(`[Bookmarklet v${VERSION}] Total lines:`, lines.length);
        console.log(`[Bookmarklet v${VERSION}] First 5 lines:`, lines.slice(0, 5));
        
        // Find where "Thought for" or "Thoughts" appears - this separates user message from Grok response
        let thoughtIndex = lines.findIndex(l => l.includes('Thought for'));
        console.log(`[Bookmarklet v${VERSION}] "Thought for" index:`, thoughtIndex);
        
        if (thoughtIndex === -1) {
          thoughtIndex = lines.findIndex(l => l === 'Thoughts');
          console.log(`[Bookmarklet v${VERSION}] "Thoughts" index:`, thoughtIndex);
        }
        
        if (thoughtIndex > 0) {
          console.log(`[Bookmarklet v${VERSION}] Found separator at line ${thoughtIndex}`);
          
          // Extract user message (everything before "Thought for"/"Thoughts")
          const userMessage = lines.slice(0, thoughtIndex).filter(l => 
            !l.includes('See new posts') && 
            !l.includes('Home') && 
            !l.includes('Explore') &&
            l.length > 10
          ).join('\n');
          
          // Extract Grok response (everything from "Thought for"/"Thoughts" onwards)
          const grokResponse = lines.slice(thoughtIndex).join('\n');
          
          console.log(`[Bookmarklet v${VERSION}] User message length:`, userMessage.length);
          console.log(`[Bookmarklet v${VERSION}] Grok response length:`, grokResponse.length);
          
          if (userMessage) {
            conversationMarkdown += `---\n### User\n\n${userMessage}\n\n`;
            filename = userMessage.substring(0, 60);
          }
          
          if (grokResponse) {
            conversationMarkdown += `### Grok\n\n${grokResponse}\n\n`;
          }
        } else {
          console.log(`[Bookmarklet v${VERSION}] ERROR: No separator found (thoughtIndex=${thoughtIndex})`);
          console.log(`[Bookmarklet v${VERSION}] Lines around potential separator:`, lines.slice(0, 10));
        }
      } else {
        console.log(`[Bookmarklet v${VERSION}] ERROR: primaryColumn not found`);
      }
    } else {
      // Old grok.com interface
      const messageBubbles = document.querySelectorAll(".message-bubble");
      let firstUserMessage = "";
      
      messageBubbles.forEach((bubble, idx) => {
        const text = bubble.innerText?.trim();
        if (!text || text.length < 20) return;
        
        // Determine if this is a user or assistant message
        // User messages have bg-surface-l1 class or are in containers with items-end
        const isUser = bubble.classList.contains("bg-surface-l1") || bubble.closest('[class*="items-end"]');
        const role = isUser ? "User" : "Assistant";
        
        // Capture first user message for filename
        if (isUser && !firstUserMessage) {
          firstUserMessage = text.substring(0, 60);
        }
        
        conversationMarkdown += `---\n### ${role}\n\n${text}\n\n`;
      });
      
      filename = firstUserMessage;
    }
    
    // Generate filename from first user message or title
    filename = (filename || document.title).replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "grok_chat";
  } else if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
    siteName = "X";
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    let originalPosterHandle = "";
    let firstTweetText = "";
    
    articles.forEach((article, idx) => {
      // Extract handle from user link
      const userNameEl = article.querySelector('[data-testid="User-Name"]');
      const userLinks = userNameEl ? Array.from(userNameEl.querySelectorAll('a[href^="/"]')) : [];
      let handle = "";
      for (const a of userLinks) {
        const href = a.getAttribute("href");
        if (href && href.startsWith("/") && !href.includes("/status/") && href.length > 1) {
          handle = href;
          break;
        }
      }
      
      // Get display name
      const displayName = userNameEl?.querySelector("span span")?.textContent || "";
      
      // Get tweet text
      const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
      const fullText = tweetTextEl?.innerText || "";
      
      // Get timestamp
      const timestamp = article.querySelector("time")?.getAttribute("datetime") || "";
      const formattedTime = timestamp ? new Date(timestamp).toLocaleString() : "";
      
      // Get images (filter to actual content images, not emoji or avatars)
      const images = Array.from(article.querySelectorAll("img"))
        .map(img => img.src)
        .filter(src => src && src.includes("pbs.twimg.com") && !src.includes("profile_images") && !src.includes("emoji"));
      
      // Get link card URL if present
      const cardLink = article.querySelector('[data-testid="card.wrapper"] a')?.href || "";
      
      // Track the original poster (first tweet's author)
      if (idx === 0) {
        originalPosterHandle = handle;
        firstTweetText = fullText.substring(0, 60);
      }
      
      // Determine if this is from the original poster or a reply
      const isOriginalPosterPost = handle === originalPosterHandle;
      const authorLabel = isOriginalPosterPost ? `**${displayName}** (${handle})` : `**${displayName}** (${handle}) — Reply`;
      
      // Build the markdown for this tweet
      conversationMarkdown += `---\n### ${authorLabel}\n`;
      if (formattedTime) {
        conversationMarkdown += `*${formattedTime}*\n\n`;
      }
      conversationMarkdown += `${fullText}\n\n`;
      
      // Add images
      if (images.length > 0) {
        images.forEach((imgSrc, imgIdx) => {
          // Use larger image format instead of 'small'
          const largerSrc = imgSrc.replace("name=small", "name=large");
          conversationMarkdown += `![Image ${imgIdx + 1}](${largerSrc})\n\n`;
        });
      }
      
      // Add card link if present
      if (cardLink) {
        conversationMarkdown += `🔗 [Link](${cardLink})\n\n`;
      }
    });
    
    // Generate filename from first tweet text or title
    filename = (firstTweetText || document.title).replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "x_thread";
  } else if (hostname.includes("copilot.microsoft.com")) {
    siteName = "Microsoft Copilot";
    const articles = document.querySelectorAll('div[role="article"]');
    
    articles.forEach((article, idx) => {
      const text = article.innerText?.trim();
      if (!text || text.length < 10) return;
      
      // Determine if this is a user or assistant message based on class
      const isUser = article.classList.contains("group/user-message");
      const isAssistant = article.classList.contains("group/ai-message");
      
      if (isUser) {
        // Remove "You said" prefix if present
        const cleanText = text.replace(/^You said\s*/i, '').trim();
        conversationMarkdown += `---\n### User\n\n${cleanText}\n\n`;
        if (idx === 0) {
          filename = cleanText.substring(0, 60);
        }
      } else if (isAssistant) {
        // Remove "Copilot said" and "See my thinking" prefixes if present
        const cleanText = text
          .replace(/^Copilot said\s*/i, '')
          .replace(/^See my thinking\s*/i, '')
          .trim();
        conversationMarkdown += `### Assistant\n\n${cleanText}\n\n`;
      }
    });
    
    filename = (filename || document.title).replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "copilot_chat";
  } else if (hostname.includes("m365.cloud.microsoft")) {
    siteName = "Microsoft 365 Copilot";
    // M365 Copilot (BizChat) uses Fluent AI components with a virtualizer.
    // Each conversation turn is a div[data-virtualizer-index] containing a
    // .fai-UserMessage article and a .fai-CopilotMessage article.
    const m365_feed_container = document.querySelector('[role="feed"]');
    if (m365_feed_container) {
      const m365_virtualized_turn_elements = m365_feed_container.querySelectorAll('[data-virtualizer-index]');
      m365_virtualized_turn_elements.forEach((m365_single_turn_element, m365_turn_index) => {
        // Extract user message from the dedicated message div
        const m365_user_message_content_div = m365_single_turn_element.querySelector('.fai-UserMessage .fai-UserMessage__message');
        if (m365_user_message_content_div) {
          const m365_user_visible_text = m365_user_message_content_div.innerText.trim();
          if (m365_user_visible_text) {
            conversationMarkdown += `---\n### User\n\n${m365_user_visible_text}\n\n`;
            if (m365_turn_index === 0) {
              filename = m365_user_visible_text.substring(0, 60);
            }
          }
        }
        // Extract copilot response from the content div, excluding toolbar/actions
        const m365_copilot_message_article = m365_single_turn_element.querySelector('.fai-CopilotMessage');
        if (m365_copilot_message_article) {
          const m365_copilot_content_div = m365_copilot_message_article.querySelector('.fai-CopilotMessage__content');
          if (m365_copilot_content_div) {
            // Clone and strip non-content elements for clean text extraction
            const m365_content_clone_for_text_extraction = m365_copilot_content_div.cloneNode(true);
            // Remove reasoning chain-of-thought toggle ("Reasoning completed in N steps")
            const m365_reasoning_chain_of_thought_block = m365_content_clone_for_text_extraction.querySelector('.scc-ChainOfThought');
            if (m365_reasoning_chain_of_thought_block) { m365_reasoning_chain_of_thought_block.remove(); }
            // Remove citation buttons (they duplicate link text already in the response)
            const m365_citation_and_action_buttons = m365_content_clone_for_text_extraction.querySelectorAll('button');
            m365_citation_and_action_buttons.forEach(m365_btn => m365_btn.remove());
            const m365_copilot_response_text = m365_content_clone_for_text_extraction.innerText.trim();
            if (m365_copilot_response_text) {
              conversationMarkdown += `### Assistant\n\n${m365_copilot_response_text}\n\n`;
            }
          }
        }
      });
    }
    filename = (filename || document.title).replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "m365_copilot_chat";
  } else if (hostname === "z.ai" || hostname.endsWith(".z.ai")) {
    siteName = "Z.ai";
    // Z.ai runs an Open WebUI-based frontend: user turns carry class "chat-user" and
    // assistant turns carry "chat-assistant", already interleaved in document order.
    const zai_message_content_elements_in_document_order = document.querySelectorAll(".chat-user, .chat-assistant");
    zai_message_content_elements_in_document_order.forEach(zai_single_message_element => {
      const zai_single_message_is_from_user = zai_single_message_element.classList.contains("chat-user");
      const zai_role_header = zai_single_message_is_from_user ? "### User" : "### Assistant";
      let zai_message_visible_text = zai_single_message_element.innerText || "";
      // Assistant turns are prefixed by a collapsible "Thought Process" reasoning block; strip it so only the answer is exported.
      const zai_thinking_chain_block = zai_single_message_element.querySelector(".thinking-chain-container");
      if (zai_thinking_chain_block) {
        const zai_thinking_chain_text = zai_thinking_chain_block.innerText || "";
        if (zai_thinking_chain_text && zai_message_visible_text.indexOf(zai_thinking_chain_text) === 0) {
          zai_message_visible_text = zai_message_visible_text.slice(zai_thinking_chain_text.length);
        }
      }
      zai_message_visible_text = zai_message_visible_text.trim();
      if (zai_message_visible_text) { conversationMarkdown += `---\n${zai_role_header}\n\n${zai_message_visible_text}\n\n`; }
      if (zai_single_message_is_from_user && !filename) { filename = zai_message_visible_text.substring(0, 60); }
    });
    filename = (filename || document.title).replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "zai_chat";
  } else if (hostname.includes("qwencloud.com")) {
    siteName = "Qwen";
    const qwen_chat_bubble_elements_in_document_order = document.querySelectorAll('.ant-bubble[data-role]');
    qwen_chat_bubble_elements_in_document_order.forEach(qwen_single_bubble_element => {
      const qwen_bubble_role_attribute = qwen_single_bubble_element.getAttribute('data-role');
      const qwen_bubble_content_wrapper = qwen_single_bubble_element.querySelector('.ant-bubble-content');
      if (!qwen_bubble_content_wrapper) { return; }
      // Strip deep-thinking accordion blocks if present (reasoning chain, not final answer)
      const qwen_deep_thinking_accordion_block = qwen_bubble_content_wrapper.querySelector('.ant-accordion-deep-thinking');
      let qwen_message_visible_text = "";
      if (qwen_deep_thinking_accordion_block) {
        const qwen_thinking_block_text = qwen_deep_thinking_accordion_block.innerText || "";
        const qwen_full_content_text = qwen_bubble_content_wrapper.innerText || "";
        if (qwen_thinking_block_text && qwen_full_content_text.indexOf(qwen_thinking_block_text) === 0) {
          qwen_message_visible_text = qwen_full_content_text.slice(qwen_thinking_block_text.length);
        } else {
          qwen_message_visible_text = qwen_full_content_text;
        }
      } else {
        qwen_message_visible_text = qwen_bubble_content_wrapper.innerText || "";
      }
      qwen_message_visible_text = qwen_message_visible_text.trim();
      if (!qwen_message_visible_text) { return; }
      const qwen_role_header = qwen_bubble_role_attribute === "user" ? "### User" : "### Assistant";
      conversationMarkdown += `---\n${qwen_role_header}\n\n${qwen_message_visible_text}\n\n`;
      if (qwen_bubble_role_attribute === "user" && !filename) {
        filename = qwen_message_visible_text.substring(0, 60);
      }
    });
    filename = (filename || document.title).replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "qwen_chat";
  } else if (hostname.includes("web.whatsapp.com")) {
    siteName = "WhatsApp";
    
    // WhatsApp uses lazy loading - DOM is a sliding window through time
    // We scroll to top, then capture messages as we scroll down
    (async () => {
      try {
        const capturedMessages = [];
        const seenKeys = new Set();
        
        // Find the scrollable container that holds messages
        const findScrollContainer = () => {
          const allDivs = Array.from(document.querySelectorAll("div")).filter(d => {
            const style = window.getComputedStyle(d);
            return style.overflowY === "auto" || style.overflowY === "scroll";
          });
          return allDivs.find(d => d.querySelector("[data-pre-plain-text]"));
        };
        
        // Capture all currently visible messages (in DOM order = chronological)
        const captureCurrentMessages = () => {
          const messages = document.querySelectorAll("[data-pre-plain-text]");
          messages.forEach(el => {
            const timestamp = el.getAttribute("data-pre-plain-text") || "";
            // Use .copyable-text for actual message content (avoids link preview text)
            const copyable = el.querySelector(".copyable-text, [class*='copyable-text']");
            const text = (copyable?.innerText || el.innerText || "").trim();
            const parent = el.closest('[class*="message-"]');
            const isOutgoing = parent?.classList.toString().includes("message-out") || false;
            
            // Use timestamp + text snippet as unique key
            const uniqueKey = timestamp + "|||" + text.substring(0, 50);
            if (!seenKeys.has(uniqueKey)) {
              seenKeys.add(uniqueKey);
              capturedMessages.push({ timestamp, text, isOutgoing });
            }
          });
        };
        
        // Show toast notification (auto-dismisses)
        const showToast = (msg, duration) => {
          const toast = document.createElement("div");
          toast.textContent = msg;
          toast.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:999999;font-family:sans-serif;font-size:14px;";
          document.body.appendChild(toast);
          if (duration) setTimeout(() => toast.remove(), duration);
          return toast;
        };
        
        // Wait for loading to complete (watches scrollHeight changes)
        const waitForLoad = async (container, maxWait) => {
          const start = Date.now();
          let lastHeight = container.scrollHeight;
          while (Date.now() - start < maxWait) {
            await new Promise(r => setTimeout(r, 100));
            if (container.scrollHeight !== lastHeight) {
              lastHeight = container.scrollHeight;
            } else if (Date.now() - start > 300) {
              break; // Stable for 300ms, assume loaded
            }
          }
        };
        
        const scrollContainer = findScrollContainer();
        if (!scrollContainer) {
          alert("Could not find WhatsApp message container. Make sure a chat is open.");
          return;
        }
        
        // Get chat name from selected chat in left sidebar
        const selectedChat = document.querySelector('[aria-selected="true"]');
        const chatName = selectedChat?.innerText?.split("\n")[0] || "WhatsApp_Chat";
        
        const statusToast = showToast("Scrolling to top...");
        
        // Phase 1: Scroll to the very top, loading all older messages
        let lastHeight = 0;
        let stuckCount = 0;
        while (stuckCount < 5) {
          scrollContainer.scrollTop = 0;
          await waitForLoad(scrollContainer, 2000);
          
          if (scrollContainer.scrollHeight === lastHeight) {
            stuckCount++;
          } else {
            lastHeight = scrollContainer.scrollHeight;
            stuckCount = 0;
          }
          
          // If we're at the top and height stopped changing, we're done
          if (scrollContainer.scrollTop === 0 && stuckCount >= 2) break;
        }
        
        captureCurrentMessages();
        
        // Phase 2: Scroll down capturing messages as we go
        const scrollStep = 600;
        const statusUpdateInterval = 50; // Separate variable to avoid %50 URL encoding issue in bookmarklet
        let scrollIterations = 0;
        
        while (scrollIterations < 5000) {
          const currentScrollTop = scrollContainer.scrollTop;
          const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
          
          // Update status periodically
          if (scrollIterations % statusUpdateInterval === 0) {
            statusToast.textContent = "Capturing... " + capturedMessages.length + " messages";
          }
          
          // Scroll down
          scrollContainer.scrollTop = Math.min(currentScrollTop + scrollStep, maxScroll);
          
          // Wait for content to load
          await waitForLoad(scrollContainer, 2000);
          
          // Capture newly visible messages
          captureCurrentMessages();
          scrollIterations++;
          
          // Check if we've reached the bottom
          if (scrollContainer.scrollTop >= maxScroll - 10) {
            // Final capture at the bottom
            await new Promise(r => setTimeout(r, 500));
            captureCurrentMessages();
            break;
          }
        }
        
        statusToast.remove();
        
        // Build markdown (messages are already in chronological order from DOM)
        let markdown = "";
        capturedMessages.forEach(msg => {
          // Extract sender name from timestamp format: "[HH:MM, MM/DD/YYYY] Sender Name: "
          let role = "Other";
          if (msg.isOutgoing) {
            role = "You";
          } else {
            const match = msg.timestamp.match(/\]\s*([^:]+):/);
            if (match) {
              role = match[1].trim();
            }
          }
          
          markdown += "---\n### " + role + "\n*" + msg.timestamp.trim() + "*\n\n" + msg.text + "\n\n";
        });
        
        const safeFilename = "whatsapp-" + chatName.replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
        
        // Trigger download
        const fullMarkdown = "[" + siteName + "](" + url + ")\n\n" + markdown;
        const blob = new Blob([fullMarkdown], { type: "text/markdown" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = safeFilename + ".md";
        downloadLink.click();
        
        showToast("Exported " + capturedMessages.length + " messages from " + chatName, 3000);
      } catch (e) {
        alert("Error exporting WhatsApp chat: " + e.message);
      }
    })();
    return; // Exit early - async handler will complete the download
  } else if (hostname.includes("teams.cloud.microsoft")) {
    siteName = "Microsoft Teams";
    // Teams meeting transcript extraction via SharePoint API.
    // The transcript lives inside a cross-origin SharePoint iframe, so we:
    //   1. Walk the React fiber tree of the xplatIframe to find the SharePoint embed URL
    //   2. Parse the SharePoint host, personal-site path, and recording uniqueId from that URL
    //   3. Use the MSAL-cached SharePoint access token from localStorage
    //   4. Call the SharePoint v2.1 media/transcripts API for the JSON transcript (includes speaker names)
    //   5. Format entries into markdown with speaker attribution and timestamps
    (async () => {
      try {
        const teams_xplat_iframe_element = document.getElementById("xplatIframe");
        if (!teams_xplat_iframe_element) {
          alert("No meeting recap found.\n\nPlease open a meeting with a recording/transcript, then run the bookmarklet again.");
          return;
        }

        // Walk React fiber tree to find the xPlatUrl prop
        const teams_react_fiber_key = Object.keys(teams_xplat_iframe_element).find(k => k.startsWith("__reactFiber") || k.startsWith("__reactInternalInstance"));
        let teams_xplat_embed_url = "";
        if (teams_react_fiber_key) {
          let teams_fiber_node = teams_xplat_iframe_element[teams_react_fiber_key];
          for (let teams_fiber_depth = 0; teams_fiber_depth < 15 && teams_fiber_node; teams_fiber_depth++) {
            if (teams_fiber_node.memoizedProps?.xPlatUrl) {
              teams_xplat_embed_url = teams_fiber_node.memoizedProps.xPlatUrl;
              break;
            }
            teams_fiber_node = teams_fiber_node.return;
          }
        }
        if (!teams_xplat_embed_url) {
          alert("Could not find meeting recording URL.\n\nMake sure you are viewing a meeting recap with a transcript.");
          return;
        }

        console.log(`[Bookmarklet v${VERSION}] Teams: found xPlatUrl, extracting transcript via SharePoint API`);

        // Parse SharePoint host, personal-site path, and uniqueId from the embed URL
        const teams_embed_url_parsed = new URL(teams_xplat_embed_url);
        const teams_sharepoint_origin = teams_embed_url_parsed.origin;
        const teams_personal_site_path_match = teams_embed_url_parsed.pathname.match(/^(\/personal\/[^/]+)/);
        const teams_personal_site_path = teams_personal_site_path_match ? teams_personal_site_path_match[1] : "";
        const teams_recording_unique_id = teams_embed_url_parsed.searchParams.get("uniqueId");

        if (!teams_recording_unique_id || !teams_personal_site_path) {
          alert("Could not parse meeting recording details from the embed URL.");
          return;
        }

        // Find the MSAL-cached access token for this SharePoint host
        const teams_sharepoint_hostname_prefix = teams_embed_url_parsed.hostname.split(".")[0];
        const teams_msal_token_key = Object.keys(localStorage).find(k =>
          k.includes("accesstoken") && k.includes(teams_sharepoint_hostname_prefix + ".sharepoint.com")
        );
        if (!teams_msal_token_key) {
          alert("No SharePoint authentication token found.\n\nPlease make sure you are signed in to Microsoft Teams.");
          return;
        }
        let teams_sharepoint_access_token = "";
        try {
          teams_sharepoint_access_token = JSON.parse(localStorage.getItem(teams_msal_token_key)).secret;
        } catch (teams_token_parse_error) {
          alert("Failed to read SharePoint authentication token.");
          return;
        }
        if (!teams_sharepoint_access_token) {
          alert("SharePoint authentication token is empty or expired.\n\nTry refreshing the Teams page and running again.");
          return;
        }

        const teams_sp_auth_headers = { "Authorization": "Bearer " + teams_sharepoint_access_token };

        // Step 1: Look up the drive ID from the personal site
        const teams_drive_info_response = await fetch(
          teams_sharepoint_origin + teams_personal_site_path + "/_api/v2.1/drive?$select=id",
          { headers: teams_sp_auth_headers, mode: "cors" }
        );
        if (!teams_drive_info_response.ok) {
          throw new Error("Drive lookup failed: " + teams_drive_info_response.status);
        }
        const teams_drive_info_data = await teams_drive_info_response.json();
        const teams_drive_id = teams_drive_info_data.id;

        // Step 2: List available transcripts for this recording
        const teams_transcript_list_response = await fetch(
          teams_sharepoint_origin + "/_api/v2.1/drives/" + teams_drive_id + "/items/" + teams_recording_unique_id + "/media/transcripts",
          { headers: teams_sp_auth_headers, mode: "cors" }
        );
        if (!teams_transcript_list_response.ok) {
          throw new Error("Transcript list failed: " + teams_transcript_list_response.status);
        }
        const teams_transcript_list_data = await teams_transcript_list_response.json();
        const teams_first_transcript = teams_transcript_list_data.value?.[0];
        if (!teams_first_transcript) {
          alert("No transcript found for this meeting recording.");
          return;
        }

        // Step 3: Download the transcript JSON (includes speaker names and timestamps)
        const teams_transcript_content_response = await fetch(
          teams_sharepoint_origin + "/_api/v2.1/drives/" + teams_drive_id + "/items/" + teams_recording_unique_id + "/media/transcripts/" + teams_first_transcript.id + "/content?format=json",
          { headers: teams_sp_auth_headers, mode: "cors" }
        );
        if (!teams_transcript_content_response.ok) {
          throw new Error("Transcript content failed: " + teams_transcript_content_response.status);
        }
        const teams_transcript_json_data = await teams_transcript_content_response.json();
        const teams_transcript_entries = teams_transcript_json_data.entries || [];

        if (teams_transcript_entries.length === 0) {
          alert("Transcript is empty.");
          return;
        }

        console.log(`[Bookmarklet v${VERSION}] Teams: got ${teams_transcript_entries.length} transcript entries from ${[...new Set(teams_transcript_entries.map(e => e.speakerDisplayName))].length} speakers`);

        // Step 4: Format entries into markdown, grouping consecutive same-speaker lines
        let teams_current_speaker_name = "";
        let teams_current_speaker_start_time = "";
        let teams_current_speaker_text_lines = [];
        const teams_format_time_from_offset = (offset_string) => {
          // Convert "00:41:47.8250158" to "41:47"
          const teams_time_parts = offset_string.split(":");
          const teams_hours = parseInt(teams_time_parts[0], 10);
          const teams_minutes = parseInt(teams_time_parts[1], 10);
          const teams_seconds = parseInt(teams_time_parts[2], 10);
          if (teams_hours > 0) {
            return teams_hours + ":" + String(teams_minutes).padStart(2, "0") + ":" + String(teams_seconds).padStart(2, "0");
          }
          return teams_minutes + ":" + String(teams_seconds).padStart(2, "0");
        };
        const teams_flush_current_speaker_block = () => {
          if (teams_current_speaker_text_lines.length > 0) {
            conversationMarkdown += "---\n### " + teams_current_speaker_name + "\n*" + teams_current_speaker_start_time + "*\n\n" + teams_current_speaker_text_lines.join("\n") + "\n\n";
          }
        };
        for (const teams_single_entry of teams_transcript_entries) {
          const teams_entry_speaker = teams_single_entry.speakerDisplayName || "Unknown";
          const teams_entry_text = (teams_single_entry.text || "").trim();
          if (!teams_entry_text) { continue; }
          const teams_entry_start_time = teams_format_time_from_offset(teams_single_entry.startOffset || "00:00:00");
          if (teams_entry_speaker !== teams_current_speaker_name) {
            teams_flush_current_speaker_block();
            teams_current_speaker_name = teams_entry_speaker;
            teams_current_speaker_start_time = teams_entry_start_time;
            teams_current_speaker_text_lines = [teams_entry_text];
          } else {
            teams_current_speaker_text_lines.push(teams_entry_text);
          }
        }
        teams_flush_current_speaker_block();

        if (!conversationMarkdown) {
          alert("No transcript content extracted.");
          return;
        }

        filename = document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*\|\s*Microsoft Teams$/, "").replace(/^Chat\s*\|\s*/, "").replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "teams_transcript";
        const fullMarkdown = `[${siteName}](${url})\n\n${conversationMarkdown}`;
        const blob = new Blob([fullMarkdown], { type: "text/markdown" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${filename}.md`;
        downloadLink.click();
        console.log(`[Bookmarklet v${VERSION}] Teams: downloaded ${teams_transcript_entries.length} entries as ${filename}.md`);
      } catch (teams_extraction_error) {
        console.error(`[Bookmarklet v${VERSION}] Teams extraction failed:`, teams_extraction_error);
        alert("Failed to extract Teams transcript:\n" + teams_extraction_error.message + "\n\nCheck browser console for details.");
      }
    })();
    return;
  } else if (hostname.includes("app.slack.com")) {
    siteName = "Slack Thread";
    // Extracts messages from the thread panel (flexpane) visible on the right side of the Slack UI.
    // The thread panel uses class .p-flexpane--iap1 and contains [data-qa="message_container"] elements.
    // Slack groups consecutive messages from the same sender, showing the sender name only on the first
    // message in each group, so we carry the last known sender forward for messages without one.
    const slack_thread_panel_flexpane_element = document.querySelector('.p-flexpane--iap1');
    if (!slack_thread_panel_flexpane_element) {
      alert("No Slack thread panel found.\n\nPlease open a thread in the right-side panel first, then run the bookmarklet again.");
      return;
    }
    const slack_thread_message_container_elements = slack_thread_panel_flexpane_element.querySelectorAll('[data-qa="message_container"]');
    if (slack_thread_message_container_elements.length === 0) {
      alert("Thread panel is open but contains no messages.");
      return;
    }
    console.log(`[Bookmarklet v${VERSION}] Slack: found ${slack_thread_message_container_elements.length} messages in thread panel`);
    let slack_last_known_sender_name = "";
    for (const slack_single_message_element of slack_thread_message_container_elements) {
      const slack_sender_display_element = slack_single_message_element.querySelector('[data-qa="message_sender"]');
      const slack_sender_display_text = slack_sender_display_element?.textContent?.trim() || "";
      if (slack_sender_display_text) { slack_last_known_sender_name = slack_sender_display_text; }
      const slack_effective_sender_for_this_message = slack_sender_display_text || slack_last_known_sender_name || "Unknown";

      const slack_timestamp_element = slack_single_message_element.querySelector('[class*="c-timestamp"]');
      let slack_message_timestamp_text = slack_timestamp_element?.getAttribute("aria-label") || slack_timestamp_element?.textContent?.trim() || "";
      // Strip ". Open in channel" suffix that Slack appends to thread-message timestamps
      slack_message_timestamp_text = slack_message_timestamp_text.replace(/\.\s*Open in channel$/i, "").trim();

      // Extract message body, preserving code blocks as markdown fenced blocks
      const slack_message_body_blocks_element = slack_single_message_element.querySelector('[class*="c-message_kit__blocks"]');
      if (!slack_message_body_blocks_element) { continue; }

      const slack_body_clone_for_text_extraction = slack_message_body_blocks_element.cloneNode(true);
      const slack_code_block_pre_elements_in_clone = slack_body_clone_for_text_extraction.querySelectorAll('pre');
      for (const slack_pre_element of slack_code_block_pre_elements_in_clone) {
        const slack_code_raw_text = slack_pre_element.textContent || "";
        // Replace the <pre> with a text node containing markdown fenced code
        const slack_fenced_code_replacement = document.createTextNode("\n```\n" + slack_code_raw_text + "\n```\n");
        slack_pre_element.replaceWith(slack_fenced_code_replacement);
      }
      let slack_assembled_message_text = (slack_body_clone_for_text_extraction.innerText || "").trim();
      if (!slack_assembled_message_text) { continue; }

      // Append file attachment names if present
      const slack_file_name_display_elements = slack_single_message_element.querySelectorAll('.c-file_name, [data-qa="file_name"]');
      if (slack_file_name_display_elements.length > 0) {
        const slack_unique_attached_file_names = [...new Set(
          Array.from(slack_file_name_display_elements).map(el => el.textContent?.trim()).filter(Boolean)
        )];
        if (slack_unique_attached_file_names.length > 0) {
          slack_assembled_message_text += "\n\n**Attachments:** " + slack_unique_attached_file_names.join(", ");
        }
      }

      conversationMarkdown += "---\n### " + slack_effective_sender_for_this_message + "\n";
      if (slack_message_timestamp_text) {
        conversationMarkdown += "*" + slack_message_timestamp_text + "*\n\n";
      }
      conversationMarkdown += slack_assembled_message_text + "\n\n";
    }
    // Parse channel name from page title: "channel-name (Channel) - WorkspaceName - N new items - Slack"
    const slack_channel_name_from_page_title = document.title
      .replace(/\s*-\s*\d+\s*new\s*items?\s*/gi, " ")
      .match(/^([^(]+)/)?.[1]?.trim() || "";
    filename = ("slack_thread_" + slack_channel_name_from_page_title)
      .replace(/[^\w\d\s]+/g, "").replace(/\s+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "slack_thread";
    console.log(`[Bookmarklet v${VERSION}] Slack: extracted thread from #${slack_channel_name_from_page_title}`);
  } else {
    alert("Unsupported site. Supported: ChatGPT, Perplexity, DeepSeek, OpenRouter, Claude, Gemini, Google AI Studio, X.com, Grok, Microsoft Copilot, M365 Copilot, WhatsApp, Z.ai, Qwen, Teams, Slack Threads");
    return;
  }

  if (!conversationMarkdown) {
    console.log(`[Bookmarklet v${VERSION}] ERROR: No conversation content extracted`);
    console.log(`[Bookmarklet v${VERSION}] Site: ${siteName}, Hostname: ${hostname}`);
    alert(`No conversation found to export\n\nBookmarklet v${VERSION}\nSite detected: ${siteName || 'Unknown'}\nCheck browser console for details.`);
    return;
  }
  
  console.log(`[Bookmarklet v${VERSION}] Successfully extracted ${conversationMarkdown.length} characters`);

  const fullMarkdown = `[${siteName}](${url})\n\n${conversationMarkdown}`;
  const blob = new Blob([fullMarkdown], { type: "text/markdown" });
  const downloadLink = document.createElement("a");
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = `${filename || "chat_export"}.md`;
  downloadLink.click();
  
  console.log(`[Bookmarklet v${VERSION}] Download triggered: ${filename || "chat_export"}.md`);
})();

