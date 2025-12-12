// Test script for ChatGPT extraction
// Paste this into the browser console on a ChatGPT conversation page

(() => {
  console.log("=== ChatGPT Extraction Test ===");
  
  const messages = document.querySelectorAll("div[data-message-author-role]");
  const messageArray = Array.from(messages);
  
  console.log(`Found ${messageArray.length} total message elements`);
  
  let conversationMarkdown = "";
  let userCount = 0;
  let assistantCount = 0;
  
  for (let i = 0; i < messageArray.length; i++) {
    const msg = messageArray[i];
    const role = msg.getAttribute("data-message-author-role");
    
    if (role === "user") {
      userCount++;
      
      // User message - get text from .whitespace-pre-wrap or textContent
      const preWrap = msg.querySelector(".whitespace-pre-wrap");
      const userText = preWrap ? (preWrap.innerText || preWrap.textContent || "").trim() : (msg.textContent || "").trim();
      
      console.log(`\nUser message ${userCount}:`, userText.substring(0, 80) + "...");
      
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
        assistantCount++;
        console.log(`Assistant response ${assistantCount}:`, assistantText.trim().substring(0, 80) + "...");
        conversationMarkdown += `### Assistant\n\n${assistantText.trim()}\n\n`;
      } else {
        console.warn(`No assistant response found after user message ${userCount}`);
      }
      
      // Skip ahead past the assistant messages we just processed
      i = j - 1;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`User messages: ${userCount}`);
  console.log(`Assistant responses: ${assistantCount}`);
  console.log(`Total markdown length: ${conversationMarkdown.length} characters`);
  console.log(`\n=== First 500 chars of markdown ===`);
  console.log(conversationMarkdown.substring(0, 500));
  
  // Return the full markdown for inspection
  return {
    userCount,
    assistantCount,
    markdown: conversationMarkdown,
    preview: conversationMarkdown.substring(0, 1000)
  };
})();



