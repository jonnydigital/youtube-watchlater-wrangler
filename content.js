// content.js - YouTube "Watch Later" Bulk Manager (v1.0)
// Vanilla JS, SPA-aware, resilient selectors. Matches styles in styles.css (wlbm-* classes).

(function () {
  // ---- URL Guard ----
  const WL_MATCH = /(^|[?&])list=WL(&|$)/;
  const isOnWatchLater = () => location.pathname === "/playlist" && WL_MATCH.test(location.search);

  // ---- Small helpers ----
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function domReady() {
    if (document.readyState === "complete" || document.readyState === "interactive") return;
    await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
  }

  // ---- State ----
  const state = {
    headerEl: null,
    counterEl: null,
    selectAllEl: null,
    removeBtnEl: null,
    selectEntireEl: null,
    pauseBtnEl: null,
    modalEl: null,
    spacerEl: null,
    removing: false,
    removingPaused: false,
    checkboxAttr: "data-wl-checkbox",
    selectedIds: new Set(),
    removalDelayMs: 500,
    observers: [],
    urlObs: null,
    layoutObs: null,
    rightNudge: 120,
    hidden: false,
    lowOverhead: false,
    lastClickIndex: -1,
  };
  let selectingAll = false;

  // ---- UI: Header / Modal / Toast ----
  function findVideoListContainer() {
    return $("ytd-playlist-video-list-renderer #contents") || $("ytd-playlist-video-list-renderer");
  }

  function insertHeaderEl(header) {
    // Prefer inserting above the video list within the primary column
    const videoList = document.querySelector('ytd-playlist-video-list-renderer');
    const primary = document.querySelector('ytd-two-column-browse-results-renderer #primary');
    if (videoList && primary && videoList.parentElement === primary) {
      primary.insertBefore(header, videoList);
      return true;
    }

    const list = findVideoListContainer();
    if (list && list.parentElement) {
      list.parentElement.insertBefore(header, list);
      return true;
    }

    const pageHeader = $("ytd-playlist-header-renderer #title");
    (pageHeader?.parentElement || $("ytd-playlist-header-renderer") || document.body)
      .appendChild(header);
    return true;
  }

  function buildHeader() {
    if (state.headerEl) return;

    const header = document.createElement("div");
    header.className = "wlbm-header";

    const rowTitle = document.createElement("div");
    rowTitle.className = "wlbm-row wlbm-row-title";

    const title = document.createElement('div');
    title.className = 'wlbm-title';
    const icon = document.createElement('span');
    icon.className = 'wlbm-icon';
    // YouTube badge icon (rounded rect with play triangle)
    icon.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M22 12c0-2.02-.2-3.38-.2-3.38s-.2-1.42-.82-2.05c-.78-.82-1.65-.82-2.05-.86C16.64 5.5 12 5.5 12 5.5h0s-4.64 0-6.93.21c-.4.04-1.27.04-2.05.86-.62.63-.82 2.05-.82 2.05S2 9.98 2 12s.2 3.38.2 3.38.2 1.42.82 2.05c.78.82 1.81.79 2.27.88C7.36 18.5 12 18.5 12 18.5s4.64 0 6.93-.21c.4-.04 1.27-.04 2.05-.86.62-.63.82-2.05.82-2.05S22 14.02 22 12Z" fill="#FF0000"/><path d="M10 15.5v-7l6 3.5-6 3.5z" fill="#fff"/></svg>';
    const titleText = document.createElement('span');
    titleText.textContent = 'YouTube WatchLater Wrangler';
    title.append(icon, titleText);
    title.title = 'Double-click to clear selection';

    const selectAll = document.createElement("input");
    selectAll.type = "checkbox";
    selectAll.id = "wlbm-select-all";
    selectAll.className = "wlbm-hidden-checkbox";

    const selectAllLabel = document.createElement("label");
    selectAllLabel.htmlFor = "wlbm-select-all";
    selectAllLabel.textContent = "Select all (visible)";
    selectAllLabel.className = "wlbm-pill";

    const removeBtn = document.createElement("button");
    removeBtn.className = "wlbm-pill wlbm-danger";
    removeBtn.textContent = "Remove (0)";
    removeBtn.disabled = true;
    removeBtn.setAttribute('aria-label', 'Remove 0 selected videos');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'wlbm-close';
    closeBtn.type = 'button';
    closeBtn.title = 'Hide controls';
    closeBtn.setAttribute('aria-label', 'Hide controls');
    closeBtn.textContent = '×';

    const rowActions = document.createElement('div');
    rowActions.className = 'wlbm-row wlbm-actions';
    const invertBtn = document.createElement('button');
    invertBtn.className = 'wlbm-pill';
    invertBtn.textContent = 'Invert';
    const selectEntireBtn = document.createElement('button');
    selectEntireBtn.className = 'wlbm-pill';
    selectEntireBtn.textContent = 'Select all (entire)';
    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'wlbm-pill';
    pauseBtn.textContent = 'Pause';
    pauseBtn.style.display = 'none';
    rowActions.append(selectAllLabel, invertBtn, selectEntireBtn, removeBtn, pauseBtn);

    const credit = document.createElement('div');
    credit.className = 'wlbm-credit';
    credit.textContent = 'Developed by Jonathan Foye';

    const hint = document.createElement('div');
    hint.className = 'wlbm-hint';
    hint.textContent = 'Tip: Double-click the title to clear selection';
    try {
      if (localStorage.getItem('wlbm_hint_shown') === '1') {
        hint.style.display = 'none';
      } else {
        localStorage.setItem('wlbm_hint_shown', '1');
      }
    } catch (_) {}

    // Keep the hidden checkbox in the header for labeling
    header.append(selectAll);
    rowTitle.append(title);
    header.append(rowTitle, rowActions, credit, hint, closeBtn);

    state.headerEl = header;
    state.counterEl = null;
    state.selectAllEl = selectAll;
    state.removeBtnEl = removeBtn;
    state.selectEntireEl = selectEntireBtn;
    state.pauseBtnEl = pauseBtn;

    insertHeaderEl(header);

    state.selectAllEl.addEventListener("change", onSelectAllToggle);
    state.removeBtnEl.addEventListener("click", onRemoveClicked);
    invertBtn.addEventListener('click', () => {
      const items = getRenderedItems();
      items.forEach((it) => {
        const id = getItemId(it);
        if (!id) return;
        const cb = ensureItemCheckbox(it);
        if (cb) {
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        } else {
          // Offscreen: invert membership for rendered-only mode
          if (state.selectedIds.has(id)) state.selectedIds.delete(id); else state.selectedIds.add(id);
        }
      });
      updateCounterAndButton();
    });
    // Toggleable Select Entire with Cancel
    selectEntireBtn.addEventListener('click', async () => {
      if (selectingAll) { selectingAll = false; selectEntireBtn.textContent = 'Select all (entire)'; return; }
      if (state.removing) return;
      const ok = await showModal('Select all items in Watch Later? This will scroll to load the entire list. Click again to cancel.');
      if (!ok) return;
      selectingAll = true;
      const prevLO = state.lowOverhead; state.lowOverhead = true;
      selectEntireBtn.classList.add('wlbm-cancel');
      let prevLen = -1; let stable = 0;
      while (selectingAll) {
        const items = getRenderedItems();
        for (const it of items) {
          const id = getItemId(it);
          if (!id) continue;
          state.selectedIds.add(id);
          const cb = ensureItemCheckbox(it);
          if (cb) cb.checked = true;
        }
        updateCounterAndButton();
        const totalMatch = (document.body.textContent || '').match(/([\d,]+)\s+videos/i);
        const total = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : null;
        const loaded = getRenderedItems().length;
        selectEntireBtn.textContent = total ? `Cancel (${loaded}/${total})` : `Cancel (${loaded})`;

        const before = document.documentElement.scrollHeight;
        window.scrollTo({ top: before, behavior: 'instant' });
        await sleep(800);
        const len = getRenderedItems().length;
        if (len === prevLen) stable++; else stable = 0;
        prevLen = len;
        if (stable >= 3) break; // likely done
      }
      selectingAll = false;
      selectEntireBtn.textContent = 'Select all (entire)';
      selectEntireBtn.classList.remove('wlbm-cancel');
      state.lowOverhead = prevLO;
      updateCounterAndButton();
    });
    // dblclick title to clear selection
    title.addEventListener('dblclick', () => {
      state.selectedIds.clear();
      getRenderedItems().forEach(it => {
        const cb = it.querySelector(`input[${state.checkboxAttr}]`);
        if (cb) cb.checked = false;
      });
      updateCounterAndButton();
      toast('Selection cleared', 'success', 1800);
    });
    // dblclick title to clear selection
    title.addEventListener('dblclick', () => {
      state.selectedIds.clear();
      getRenderedItems().forEach(it => {
        const cb = it.querySelector(`input[${state.checkboxAttr}]`);
        if (cb) cb.checked = false;
      });
      updateCounterAndButton();
      toast('Selection cleared', 'success', 1800);
    });
    closeBtn.addEventListener('click', () => {
      state.hidden = true;
      teardownUi();
    });
  }

  function getMastheadHeight() {
    const masthead = document.querySelector('ytd-masthead') ||
                     document.querySelector('#masthead-container') ||
                     document.querySelector('tp-yt-app-header');
    const h = masthead?.getBoundingClientRect?.().height;
    return Number.isFinite(h) && h > 0 ? h : 56;
  }

  function getPrimaryEl() {
    return document.querySelector('ytd-two-column-browse-results-renderer #primary');
  }

  function getTopBannerOffset() {
    const primary = getPrimaryEl();
    if (!primary) return 0;
    const pr = primary.getBoundingClientRect();
    if (!pr || !pr.width || !pr.height) return 0;
    let maxBottom = 0;
    // Examine only the first few direct children near the top
    const kids = Array.from(primary.children || []).slice(0, 6);
    for (const el of kids) {
      if (!el || el.classList?.contains('wlbm-spacer')) continue;
      const r = el.getBoundingClientRect?.();
      if (!r) continue;
      if (r.bottom <= pr.top) continue;
      if (r.top - pr.top > 220) break; // only consider top area
      if (r.height < 40) continue; // ignore small chips/lines
      maxBottom = Math.max(maxBottom, r.bottom);
    }
    return maxBottom ? Math.max(0, Math.round(maxBottom - pr.top)) : 0;
  }

  // ---- Persistence of selection ----
  let persistTimer = null;
  function persistSelectionSoon() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        const ids = Array.from(state.selectedIds || []);
        localStorage.setItem('wlbm_selected_ids', JSON.stringify(ids));
      } catch (_) {}
    }, 300);
  }

  function loadPersistedSelection() {
    try {
      const raw = localStorage.getItem('wlbm_selected_ids');
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) state.selectedIds = new Set(arr);
    } catch (_) {}
  }

  function ensureSpacer() {
    if (state.spacerEl && state.spacerEl.isConnected) return state.spacerEl;
    const spacer = document.createElement('div');
    spacer.className = 'wlbm-spacer';
    state.spacerEl = spacer;
    const videoList = document.querySelector('ytd-playlist-video-list-renderer');
    const primary = document.querySelector('ytd-two-column-browse-results-renderer #primary');
    if (videoList && primary && videoList.parentElement === primary) {
      primary.insertBefore(spacer, videoList);
    } else {
      const list = findVideoListContainer();
      list?.parentElement?.insertBefore(spacer, list);
    }
    return spacer;
  }

  function applyFixedHeader() {
    if (!state.headerEl) return;
    // Move header to body so fixed positioning isn’t clipped by containers
    if (state.headerEl.parentElement !== document.body) {
      document.body.appendChild(state.headerEl);
    }
    const offset = Math.round(getMastheadHeight()) + 12; // stable offset below masthead
    state.headerEl.classList.remove('wlbm-sticky');
    state.headerEl.classList.add('wlbm-fixed');
    state.headerEl.style.setProperty('--wlbm-sticky-top', `${offset}px`);

    // Create/update spacer to prevent overlap with top of list
    const spacer = ensureSpacer();
    const height = state.headerEl.offsetHeight || 48;
    spacer.style.height = `${height + 8}px`;
    // Align header to the right edge of the primary column, but below any top banner
    const primary = getPrimaryEl();
    const rect = primary?.getBoundingClientRect?.();
    if (rect) {
      const rightOffset = Math.max(8, window.innerWidth - rect.right + 16 + (state.rightNudge || 0));
      state.headerEl.style.right = `${rightOffset}px`;
      state.headerEl.style.left = 'auto';
      state.headerEl.style.width = 'max-content';
    } else {
      state.headerEl.style.right = `${16 + (state.rightNudge || 0)}px`;
      state.headerEl.style.left = 'auto';
      state.headerEl.style.width = 'max-content';
    }
  }

  function buildModal() {
    if (state.modalEl) return;

    const overlay = document.createElement("div");
    overlay.className = "wlbm-modal-overlay";
    overlay.style.display = "none";

    const modal = document.createElement("div");
    modal.className = "wlbm-modal";

    const msg = document.createElement("div");
    msg.className = "wlbm-modal-msg";

    const actions = document.createElement("div");
    actions.className = "wlbm-modal-actions";

    const cancel = document.createElement("button");
    cancel.className = "wlbm-btn-secondary";
    cancel.textContent = "Cancel";

    const confirm = document.createElement("button");
    confirm.className = "wlbm-btn-danger";
    confirm.textContent = "Confirm";

    actions.append(cancel, confirm);
    modal.append(msg, actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    state.modalEl = overlay;
    state.modalEl._messageEl = msg;
    state.modalEl._confirmBtn = confirm;
    state.modalEl._cancelBtn = cancel;

    cancel.addEventListener("click", () => hideModal(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) hideModal(false);
    });
  }

  function showModal(message) {
    state.modalEl._messageEl.textContent = message;
    state.modalEl.style.display = "flex";
    return new Promise((resolve) => {
      const onConfirm = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      function cleanup() {
        state.modalEl._confirmBtn.removeEventListener("click", onConfirm);
        state.modalEl._cancelBtn.removeEventListener("click", onCancel);
        hideModal();
      }
      state.modalEl._confirmBtn.addEventListener("click", onConfirm, { once: true });
      state.modalEl._cancelBtn.addEventListener("click", onCancel, { once: true });
    });
  }

  function hideModal() {
    state.modalEl.style.display = "none";
  }

  function toast(message, kind = "success", ms = 3000) {
    const el = document.createElement("div");
    el.className = `wlbm-toast ${kind}`;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 250);
    }, ms);
  }

  // ---- Items + Selection ----
  function getRenderedItems() {
    const list = findVideoListContainer();
    if (!list) return [];
    return $$("ytd-playlist-video-renderer", list);
  }
  function isInViewport(el) {
    try {
      const r = el.getBoundingClientRect();
      const h = window.innerHeight || document.documentElement.clientHeight;
      return r.bottom > 0 && r.top < h;
    } catch (_) { return false; }
  }

  function getItemId(item) {
    try {
      const link = item.querySelector('a#thumbnail, a.yt-simple-endpoint[href*="watch?"]');
      const href = link?.getAttribute('href') || '';
      const m = href.match(/[?&]v=([\w-]{6,})/);
      if (m) return m[1];
      const vid = item.getAttribute('data-video-id') || item.querySelector('[data-video-id]')?.getAttribute('data-video-id');
      if (vid) return vid;
    } catch (_) {}
    return null;
  }

  function findItemById(id) {
    const a = document.querySelector(`a[href*="watch?v=${id}"]`);
    return a?.closest('ytd-playlist-video-renderer') || null;
  }

  // Create or return the checkbox for a given item
  function ensureItemCheckbox(item) {
    if ((state.lowOverhead || selectingAll) && !isInViewport(item)) return null;
    let cb = item.querySelector(`input[${state.checkboxAttr}]`);
    if (cb) return cb;

    const anchor = item.querySelector('#thumbnail') || item;
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.setAttribute(state.checkboxAttr, '1');
    box.className = 'wlbm-item-checkbox';

    const wrap = document.createElement('div');
    wrap.className = 'wlbm-checkbox-wrap';
    wrap.appendChild(box);

    // Make the anchor a positioning context for our overlay
    const cs = window.getComputedStyle(anchor);
    if (!cs || cs.position === 'static') anchor.style.position = 'relative';
    anchor.insertBefore(wrap, anchor.firstChild);

    // Stop playback/navigation when interacting with the checkbox
    const stop = (e, prevent = false) => {
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      if (prevent) e.preventDefault();
    };
    const swallowTypes = ['mousedown','mouseup','click','pointerdown','pointerup','touchstart','touchend','dblclick','dragstart'];
    swallowTypes.forEach((t) => {
      wrap.addEventListener(t, (e) => stop(e, t !== 'click'));
      box.addEventListener(t, (e) => stop(e, t !== 'click'));
    });
    function handleClick(e) {
      const items = getRenderedItems();
      const idx = items.indexOf(item);
      const targetChecked = !box.checked;
      if (e.shiftKey && state.lastClickIndex >= 0 && idx >= 0) {
        const a = Math.min(state.lastClickIndex, idx);
        const b = Math.max(state.lastClickIndex, idx);
        for (let i = a; i <= b; i++) {
          const it = items[i];
          const cb2 = ensureItemCheckbox(it);
          if (!cb2) continue;
          if (cb2.checked !== targetChecked) {
            cb2.checked = targetChecked;
            cb2.dispatchEvent(new Event('change'));
          }
        }
      } else {
        box.checked = targetChecked;
        box.dispatchEvent(new Event('change'));
      }
      if (idx >= 0) state.lastClickIndex = idx;
    }
    wrap.addEventListener('click', handleClick);
    box.addEventListener('click', handleClick);

    box.addEventListener('change', () => {
      const id = getItemId(item);
      if (!id) return;
      if (box.checked) state.selectedIds.add(id);
      else {
        state.selectedIds.delete(id);
        if (state.selectAllEl?.checked) state.selectAllEl.indeterminate = true;
      }
      updateCounterAndButton();
    });

    return box;
  }

  function attachCheckboxToItem(item) {
    ensureItemCheckbox(item);
  }

  function onSelectAllToggle() {
    const items = getRenderedItems();
    const toCheck = state.selectAllEl.checked;
    for (const it of items) {
      const cb = it.querySelector(`input[${state.checkboxAttr}]`) || ensureItemCheckbox(it);
      cb.checked = toCheck;
      const id = getItemId(it);
      if (!id) continue;
      if (toCheck) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
    }
    state.selectAllEl.indeterminate = false;
    updateCounterAndButton();
  }

  function updateCounterAndButton() {
    const count = state.selectedIds.size;
    if (state.counterEl) state.counterEl.textContent = `${count} selected`;
    state.removeBtnEl.disabled = count === 0 || state.removing;
    if (!state.removing) {
      state.removeBtnEl.textContent = `Remove (${count})`;
      state.removeBtnEl.setAttribute('aria-label', `Remove ${count} selected video${count===1?'':'s'}`);
    }
    persistSelectionSoon();
  }

  function wireItemObservers() {
    const list = findVideoListContainer();
    if (!list) return;

    const obs = new MutationObserver(() => {
      const items = getRenderedItems();
      const toAttach = (state.lowOverhead || selectingAll) ? items.filter(isInViewport) : items;
      toAttach.forEach(attachCheckboxToItem);
      for (const it of items) {
        const id = getItemId(it);
        const cb = it.querySelector(`input[${state.checkboxAttr}]`);
        if (id && cb) cb.checked = state.selectedIds.has(id);
      }
      updateCounterAndButton();
    });
    obs.observe(list, { childList: true, subtree: true });
    state.observers.push(obs);

    getRenderedItems().forEach(attachCheckboxToItem);
  }

  function reconcileItems() {
    if (state.hidden) return;
    const items = getRenderedItems();
    const toAttach = (state.lowOverhead || selectingAll) ? items.filter(isInViewport) : items;
    toAttach.forEach(attachCheckboxToItem);
  }

  // ---- Removal Flow ----
  function findOverflowMenuButton(item) {
    // Robust fallbacks for the "three dots" button
    return item.querySelector("ytd-menu-renderer #button") ||
           item.querySelector("#menu #button") ||
           item.querySelector("button[aria-label][aria-haspopup='menu']") ||
           item.querySelector("yt-icon-button.ytd-menu-renderer");
  }

  function findRemoveFromWlMenuItem() {
    const containers = $$("ytd-popup-container");
    const container = containers[containers.length - 1] || document;
    const nodes = $$("ytd-menu-service-item-renderer, tp-yt-paper-item, a.yt-simple-endpoint", container);

    const hasWlRemoveEndpoint = (el) => {
      const paths = ['data','endpoint','__data','__data.data','__data.endpoint','__data.data.command','__data.data.onTap','__data.apiEndpoint'];
      const seen = new Set();
      const q = [];
      for (const p of paths) {
        try {
          const obj = p.split('.').reduce((o,k)=>o?.[k], el);
          if (obj && typeof obj === 'object') q.push(obj);
        } catch(_) {}
      }
      let guard = 0;
      while (q.length && guard++ < 200) {
        const obj = q.shift();
        if (!obj || typeof obj !== 'object' || seen.has(obj)) continue; seen.add(obj);
        try {
          if (obj.playlistId === 'WL') return true;
          if (obj.playlistEditEndpoint && obj.playlistEditEndpoint.playlistId === 'WL') return true;
          if (typeof obj.action === 'string' && /remove/i.test(obj.action)) return true;
          if (typeof obj.command === 'string' && /remove/i.test(obj.command)) return true;
        } catch(_) {}
        for (const k in obj) { const v = obj[k]; if (v && typeof v === 'object') q.push(v); }
      }
      try {
        const href = el.getAttribute?.('href') || '';
        if (href && href.includes('list=WL') && /remove|action_remove/i.test(href)) return true;
      } catch(_) {}
      return false;
    };

    for (const n of nodes) if (hasWlRemoveEndpoint(n)) return n;
    const re = /(Remove from Watch later|Quitar de Ver más tarde|Retirer de Regarder plus tard|从稍后观看中移除|Remover da lista Ver mais tarde|Удалить из «Посмотреть позже»|從稍後觀看中移除|移除稍後觀看)/i;
    for (const n of nodes) {
      const txt = (n.textContent || '').trim();
      const aria = n.getAttribute?.('aria-label') || '';
      if (re.test(txt) || re.test(aria)) return n;
    }
    return null;
  }

  async function removeOne(item) {
    const menuBtn = findOverflowMenuButton(item);
    if (!menuBtn) throw new Error("Menu button not found");
    menuBtn.click();

    let tries = 0, removeEl = null;
    while (tries++ < 25) {
      await sleep(100);
      removeEl = findRemoveFromWlMenuItem();
      if (removeEl) break;
    }
    if (!removeEl) throw new Error("Remove menu item not found");

    removeEl.click();
    await sleep(200);
  }

  async function onRemoveClicked() {
    if (state.removing || state.selectedIds.size === 0) return;
    const count = state.selectedIds.size;
    const ok = await showModal(`Are you sure you want to remove ${count} video${count === 1 ? "" : "s"}?`);
    if (!ok) return;

    state.removing = true;
    const prevLO = state.lowOverhead; state.lowOverhead = true; // performance during removal
    state.removingPaused = false;
    updateCounterAndButton();
    state.removeBtnEl.disabled = true;
    state.removeBtnEl.textContent = `Removing (0/${count})`;
    // Show pause button
    if (state.pauseBtnEl) {
      state.pauseBtnEl.style.display = '';
      state.pauseBtnEl.textContent = 'Pause';
      state.pauseBtnEl.onclick = () => {
        state.removingPaused = !state.removingPaused;
        state.pauseBtnEl.textContent = state.removingPaused ? 'Resume' : 'Pause';
      };
    }

    let removed = 0;
    const ids = Array.from(state.selectedIds);

    for (const id of ids) {
      try {
        while (state.removingPaused) await sleep(150);
        const item = findItemById(id);
        if (!item) { removed++; continue; }
        await removeOne(item);
        removed++;
        const cb = item.querySelector(`input[${state.checkboxAttr}]`);
        if (cb) cb.checked = false;
        state.selectedIds.delete(id);
        state.removeBtnEl.textContent = `Removing (${removed}/${count})`;
        await sleep(state.removalDelayMs);
      } catch (err) {
        console.warn("Removal error:", err);
        // Close menu before proceeding
        document.body.click();
      }
    }

    state.removing = false;
    updateCounterAndButton();
    state.removeBtnEl.textContent = 'Remove (0)';
    if (state.pauseBtnEl) state.pauseBtnEl.style.display = 'none';
    toast(`Successfully processed ${removed} item${removed === 1 ? "" : "s"}.`, "success", 3500);
    state.lowOverhead = prevLO;
  }

  // ---- SPA Routing ----
  let lastHref = location.href;
  function watchUrlChanges() {
    const obs = new MutationObserver(() => {
      const href = location.href;
      if (href !== lastHref) {
        lastHref = href;
        onRouteChanged();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    state.urlObs = obs;

    const _push = history.pushState;
    const _replace = history.replaceState;
    history.pushState = function () {
      _push.apply(this, arguments);
      queueMicrotask(onRouteChanged);
    };
    history.replaceState = function () {
      _replace.apply(this, arguments);
      queueMicrotask(onRouteChanged);
    };
    window.addEventListener("popstate", onRouteChanged);
  }

  function onRouteChanged() {
    if (isOnWatchLater()) {
      ensureInjected();
    } else {
      teardownUi();
    }
  }

  function teardownUi() {
    state.selectedIds.clear();
    if (state.headerEl?.isConnected) state.headerEl.remove();
    if (state.modalEl?.isConnected) state.modalEl.remove();
    if (state.spacerEl?.isConnected) state.spacerEl.remove();
    // Remove any per-item checkboxes we injected
    Array.from(document.querySelectorAll('.wlbm-checkbox-wrap')).forEach((n) => n.remove());
    Array.from(document.querySelectorAll(`input[${state.checkboxAttr}]`)).forEach((n) => {
      if (n.parentElement) n.parentElement.removeChild(n);
    });
    state.headerEl = state.modalEl = state.counterEl =
      state.selectAllEl = state.removeBtnEl = state.spacerEl = null;
    state.observers.forEach((o) => o.disconnect());
    state.observers = [];
  }

  function ensureInjected() {
    if (state.hidden) return;
    buildHeader();
    buildModal();
    wireItemObservers();
    updateCounterAndButton();
    // If header ended up inside a clipped container, try moving it to primary.
    if (state.headerEl && !state.headerEl.closest('ytd-two-column-browse-results-renderer #primary')) {
      try { insertHeaderEl(state.headerEl); } catch (_) {}
    }
    applyFixedHeader();

    // Watch primary layout to react to top banner show/hide
    try {
      const primary = getPrimaryEl();
      if (primary) {
        state.layoutObs?.disconnect?.();
        const obs = new MutationObserver(() => applyFixedHeader());
        obs.observe(primary, { childList: true });
        state.layoutObs = obs;
      }
    } catch (_) {}
  }

  // ---- Boot ----
  (async function init() {
    await domReady();
    loadPersistedSelection();
    watchUrlChanges();
    if (isOnWatchLater()) {
      ensureInjected();
      console.debug('[WLBM] Injected on Watch Later');
    }
    else teardownUi();

    // Recompute fixed offset/spacer on resize and scroll (layout can change) with rAF throttle
    let rafId = null;
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (isOnWatchLater() && state.headerEl) applyFixedHeader();
      });
    };
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });

    // Early reconciliation to ensure checkboxes appear without needing Select All
    let tries = 0;
    const tick = () => {
      if (!isOnWatchLater()) return;
      reconcileItems();
      tries++;
      if (tries < 10) setTimeout(tick, 300);
    };
    tick();
  })();
})();
