// Nag Neutralizer bookmarklet
// One click deactivates the junk a site puts between you and its content:
//   - full-viewport modal popups and their dimming backdrops
//   - transparent full-screen "click catcher" layers
//   - scroll locking (overflow:hidden or position:fixed tricks on html/body)
//   - content blurring, text-selection blocking, and "inert" interaction traps
//
// Design rules (see NAG_NEUTRALIZER_README.md for the full story):
//   1. DEACTIVATE, never remove: pages watch for their nag nodes disappearing and
//      re-insert them. We hide with inline !important styles and leave the node in
//      the DOM, so removal-watchers see nothing missing.
//   2. FIGHT BACK: a MutationObserver per neutralized element re-asserts our styles
//      if the page flips them back, and a 30-second rescan window catches freshly
//      inserted replacement overlays. When the window closes quietly the element
//      observers are disconnected to stop the busywork, but the !important inline
//      styles stay pinned forever: everything we neutralized was actively blocking
//      the page at click time, so it never deserves to come back. (Live testing on
//      TechCrunch proved relaxing the priority lets stylesheet !important rules
//      silently win "display" back.) Re-clicking re-neutralizes anything a site
//      script resurrected by overwriting the style attribute after stand-down.
//   3. MULTIFUNCTION: like the chat-export bookmarklet in this folder, a hostname
//      dispatch table allows site-specific extra actions when the generic engine is
//      not enough for a particular site.
// Version: 1.0.0

