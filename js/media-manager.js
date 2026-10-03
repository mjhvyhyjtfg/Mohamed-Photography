/* ════════════════════════════════════════════════
   MEDIA MANAGER
   Add / delete photos (gallery) and videos (videos page)
   straight from the live site. Uses the SAME Firebase
   Realtime Database already used by the offers page,
   so anything uploaded appears instantly for every visitor.

   Database layout (under /media):
     gallery/{id}        → photo info + small thumbnail
     galleryFull/{id}    → full-size photo (loaded only when opened)
     videos/{id}         → video info + poster
     videoChunks/{id}/n  → uploaded video file, split in parts
     hidden/{page}/{key} → built-in items the owner deleted
════════════════════════════════════════════════ */
(function () {
  'use strict';

  const ADMIN_PASSWORD = '1234'; // ← نفس كلمة سر العروض. غيّرها هنا لو حبيت
  const MAX_VIDEO_MB = 25;       // أقصى حجم لفيديو يترفع مباشرة
  const CHUNK_BYTES = 3 * 1024 * 1024;
  const FREE_DB_MB = 1024;       // المساحة المجانية لقاعدة البيانات

  const firebaseConfig = {
    apiKey: "AIzaSyC3sj5JsuYu1-SHynbWkKlGdL238hVebUk",
    authDomain: "mohamed-photography.firebaseapp.com",
    databaseURL: "https://mohamed-photography-default-rtdb.firebaseio.com",
    projectId: "mohamed-photography",
    storageBucket: "mohamed-photography.firebasestorage.app",
    messagingSenderId: "964315997396",
    appId: "1:964315997396:web:f23a3f216adee925564741"
  };

  if (typeof firebase === 'undefined') { console.error('Media manager: Firebase not loaded'); return; }
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const ROOT = firebase.database().ref('media');

  const PAGE = document.body.dataset.mmPage; // 'gallery' | 'videos'
  if (PAGE !== 'gallery' && PAGE !== 'videos') return;
  const SESSION_KEY = 'mm_admin_ok';

  const CATS = {
    gallery: [['wedding', 'أفراح'], ['portrait', 'بورتريه'], ['events', 'مناسبات'], ['iphone', 'تصوير آيفون'], ['products', 'تصوير منتجات']],
    videos: [['wedding', 'أفراح'], ['events', 'مناسبات'], ['product', 'تجاري'], ['portrait', 'بورتريه']]
  };
  const OVERLAY_LABEL = { iphone: 'آيفون', products: 'منتجات' };
  const catLabel = (c) => OVERLAY_LABEL[c] || (CATS[PAGE].find(x => x[0] === c) || [c, c])[1];

  /* ── Icons ── */
  const ICON = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
  };

  /* ── Helpers ── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeKey = (s) => String(s).replace(/[.#$\[\]\/\s]/g, '_');
  const newId = () => ROOT.push().key;
  const isAdmin = () => document.body.classList.contains('mm-admin');
  const fmtDur = (s) => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const fmtDate = (t) => { try { return new Date(t).toLocaleDateString('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
  const mb = (bytes) => (bytes / 1048576).toFixed(1);
  const notify = () => document.dispatchEvent(new CustomEvent('mm:change'));

  function toast(msg, isErr) {
    const t = $('#mmToast');
    t.classList.toggle('mm-err', !!isErr);
    $('#mmToastMsg').textContent = msg;
    t.classList.add('mm-show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('mm-show'), 3200);
  }

  function openModal(id) { $('#' + id).classList.add('mm-open'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { $('#' + id).classList.remove('mm-open'); document.body.style.overflow = ''; }

  /* ════ BUILD UI ════ */
  const isGallery = PAGE === 'gallery';
  const catOptions = CATS[PAGE].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  const ui = document.createElement('div');
  ui.innerHTML = `
    <button class="mm-trigger" id="mmTrigger" title="إدارة ${isGallery ? 'المعرض' : 'الفيديوهات'}" aria-label="دخول الإدارة">${ICON.lock}</button>

    <div class="mm-toolbar" id="mmToolbar">
      <span class="mm-toolbar-label">وضع الإدارة</span>
      <button class="mm-btn mm-btn-primary" id="mmAddBtn">${ICON.plus}${isGallery ? 'إضافة صور' : 'إضافة فيديو'}</button>
      <button class="mm-btn mm-btn-ghost" id="mmLogout">${ICON.logout}خروج</button>
    </div>

    <!-- Login -->
    <div class="mm-overlay" id="mmLogin">
      <div class="mm-box">
        <button class="mm-close" data-close="mmLogin">×</button>
        <div class="mm-icon">${ICON.lock}</div>
        <h3>دخول الإدارة</h3>
        <p class="mm-sub">اكتب كلمة السر عشان تقدر تضيف أو تحذف ${isGallery ? 'صور المعرض' : 'الفيديوهات'}</p>
        <input type="password" class="mm-input mm-pw" id="mmPw" placeholder="••••" autocomplete="current-password" />
        <div class="mm-error" id="mmPwErr"></div>
        <button class="mm-btn mm-btn-primary" id="mmPwBtn" style="width:100%;height:48px">دخول</button>
      </div>
    </div>

    <!-- Upload -->
    <div class="mm-overlay" id="mmUpload">
      <div class="mm-box">
        <button class="mm-close" data-close="mmUpload">×</button>
        <div class="mm-icon">${isGallery ? ICON.image : ICON.video}</div>
        <h3>${isGallery ? 'إضافة صور للمعرض' : 'إضافة فيديو'}</h3>
        <p class="mm-sub">أول ما ترفع، الشغل هيظهر على الموقع لكل الناس على طول</p>

        ${isGallery ? '' : `
        <div class="mm-tabs">
          <button class="mm-tab mm-active" data-mode="file">رفع من الجهاز</button>
          <button class="mm-tab" data-mode="link">لينك YouTube / Drive</button>
        </div>`}

        <div id="mmFileMode">
          <label class="mm-drop" id="mmDrop">
            ${ICON.upload}
            <strong>${isGallery ? 'اختار الصور أو اسحبها هنا' : 'اختار الفيديو أو اسحبه هنا'}</strong>
            <span>${isGallery ? 'ممكن تختار أكتر من صورة مرة واحدة' : `MP4 — لحد ${MAX_VIDEO_MB}MB`}</span>
            <input type="file" id="mmFile" ${isGallery ? 'accept="image/*" multiple' : 'accept="video/mp4,video/webm,video/quicktime,video/*"'} />
          </label>
          <div class="mm-previews" id="mmPreviews"></div>
          ${isGallery ? '' : `<p class="mm-hint">💡 لو الفيديو أكبر من ${MAX_VIDEO_MB}MB أو طويل، ارفعه على YouTube وحط اللينك من التاب التاني، هيبقى أسرع للناس.</p>`}
        </div>

        ${isGallery ? '' : `
        <div id="mmLinkMode" style="display:none">
          <div class="mm-field">
            <label>لينك الفيديو</label>
            <input type="url" class="mm-input" id="mmLink" placeholder="https://youtu.be/... أو https://drive.google.com/file/d/..." dir="ltr" />
            <p class="mm-hint">لو لينك Google Drive: لازم المشاركة تبقى "أي حد معاه اللينك".</p>
          </div>
        </div>`}

        <div class="mm-field" style="margin-top:1.1rem">
          <label>القسم</label>
          <select class="mm-select" id="mmCat">${catOptions}</select>
        </div>
        <div class="mm-field">
          <label>العنوان ${isGallery ? '(اختياري)' : ''}</label>
          <input type="text" class="mm-input" id="mmTitle" placeholder="${isGallery ? 'مثال: جلسة تصوير زفاف' : 'مثال: فيلم زفاف أحمد وسارة'}" maxlength="80" />
        </div>
        ${isGallery ? '' : `
        <div class="mm-field">
          <label>وصف قصير (اختياري)</label>
          <textarea class="mm-textarea" id="mmDesc" maxlength="220" placeholder="سطر أو اتنين عن الفيديو"></textarea>
        </div>`}

        <div class="mm-progress" id="mmProgress">
          <div class="mm-progress-bar"><div class="mm-progress-fill" id="mmProgressFill"></div></div>
          <div class="mm-progress-text" id="mmProgressText">جاري الرفع...</div>
        </div>
        <p class="mm-hint" id="mmUsage" style="text-align:center"></p>

        <div class="mm-actions">
          <button class="mm-btn mm-btn-ghost" data-close="mmUpload">إلغاء</button>
          <button class="mm-btn mm-btn-primary" id="mmSubmit">${ICON.upload}رفع ونشر</button>
        </div>
      </div>
    </div>

    <!-- Confirm delete -->
    <div class="mm-overlay" id="mmConfirm">
      <div class="mm-box" style="max-width:400px;text-align:center">
        <div class="mm-icon">${ICON.trash}</div>
        <h3>${isGallery ? 'حذف الصورة؟' : 'حذف الفيديو؟'}</h3>
        <p class="mm-sub">هيتشال من الموقع عند كل الناس على طول.</p>
        <div class="mm-actions">
          <button class="mm-btn mm-btn-ghost" data-close="mmConfirm">إلغاء</button>
          <button class="mm-btn mm-btn-primary" id="mmConfirmYes">نعم، احذف</button>
        </div>
      </div>
    </div>

    <div class="mm-toast" id="mmToast"><span class="mm-toast-dot"></span><span id="mmToastMsg"></span></div>
  `;
  document.body.appendChild(ui);

  // Generic close handlers
  $$('[data-close]', ui).forEach(b => b.addEventListener('click', () => { if (!busy) closeModal(b.dataset.close); }));
  $$('.mm-overlay', ui).forEach(o => o.addEventListener('click', e => { if (e.target === o && !busy) closeModal(o.id); }));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || busy) return;
    $$('.mm-overlay.mm-open', ui).forEach(o => closeModal(o.id));
  });

  /* ════ LOGIN ════ */
  function enterAdmin() {
    document.body.classList.add('mm-admin');
    $('#mmToolbar').classList.add('mm-show');
    sessionStorage.setItem(SESSION_KEY, '1');
  }
  function exitAdmin() {
    document.body.classList.remove('mm-admin');
    $('#mmToolbar').classList.remove('mm-show');
    sessionStorage.removeItem(SESSION_KEY);
  }
  $('#mmTrigger').addEventListener('click', () => { openModal('mmLogin'); setTimeout(() => $('#mmPw').focus(), 250); });
  function tryLogin() {
    const inp = $('#mmPw');
    if (inp.value === ADMIN_PASSWORD) {
      inp.value = ''; $('#mmPwErr').textContent = '';
      closeModal('mmLogin'); enterAdmin();
      toast('أهلاً بيك 👋 تقدر دلوقتي تضيف وتحذف');
    } else {
      $('#mmPwErr').textContent = 'كلمة السر غلط، جرب تاني';
      inp.classList.add('mm-shake'); setTimeout(() => inp.classList.remove('mm-shake'), 450);
    }
  }
  $('#mmPwBtn').addEventListener('click', tryLogin);
  $('#mmPw').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  $('#mmLogout').addEventListener('click', () => { exitAdmin(); toast('تم الخروج من وضع الإدارة'); });
  if (sessionStorage.getItem(SESSION_KEY) === '1') enterAdmin();

  /* ════ DELETE ════ */
  let pendingDelete = null;
  function makeDelBtn(onDelete) {
    const b = document.createElement('button');
    b.className = 'mm-del'; b.type = 'button'; b.title = 'حذف'; b.innerHTML = ICON.trash;
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (!isAdmin()) return;
      pendingDelete = onDelete; openModal('mmConfirm');
    });
    return b;
  }
  $('#mmConfirmYes').addEventListener('click', async () => {
    const fn = pendingDelete; pendingDelete = null;
    closeModal('mmConfirm');
    if (!fn) return;
    try { await fn(); toast('تم الحذف ✅'); }
    catch (err) { console.error(err); toast('حصلت مشكلة في الحذف، جرب تاني', true); }
  });

  /* ════ BUILT-IN (static) ITEMS ════ */
  const container = isGallery ? $('#galleryGrid') : $('#videosGrid');
  if (!container) return;
  const staticItems = isGallery ? $$('.gallery-page-item', container) : $$('.video-card', container);
  staticItems.forEach((el, i) => {
    let key;
    if (isGallery) {
      const img = el.querySelector('img');
      key = 's_' + safeKey(img ? img.getAttribute('src') : (el.id || 'item_' + i));
    } else {
      key = 's_' + safeKey(el.id || 'card_' + i);
    }
    el.dataset.mmKey = key;
    const host = isGallery ? el : (el.querySelector('.video-thumb') || el);
    host.appendChild(makeDelBtn(() => ROOT.child('hidden/' + PAGE + '/' + key).set(true)));
  });
  ROOT.child('hidden/' + PAGE).on('value', snap => {
    const hidden = snap.val() || {};
    staticItems.forEach(el => el.classList.toggle('mm-removed', !!hidden[el.dataset.mmKey]));
    notify();
  });

  /* ════ GALLERY (dynamic) ════ */
  const fullCache = {};
  const dynEls = {};
  let usage = { gallery: 0, videos: 0 };

  function buildGalleryItem(id, d) {
    const el = document.createElement('div');
    el.className = 'gallery-page-item' + (d.h > d.w * 1.1 ? ' portrait' : '');
    el.dataset.category = d.category;
    el.dataset.mmId = id;
    el.innerHTML = `
      <img src="${d.thumb}" alt="${esc(d.title || catLabel(d.category))}" loading="lazy" />
      <div class="gallery-page-overlay"><span class="gallery-cat">${esc(catLabel(d.category))}</span><h4>${esc(d.title || 'لقطة مميزة')}</h4></div>`;
    el.appendChild(makeDelBtn(() => ROOT.update({ ['gallery/' + id]: null, ['galleryFull/' + id]: null })));
    return el;
  }

  function buildVideoCard(id, d) {
    const el = document.createElement('div');
    el.className = 'video-card';
    el.dataset.category = d.category;
    el.dataset.mmId = id;
    let poster = d.poster || '';
    if (!poster && d.type === 'youtube') poster = 'https://img.youtube.com/vi/' + d.ref + '/hqdefault.jpg';
    el.innerHTML = `
      <div class="video-thumb">
        ${poster ? `<img class="video-thumb-img" src="${esc(poster)}" alt="${esc(d.title)}" loading="lazy" />` : ''}
        <div class="video-thumb-bg ${poster ? '' : 'wedding-vid'}">
          <div class="play-btn">${ICON.play}</div>
        </div>
        ${d.duration ? `<span class="video-duration">${fmtDur(d.duration)}</span>` : ''}
      </div>
      <div class="video-info">
        <div class="video-category">${esc(catLabel(d.category))}</div>
        <h3 class="video-title">${esc(d.title)}</h3>
        ${d.desc ? `<p class="video-desc">${esc(d.desc)}</p>` : ''}
        <div class="video-meta">
          <span>🎬 تصوير ومونتاج Mohamed Photography</span>
          <span>📅 ${esc(fmtDate(d.createdAt))}</span>
        </div>
      </div>`;
    const thumb = el.querySelector('.video-thumb');
    thumb.addEventListener('click', () => playVideo(id));
    thumb.appendChild(makeDelBtn(() => ROOT.update({ ['videos/' + id]: null, ['videoChunks/' + id]: null })));
    return el;
  }

  const listPath = isGallery ? 'gallery' : 'videos';
  let videoData = {};
  ROOT.child(listPath).on('value', snap => {
    const data = snap.val() || {};
    if (!isGallery) videoData = data;
    usage[listPath] = Object.values(data).reduce((a, d) => a + (d.bytes || 0), 0);

    // remove deleted
    Object.keys(dynEls).forEach(id => { if (!data[id]) { dynEls[id].remove(); delete dynEls[id]; } });
    // add new + order newest first at the top of the grid
    const ids = Object.keys(data).sort((a, b) => (data[b].createdAt || 0) - (data[a].createdAt || 0));
    let anchor = container.firstChild;
    ids.forEach(id => {
      if (!dynEls[id]) dynEls[id] = isGallery ? buildGalleryItem(id, data[id]) : buildVideoCard(id, data[id]);
      container.insertBefore(dynEls[id], anchor);
      anchor = dynEls[id].nextSibling;
    });
    notify();
  });

  // Full-size photo, loaded only when someone opens it
  window.mmGetFullImage = function (id) {
    if (fullCache[id]) return Promise.resolve(fullCache[id]);
    return ROOT.child('galleryFull/' + id).once('value').then(s => { const v = s.val(); if (v) fullCache[id] = v; return v; });
  };

  /* ════ VIDEO PLAYBACK ════ */
  const blobCache = {};
  async function playVideo(id) {
    const d = videoData[id];
    if (!d) return;
    const title = d.title || '';
    
    // If YouTube or Drive, just use the existing openVideoModal or simple iframe
    if (d.type === 'youtube' || d.type === 'drive') {
      const url = d.type === 'youtube' 
        ? 'https://www.youtube.com/embed/' + d.ref + '?autoplay=1&rel=0&playsinline=1'
        : 'https://drive.google.com/file/d/' + d.ref + '/preview';
        
      if (window.openVideoModal) return window.openVideoModal(url, '', title);
      return window.open(url, '_blank');
    }

    if (!window.openVideoModal) return;

    if (blobCache[id]) return window.openVideoModal(blobCache[id], d.poster || '', title);
    
    // Show a loading toast
    toast('جاري تجهيز الفيديو، ثواني...', false);
    
    try {
      const snap = await ROOT.child('videoChunks/' + id).once('value');
      const raw = snap.val();
      const parts = Array.isArray(raw) ? raw : Object.keys(raw || {}).sort((a, b) => a - b).map(k => raw[k]);
      if (!parts.length) throw new Error('no chunks');
      
      const blobs = await Promise.all(parts.map(b64 => fetch('data:application/octet-stream;base64,' + b64).then(r => r.blob())));
      const url = URL.createObjectURL(new Blob(blobs, { type: d.mime || 'video/mp4' }));
      blobCache[id] = url;
      
      window.openVideoModal(url, d.poster || '', title);
    } catch (err) {
      console.error(err);
      toast('مقدرناش نشغل الفيديو، جرب تاني', true);
    }
  }

  /* ════ UPLOAD MODAL ════ */
  let busy = false;
  let files = [];
  let mode = 'file';

  function resetUpload() {
    files = []; $('#mmFile').value = ''; $('#mmPreviews').innerHTML = ''; $('#mmPreviews').classList.remove('mm-single');
    $('#mmTitle').value = '';
    if ($('#mmDesc')) $('#mmDesc').value = '';
    if ($('#mmLink')) $('#mmLink').value = '';
    $('#mmProgress').classList.remove('mm-show'); setProgress(0, '');
    $('#mmSubmit').disabled = false;
  }
  function setProgress(p, text) {
    $('#mmProgressFill').style.width = Math.max(0, Math.min(100, p)) + '%';
    if (text) $('#mmProgressText').textContent = text;
  }
  function updateUsage() {
    const used = (usage.gallery + usage.videos) / 1048576;
    $('#mmUsage').textContent = `المساحة المستخدمة للشغل المرفوع: ${used.toFixed(0)}MB من حوالي ${FREE_DB_MB}MB مجاناً`;
  }

  $('#mmAddBtn').addEventListener('click', () => { if (!isAdmin()) return; resetUpload(); updateUsage(); openModal('mmUpload'); });

  $$('.mm-tab', ui).forEach(t => t.addEventListener('click', () => {
    if (busy) return;
    mode = t.dataset.mode;
    $$('.mm-tab', ui).forEach(x => x.classList.toggle('mm-active', x === t));
    $('#mmFileMode').style.display = mode === 'file' ? '' : 'none';
    $('#mmLinkMode').style.display = mode === 'link' ? '' : 'none';
  }));

  const drop = $('#mmDrop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('mm-over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('mm-over'); }));
  drop.addEventListener('drop', e => { if (!busy) pickFiles(e.dataTransfer.files); });
  $('#mmFile').addEventListener('change', e => pickFiles(e.target.files));

  function pickFiles(list) {
    const arr = Array.from(list || []);
    const box = $('#mmPreviews');
    box.innerHTML = '';
    if (isGallery) {
      files = arr.filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
      box.classList.remove('mm-single');
      files.slice(0, 12).forEach(f => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        img.onerror = () => { img.style.opacity = '0.3'; };
        box.appendChild(img);
      });
      if (files.length > 12) {
        const more = document.createElement('div');
        more.style.cssText = 'display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid var(--black-border);color:var(--white-50);font-size:.85rem';
        more.textContent = '+' + (files.length - 12);
        box.appendChild(more);
      }
    } else {
      const f = arr.find(x => x.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(x.name));
      files = f ? [f] : [];
      if (!f) return;
      if (f.size > MAX_VIDEO_MB * 1048576) {
        files = [];
        toast(`الفيديو ${mb(f.size)}MB — أكبر من ${MAX_VIDEO_MB}MB. ارفعه على YouTube وحط اللينك`, true);
        return;
      }
      box.classList.add('mm-single');
      const v = document.createElement('video');
      v.src = URL.createObjectURL(f); v.muted = true; v.controls = true; v.playsInline = true;
      box.appendChild(v);
      if (!$('#mmTitle').value) $('#mmTitle').value = '';
    }
  }

  /* ── Image processing ── */
  function loadImage(file) {
    return new Promise((res, rej) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => res({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
      img.src = url;
    });
  }
  function resizeTo(img, maxSide, quality) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const s = Math.min(1, maxSide / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { data: c.toDataURL('image/jpeg', quality), w: c.width, h: c.height };
  }

  /* ── Video helpers ── */
  function probeVideo(file) {
    return new Promise(resolve => {
      const v = document.createElement('video');
      const url = URL.createObjectURL(file);
      let done = false;
      const finish = (r) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(r); };
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.onerror = () => finish({ ok: false });
      v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 3); };
      v.onseeked = () => {
        let poster = '';
        try {
          if (v.videoWidth) {
            const s = Math.min(1, 960 / Math.max(v.videoWidth, v.videoHeight));
            const c = document.createElement('canvas');
            c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
            c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
            poster = c.toDataURL('image/jpeg', 0.78);
          }
        } catch (e) { /* ignore */ }
        finish({ ok: !!v.videoWidth, duration: v.duration, poster });
      };
      setTimeout(() => finish({ ok: v.readyState >= 1 && !!v.videoWidth, duration: v.duration || 0, poster: '' }), 10000);
      v.src = url;
    });
  }
  function blobToB64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] || '');
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }
  function parseLink(u) {
    u = (u || '').trim();
    let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) return { type: 'youtube', ref: m[1] };
    m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]{20,})/i);
    if (m) return { type: 'drive', ref: m[1] };
    return null;
  }

  /* ── Submit ── */
  $('#mmSubmit').addEventListener('click', async () => {
    if (busy || !isAdmin()) return;
    const category = $('#mmCat').value;
    const title = $('#mmTitle').value.trim();

    if (isGallery) {
      if (!files.length) return toast('اختار صورة واحدة على الأقل', true);
      busy = true; $('#mmSubmit').disabled = true; $('#mmProgress').classList.add('mm-show');
      let ok = 0, bad = 0;
      for (let i = 0; i < files.length; i++) {
        setProgress((i / files.length) * 100, `جاري رفع صورة ${i + 1} من ${files.length}...`);
        try {
          const { img, url } = await loadImage(files[i]);
          const full = resizeTo(img, 1800, 0.82);
          const thumb = resizeTo(img, 640, 0.74);
          URL.revokeObjectURL(url);
          const id = newId();
          await ROOT.child('galleryFull/' + id).set(full.data);
          await ROOT.child('gallery/' + id).set({
            category, title, thumb: thumb.data, w: full.w, h: full.h,
            bytes: full.data.length + thumb.data.length, createdAt: Date.now() + i
          });
          ok++;
        } catch (err) { console.error(err); bad++; }
      }
      setProgress(100, 'تم ✅');
      busy = false;
      closeModal('mmUpload');
      if (ok) toast(`تم نشر ${ok} صورة ✅` + (bad ? ` — ${bad} صورة صيغتها مش مدعومة (حوّلها JPG)` : ''), !!bad && !ok);
      else toast('مقدرناش نقرأ الصور. لو صيغتها HEIC حوّلها JPG وجرب تاني', true);
      return;
    }

    // ── Videos ──
    if (!title) return toast('اكتب عنوان للفيديو', true);
    const desc = ($('#mmDesc').value || '').trim();

    if (mode === 'link') {
      const parsed = parseLink($('#mmLink').value);
      if (!parsed) return toast('اللينك لازم يكون من YouTube أو Google Drive', true);
      busy = true; $('#mmSubmit').disabled = true;
      try {
        await ROOT.child('videos/' + newId()).set({ category, title, desc, type: parsed.type, ref: parsed.ref, createdAt: Date.now(), bytes: 0 });
        closeModal('mmUpload'); toast('تم نشر الفيديو ✅');
      } catch (err) { console.error(err); toast('حصلت مشكلة، جرب تاني', true); }
      busy = false; $('#mmSubmit').disabled = false;
      return;
    }

    const f = files[0];
    if (!f) return toast('اختار فيديو الأول', true);
    busy = true; $('#mmSubmit').disabled = true; $('#mmProgress').classList.add('mm-show');
    setProgress(2, 'بنجهز الفيديو...');
    const info = await probeVideo(f);
    if (!info.ok) {
      busy = false; $('#mmSubmit').disabled = false; $('#mmProgress').classList.remove('mm-show');
      return toast('صيغة الفيديو ده مش هتشتغل على كل الأجهزة. صدّره MP4 وجرب تاني', true);
    }
    const id = newId();
    const total = Math.ceil(f.size / CHUNK_BYTES);
    let bytes = 0;
    try {
      for (let i = 0; i < total; i++) {
        const b64 = await blobToB64(f.slice(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES));
        bytes += b64.length;
        await ROOT.child('videoChunks/' + id + '/' + i).set(b64);
        setProgress(5 + ((i + 1) / total) * 90, `جاري الرفع... ${Math.round(((i + 1) / total) * 100)}%`);
      }
      // Info is written LAST so visitors never see a half-uploaded video
      await ROOT.child('videos/' + id).set({
        category, title, desc, type: 'file', mime: f.type || 'video/mp4',
        poster: info.poster || '', duration: info.duration || 0,
        size: f.size, bytes: bytes + (info.poster || '').length, chunks: total, createdAt: Date.now()
      });
      setProgress(100, 'تم ✅');
      closeModal('mmUpload'); toast('تم نشر الفيديو ✅');
    } catch (err) {
      console.error(err);
      ROOT.child('videoChunks/' + id).remove().catch(() => {});
      toast('الرفع وقف (اتأكد من النت) وجرب تاني', true);
    }
    busy = false; $('#mmSubmit').disabled = false;
  });
})();
