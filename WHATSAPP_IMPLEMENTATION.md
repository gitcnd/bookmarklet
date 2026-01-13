# WhatsApp Web Implementation

## ⚠️ Important: Manual Scroll Required for Long Chats

**Before exporting long chats, you MUST manually scroll to the very top first:**

1. Open the chat you want to export
2. Scroll up until you see "Click here to get older messages from your phone" (or the actual first message)
3. **Important**: Scroll down a few pages, then back up again - WhatsApp sometimes shows the "get older messages" prompt prematurely
4. Verify you're seeing the actual first message of the conversation
5. Now run the bookmarklet

This is necessary because WhatsApp Web's lazy-loading behavior is unreliable and the bookmarklet cannot always reach the true beginning of very long chats.

## Challenge

WhatsApp Web uses aggressive lazy-loading and DOM cleanup:
- Only messages currently in the viewport are rendered
- When you scroll, off-screen messages are removed from the DOM
- This prevents simple "read all messages at once" approaches

## Solution

The bookmarklet implements a scroll-and-capture strategy:

### 1. **Find the Scrollable Container**
```javascript
const findScrollContainer = () => {
  const allDivs = Array.from(document.querySelectorAll("div")).filter(d => {
    const style = window.getComputedStyle(d);
    return style.overflowY === "auto" || style.overflowY === "scroll";
  });
  return allDivs.find(d => d.querySelector("[data-pre-plain-text]"));
};
```

### 2. **Capture Messages Before They're Removed**
```javascript
const captureCurrentMessages = () => {
  const messages = document.querySelectorAll("[data-pre-plain-text]");
  messages.forEach(el => {
    const timestamp = el.getAttribute("data-pre-plain-text");
    const text = (el.innerText || el.textContent || "").trim();
    const isOutgoing = /* detect if message is from you */;
    
    // Use unique key to avoid duplicates
    const uniqueKey = timestamp + "|||" + text.substring(0, 50);
    if (!capturedMessages.has(uniqueKey)) {
      capturedMessages.set(uniqueKey, { timestamp, text, isOutgoing });
    }
  });
};
```

### 3. **Scroll Through Entire History**
```javascript
// Start at the top
scrollContainer.scrollTop = 0;
await new Promise(r => setTimeout(r, 500));
captureCurrentMessages();

// Scroll down incrementally
while (scrollCount < 200) {
  scrollContainer.scrollTop = Math.min(currentScrollTop + scrollStep, maxScroll);
  await new Promise(r => setTimeout(r, 150)); // Wait for content to load
  captureCurrentMessages(); // Capture newly visible messages
  
  // Stop if no new messages found
  if (capturedMessages.size === lastMessageCount) {
    sameCountStreak++;
    if (sameCountStreak > 3) break;
  }
  
  // Stop if we've reached the bottom
  if (currentScrollTop >= maxScroll - 10) break;
}
```

### 4. **Sort and Export**
```javascript
// Sort chronologically by timestamp
const allMessages = Array.from(capturedMessages.values()).sort((a, b) => {
  return a.timestamp.localeCompare(b.timestamp);
});

// Extract sender name from timestamp format: "[HH:MM, MM/DD/YYYY] Sender Name: "
allMessages.forEach(msg => {
  const role = msg.isOutgoing ? "You" : extractSenderName(msg.timestamp);
  markdown += `---\n### ${role}\n*${msg.timestamp.trim()}*\n\n${msg.text}\n\n`;
});
```

## Key Features

### Message Detection
- Uses `[data-pre-plain-text]` attribute to identify messages
- This attribute contains the full timestamp and sender name
- Format: `"[HH:MM, MM/DD/YYYY] Sender Name: "`

### Duplicate Prevention
- Uses `Map` with unique keys: `timestamp + "|||" + text.substring(0, 50)`
- Prevents capturing the same message multiple times as you scroll

### Sender Detection
- Outgoing messages: Detected by checking for `message-out` class in parent
- Incoming messages: Sender name extracted from timestamp attribute

### Performance Optimization
- **Scroll step**: 400px per iteration (balances speed vs. capture reliability)
- **Wait time**: 666ms between scrolls (allows WhatsApp to fetch messages from server)
- **Early exit**: Stops after 5 consecutive iterations with no new messages
- **Max iterations**: 500 (handles very long chats)

### Chat Name Extraction
```javascript
// Get chat name from selected chat in left sidebar
const selectedChat = document.querySelector('[aria-selected="true"]');
const chatName = selectedChat?.innerText?.split("\n")[0] || "WhatsApp_Chat";
```

### Timestamp Sorting
WhatsApp timestamps use `[HH:MM, MM/DD/YYYY]` format which doesn't sort lexicographically.
We parse them to proper Date objects for correct chronological sorting:
```javascript
const parseTimestamp = (ts) => {
  const match = ts.match(/\[(\d+):(\d+),\s*(\d+)\/(\d+)\/(\d+)\]/);
  if (!match) return 0;
  const [, hour, minute, month, day, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                  parseInt(hour), parseInt(minute)).getTime();
};
```

## Export Format

Filename: `whatsapp-Contact_Name.md`

```markdown
[WhatsApp](https://web.whatsapp.com/)

---
### You
*[21:20, 6/28/2025] Chris Drake:*

FYI - I'm hammering my ca9 server for a few days...

---
### Ben Duncan
*[21:33, 6/28/2025] Ben Duncan:*

Sounds good, hope you can crack it!
```

## Usage

1. **Open WhatsApp Web** (web.whatsapp.com)
2. **Open a chat** you want to export
3. **Scroll to the top** of the chat manually (see warning above)
4. **Scroll down a bit, then back up** to verify you're at the true top
5. **Click the bookmarklet**
6. **Wait** while it scrolls down and captures all messages
7. **Download** will start automatically when complete

## Limitations

- Very long chats (10,000+ messages) may take 30+ seconds to export
- Media (images, videos, audio) are not exported, only text
- Reactions and deleted messages are not captured
- Group chat participant changes are not captured

## Technical Notes

### Why Async?
WhatsApp export is the only platform that uses `async/await` because:
1. Scrolling must be done gradually to allow DOM updates
2. Each scroll requires a wait period for content to load
3. The entire process takes several seconds for long chats

### Timeout Values
- **Initial wait**: 666ms (after scrolling to top)
- **Scroll wait**: 666ms (between each scroll step - allows WhatsApp to load messages from server)
- Slower scroll speed prioritizes completeness over speed

### Edge Cases Handled
- Chat header not found → Uses "WhatsApp_Chat" as filename
- No messages found → Early exit with error
- Scroll container not found → Shows helpful error message
- Empty timestamps → Falls back to "Other" as sender name

## Future Improvements

Possible enhancements:
1. Media export (download images/videos/audio)
2. Reaction capture
3. Reply/quote context preservation
4. Progress indicator during scroll
5. Configurable scroll speed
6. Deleted message indicators