(() => {
  const NAG_NEUTRALIZER_VERSION = "1.0.0";
  const current_page_hostname = window.location.hostname;
  if (!document.body) { return; }
  console.log("[NagNeutralizer v" + NAG_NEUTRALIZER_VERSION + "] activated on " + current_page_hostname);

  // Per-page state stored on window so repeated clicks re-scan instead of stacking
  // duplicate observers and intervals.
  const previously_installed_page_state = window.__nag_neutralizer_page_state__;
  const nag_neutralizer_page_state = previously_installed_page_state || {
    neutralized_element_records: [],
    root_element_watchdog_observers: [],
    rescan_interval_handle: null,
    rescan_window_deadline_epoch_ms: 0,
    total_neutralized_count: 0
  };
  window.__nag_neutralizer_page_state__ = nag_neutralizer_page_state;

  const RESCAN_WINDOW_DURATION_MS = 30000;
  const RESCAN_TICK_INTERVAL_MS = 1000;
  const FULLSCREEN_VIEWPORT_COVERAGE_THRESHOLD = 0.6;
  const MINIMUM_OVERLAY_Z_INDEX = 100;
  const Z_INDEX_TRUSTED_AS_OVERLAY_WITHOUT_TEXT_CHECK = 10000;
  const MAXIMUM_TEXT_LENGTH_FOR_LOW_Z_OVERLAYS = 3500;

  const parse_numeric_z_index_treating_auto_as_zero = (computed_style) => {
    const parsed_z_index = parseInt(computed_style.zIndex, 10);
    if (isNaN(parsed_z_index)) { return 0; }
    return parsed_z_index;
  };

  const fraction_of_viewport_covered_by_element = (element_to_measure) => {
    const element_bounding_rect = element_to_measure.getBoundingClientRect();
    const horizontal_overlap_px = Math.max(0, Math.min(element_bounding_rect.right, window.innerWidth) - Math.max(element_bounding_rect.left, 0));
    const vertical_overlap_px = Math.max(0, Math.min(element_bounding_rect.bottom, window.innerHeight) - Math.max(element_bounding_rect.top, 0));
    return (horizontal_overlap_px * vertical_overlap_px) / (window.innerWidth * window.innerHeight);
  };

  // Alpha of the computed backgroundColor: Chrome serializes any non-opaque color as
  // "rgba(r, g, b, a)" and fully opaque ones as "rgb(r, g, b)", so no regex is needed
  // (and avoiding regex keeps backslashes out of the bookmarklet entirely).
  const background_color_alpha_from_computed_style = (computed_style) => {
    const background_color_string = computed_style.backgroundColor || "";
    if (background_color_string.indexOf("rgba(") === 0) {
      const rgba_component_list = background_color_string.slice(5, -1).split(",");
      return parseFloat(rgba_component_list[3]);
    }
    if (background_color_string.indexOf("rgb(") === 0) { return 1; }
    return 0;
  };

  const apply_inline_deactivation_styles_with_important_priority = (element_to_hide) => {
    element_to_hide.style.setProperty("display", "none", "important");
    element_to_hide.style.setProperty("visibility", "hidden", "important");
    element_to_hide.style.setProperty("pointer-events", "none", "important");
  };

  const neutralize_one_overlay_element_and_watch_for_reactivation = (overlay_element, reason_label) => {
    // Native <dialog> keeps painting its ::backdrop until closed, so close it first
    // (the element itself still stays in the DOM).
    if (overlay_element.tagName === "DIALOG") { try { overlay_element.close(); } catch (dialog_close_error) {} }
    apply_inline_deactivation_styles_with_important_priority(overlay_element);
    overlay_element.setAttribute("data-nag-neutralizer", reason_label);
    const neutralized_element_record = { element: overlay_element, page_fought_back_count: 0, mutation_observer: null };
    const reactivation_watcher = new MutationObserver(() => {
      const current_computed_style = getComputedStyle(overlay_element);
      if (current_computed_style.display !== "none" || current_computed_style.visibility !== "hidden") {
        neutralized_element_record.page_fought_back_count = neutralized_element_record.page_fought_back_count + 1;
        apply_inline_deactivation_styles_with_important_priority(overlay_element);
        overlay_element.setAttribute("data-nag-neutralizer", reason_label);
        begin_or_extend_rescan_window();
        console.log("[NagNeutralizer] page tried to reactivate a nag; re-deactivated it", overlay_element);
      }
    });
    reactivation_watcher.observe(overlay_element, { attributes: true, attributeFilter: ["style", "class", "hidden", "open"] });
    neutralized_element_record.mutation_observer = reactivation_watcher;
    nag_neutralizer_page_state.neutralized_element_records.push(neutralized_element_record);
    nag_neutralizer_page_state.total_neutralized_count = nag_neutralizer_page_state.total_neutralized_count + 1;
    console.log("[NagNeutralizer] deactivated (" + reason_label + ")", overlay_element);
  };

  // Generic engine part 1: find and deactivate blocking overlay layers.
  const scan_document_and_neutralize_blocking_overlays = () => {
    let newly_neutralized_count = 0;
    for (const candidate_element of document.querySelectorAll("body *")) {
      if (candidate_element.getAttribute("data-nag-neutralizer") !== null) { continue; }
      const candidate_computed_style = getComputedStyle(candidate_element);
      if (candidate_computed_style.display === "none" || candidate_computed_style.visibility === "hidden") { continue; }
      // Paywall-style blur on real content is a nag too; decorative blurs sit on
      // elements with little or no text, which the text-length gate protects.
      if (candidate_computed_style.filter.indexOf("blur(") !== -1) {
        const blurred_visible_text_length = (candidate_element.innerText || "").length;
        if (blurred_visible_text_length > 300) {
          candidate_element.style.setProperty("filter", "none", "important");
          candidate_element.setAttribute("data-nag-neutralizer", "unblurred-content");
          newly_neutralized_count = newly_neutralized_count + 1;
          continue;
        }
      }
      if (candidate_computed_style.position !== "fixed" && candidate_computed_style.position !== "absolute") { continue; }
      const candidate_numeric_z_index = parse_numeric_z_index_treating_auto_as_zero(candidate_computed_style);
      if (candidate_numeric_z_index < MINIMUM_OVERLAY_Z_INDEX) { continue; }
      if (fraction_of_viewport_covered_by_element(candidate_element) < FULLSCREEN_VIEWPORT_COVERAGE_THRESHOLD) { continue; }
      const element_blocks_pointer_interaction = candidate_computed_style.pointerEvents !== "none";
      const element_visually_dims_the_page = parseFloat(candidate_computed_style.opacity) >= 0.05 && background_color_alpha_from_computed_style(candidate_computed_style) >= 0.1;
      if (!element_blocks_pointer_interaction && !element_visually_dims_the_page) { continue; }
      // A large low-z-index layer full of text is almost certainly the page content
      // wrapper itself, never a nag; overlays hold at most a short message.
      if (candidate_numeric_z_index < Z_INDEX_TRUSTED_AS_OVERLAY_WITHOUT_TEXT_CHECK) {
        const candidate_visible_text_length = (candidate_element.innerText || "").length;
        if (candidate_visible_text_length > MAXIMUM_TEXT_LENGTH_FOR_LOW_Z_OVERLAYS) { continue; }
      }
      neutralize_one_overlay_element_and_watch_for_reactivation(candidate_element, "fullscreen-overlay");
      newly_neutralized_count = newly_neutralized_count + 1;
    }
    // Self-declared modal dialogs (cookie sheets, subscribe boxes) can be smaller than
    // full-viewport and below the z-index gate, so handle them by role instead.
    for (const declared_dialog_element of document.querySelectorAll("dialog[open], [role=dialog], [aria-modal=true]")) {
      if (declared_dialog_element.getAttribute("data-nag-neutralizer") !== null) { continue; }
      const dialog_computed_style = getComputedStyle(declared_dialog_element);
      if (dialog_computed_style.display === "none" || dialog_computed_style.visibility === "hidden") { continue; }
      if (dialog_computed_style.position !== "fixed" && dialog_computed_style.position !== "absolute") { continue; }
      neutralize_one_overlay_element_and_watch_for_reactivation(declared_dialog_element, "declared-dialog");
      newly_neutralized_count = newly_neutralized_count + 1;
    }
    return newly_neutralized_count;
  };

  // Generic engine part 2: restore scrolling and interaction on html/body. Inline
  // !important longhands beat any stylesheet rule or class the page toggles.
  const unlock_scrolling_and_interaction_on_root_element = (root_element) => {
    const root_computed_style = getComputedStyle(root_element);
    if (root_computed_style.overflowY === "hidden" || root_computed_style.overflowY === "clip") { root_element.style.setProperty("overflow-y", "auto", "important"); }
    if (root_computed_style.position === "fixed") {
      // The body-position:fixed scroll lock parks the page at top:-scrollY; restore
      // both the layout and the reading position.
      const scroll_lock_top_offset_px = parseFloat(root_computed_style.top);
      root_element.style.setProperty("position", "static", "important");
      if (scroll_lock_top_offset_px < 0) { window.scrollTo(0, 0 - scroll_lock_top_offset_px); }
    }
    if (root_computed_style.userSelect === "none") { root_element.style.setProperty("user-select", "auto", "important"); }
    if (root_computed_style.pointerEvents === "none") { root_element.style.setProperty("pointer-events", "auto", "important"); }
    if (root_computed_style.touchAction === "none") { root_element.style.setProperty("touch-action", "auto", "important"); }
  };

  const install_root_element_scroll_watchdog_once = (root_element) => {
    if (root_element.getAttribute("data-nag-neutralizer-root-watchdog") === "installed") { return; }
    root_element.setAttribute("data-nag-neutralizer-root-watchdog", "installed");
    const root_relock_watcher = new MutationObserver(() => {
      const watched_computed_style = getComputedStyle(root_element);
      if (watched_computed_style.overflowY === "hidden" || watched_computed_style.overflowY === "clip" || watched_computed_style.position === "fixed") {
        begin_or_extend_rescan_window();
        unlock_scrolling_and_interaction_on_root_element(root_element);
        console.log("[NagNeutralizer] page re-locked scrolling; unlocked it again", root_element);
      }
    });
    root_relock_watcher.observe(root_element, { attributes: true, attributeFilter: ["style", "class"] });
    nag_neutralizer_page_state.root_element_watchdog_observers.push(root_relock_watcher);
  };

  // The inert attribute blocks ALL interaction with a subtree (modal libraries put it
  // on the page content). There is no style override for it, so removing the attribute
  // is the only cure; the rescan window re-removes it if the page puts it back.
  const release_inert_interaction_traps = () => {
    for (const inert_trapped_element of document.querySelectorAll("[inert]")) {
      inert_trapped_element.removeAttribute("inert");
      console.log("[NagNeutralizer] removed inert interaction trap", inert_trapped_element);
    }
  };

  const run_full_neutralization_pass = () => {
    const newly_neutralized_count = scan_document_and_neutralize_blocking_overlays();
    unlock_scrolling_and_interaction_on_root_element(document.documentElement);
    unlock_scrolling_and_interaction_on_root_element(document.body);
    install_root_element_scroll_watchdog_once(document.documentElement);
    install_root_element_scroll_watchdog_once(document.body);
    release_inert_interaction_traps();
    return newly_neutralized_count;
  };

  // After the window closes quietly, disconnect observers for elements the page
  // never tried to re-show (stop the busywork), but KEEP the !important inline
  // styles pinned: TechCrunch's stylesheet carries display rules tagged !important,
  // which instantly won the element back when we relaxed the priority during live
  // testing. Elements the page DID fight for keep their armed observers for the
  // life of the page.
  const stand_down_observers_for_elements_the_page_never_fought_for = () => {
    for (const neutralized_record of nag_neutralizer_page_state.neutralized_element_records) {
      if (neutralized_record.page_fought_back_count === 0 && neutralized_record.mutation_observer !== null) {
        neutralized_record.mutation_observer.disconnect();
        neutralized_record.mutation_observer = null;
      }
    }
  };

  const begin_or_extend_rescan_window = () => {
    nag_neutralizer_page_state.rescan_window_deadline_epoch_ms = Date.now() + RESCAN_WINDOW_DURATION_MS;
    if (nag_neutralizer_page_state.rescan_interval_handle !== null) { return; }
    nag_neutralizer_page_state.rescan_interval_handle = setInterval(() => {
      run_full_neutralization_pass();
      if (Date.now() > nag_neutralizer_page_state.rescan_window_deadline_epoch_ms) {
        clearInterval(nag_neutralizer_page_state.rescan_interval_handle);
        nag_neutralizer_page_state.rescan_interval_handle = null;
        stand_down_observers_for_elements_the_page_never_fought_for();
        console.log("[NagNeutralizer] page stayed quiet; rescan window closed");
      }
    }, RESCAN_TICK_INTERVAL_MS);
  };

  const show_transient_confirmation_toast = (toast_message_text) => {
    const toast_element = document.createElement("div");
    toast_element.setAttribute("data-nag-neutralizer", "our-ui");
    toast_element.textContent = toast_message_text;
    toast_element.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:2147483647;background:rgba(20,20,20,0.92);color:#fff;padding:10px 16px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;pointer-events:none;max-width:340px;";
    document.body.appendChild(toast_element);
    setTimeout(() => { toast_element.remove(); }, 3000);
  };

  // Multifunction dispatch: extra site-specific actions run before the generic engine.
  // techcrunch.com: the generic engine fully handles its Admiral adblock-wall (two
  // stacked max-z-index overlay layers plus a transparent click catcher) and the
  // inline overflow:hidden scroll lock on html+body (verified live 2026-07-14), so
  // its entry is a documented no-op establishing the pattern for future sites.
  const site_specific_nag_removal_actions_by_hostname_fragment = {
    "techcrunch.com": () => {}
  };
  for (const hostname_fragment of Object.keys(site_specific_nag_removal_actions_by_hostname_fragment)) {
    if (current_page_hostname.indexOf(hostname_fragment) !== -1) {
      console.log("[NagNeutralizer] running site-specific actions for " + hostname_fragment);
      site_specific_nag_removal_actions_by_hostname_fragment[hostname_fragment]();
    }
  }

  const neutralized_count_this_click = run_full_neutralization_pass();
  begin_or_extend_rescan_window();

  if (neutralized_count_this_click > 0) {
    show_transient_confirmation_toast("Nag neutralizer: deactivated " + neutralized_count_this_click + " blocker(s); scroll and selection unlocked. Watching 30s for retaliation.");
  } else {
    show_transient_confirmation_toast("Nag neutralizer: no new blockers found; scroll and selection unlocked just in case.");
  }
  console.log("[NagNeutralizer v" + NAG_NEUTRALIZER_VERSION + "] pass complete; " + neutralized_count_this_click + " newly deactivated, " + nag_neutralizer_page_state.total_neutralized_count + " total this page");
})();
