# Nag Neutralizer bookmarklet

A second toolbar button to live alongside the `📗.md` chat exporter. One click
deactivates the junk a site puts between you and its content:

- full-viewport modal popups (adblock walls, subscribe boxes, cookie sheets)
- the dimming backdrop layers behind them
- transparent full-screen "click catcher" layers
- scroll locking (`overflow:hidden` or `position:fixed` tricks on html/body)
- paywall-style blur on article text
- text-selection blocking and `inert` interaction traps

## Installation

1. Create a new bookmark in your browser (ideally next to `📗.md`)
2. Name it whatever you like (suggestion: `🧹nags`)
3. Copy the one-line `javascript:...` from `nag_neutralizer_bookmarklet_minified.txt`
4. Paste it as the URL/Location of the bookmark

## Want to test it first?

Same trick as the chat exporter (Chrome blocks pasting `javascript:` into the
address bar as anti-self-XSS):

1. Open `nag_neutralizer_bookmarklet_minified.txt` and copy the whole line
   EXCEPT the leading `j` (i.e. copy `avascript:(()=>{...`)
2. Type `j` in Chrome's address bar
3. Paste the rest after it, hit Enter

A small dark toast appears bottom-right reporting what was deactivated.
Clicking it again is safe (it re-scans; it never stacks duplicate watchers).

## Strategy: deactivate, never remove

Sites commonly run a MutationObserver watching for their nag being REMOVED from
the DOM, and re-insert it (often with a fresh randomized class name) the moment
it disappears. So this bookmarklet never calls `element.remove()`. Instead it:

1. **Hides in place** with inline `display:none / visibility:hidden /
   pointer-events:none`, each set with `!important` priority so no stylesheet
   rule or class toggle can win. The node stays in the DOM, so removal-watchers
   see nothing missing. Each treated node is tagged with a
   `data-nag-neutralizer` attribute so re-runs skip it.
2. **Fights back**: our own MutationObserver per neutralized element re-asserts
   the hiding styles if the page flips them; a watchdog on html/body re-unlocks
   scrolling if the page re-locks it; and for 30 seconds after any activity a
   1-second rescan catches freshly INSERTED replacement overlays (the observers
   handle changes to existing nodes; the rescan handles brand-new ones).
3. **Stands down gracefully**: when the 30s window closes with no retaliation,
   elements the page never fought for get their observers disconnected (no more
   busywork), but the `!important` inline styles stay pinned for the life of the
   page -- everything neutralized was actively blocking you at click time, so it
   never deserves to come back. (Live testing on TechCrunch proved that relaxing
   the priority lets a stylesheet rule with `!important` silently win `display`
   back.) Elements the page DID fight for keep their armed observers too. If a
   site script resurrects something by overwriting the whole `style` attribute
   after stand-down, one more click re-neutralizes it.

## What counts as a nag (the generic detector)

An element is neutralized when ALL of these hold:

- `position:fixed` or `position:absolute`, AND
- z-index >= 100, AND
- covers >= 60% of the viewport, AND
- it blocks pointer events OR visibly dims (opacity >= 0.05 with a
  non-transparent background), AND
- if its z-index is below 10000: its visible text is under 3500 chars (a huge
  low-z layer full of text is the page content wrapper itself, never a nag --
  overlays only ever hold a short message).

Separately, self-declared modals (`dialog[open]`, `[role=dialog]`,
`[aria-modal=true]`) are neutralized by role regardless of size (native
`<dialog>` is `close()`d first so its `::backdrop` stops painting), and any
element with a `blur()` filter over more than 300 chars of text is unblurred.

Scroll/interaction restoration on html/body covers: `overflow-y:hidden|clip`
(reset to `auto`), the `position:fixed; top:-scrollY` lock (reset to `static`
and the reading position restored from the negative top offset), plus
`user-select:none`, `pointer-events:none`, and `touch-action:none`.

## Multifunction dispatch (like the chat exporter)

The chat exporter branches per-site on `hostname` to pick an extraction
strategy. This bookmarklet is the inverse shape: a generic engine that handles
most sites, plus a `site_specific_nag_removal_actions_by_hostname_fragment`
dispatch table for sites needing bespoke extra steps before the generic pass.
Add an entry like:

```js
"example.com": () => { /* click the hidden consent-reject button, etc. */ }
```

`techcrunch.com` is present as a documented no-op: its Admiral adblock-wall
(two stacked max-z-index fixed layers: an `rgba(0,0,0,0.85)` dimmer at
z=2147483645 and a transparent flex click-catcher at z=2147483646, with a third
`rgba(0,0,0,0.4)` backdrop at z=2147483647) and its inline `overflow:hidden`
scroll lock on BOTH html and body are all caught by the generic engine
(verified live 2026-07-14; survived a 30s watch window with no retaliation).

## Files

- `nag_neutralizer_bookmarklet_source.js` - readable, commented source
- `create_nag_neutralizer_bookmarklet.js` - terser build script (same pattern
  and percent-encoding guard as `create_bookmarklet.js`; see `01_readme.md`
  for why `%` + two hex digits must never appear in a bookmarklet)
- `nag_neutralizer_bookmarklet_minified.txt` - the line you put on the toolbar

## Building after changes

```bash
node create_nag_neutralizer_bookmarklet.js
```

(or just `make`, which now builds both bookmarklets and syncs the folder).

## Limitations

- Overlays inside closed shadow roots or cross-origin iframes are unreachable
  from a bookmarklet.
- Sites that gate CONTENT server-side (only send you the article after payment)
  cannot be fixed client-side; this tool only defeats client-side nagging.
- If a site inserts nags later than 30s after your click, click again.
