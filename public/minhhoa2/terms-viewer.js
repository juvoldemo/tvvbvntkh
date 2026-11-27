const status = document.getElementById('status');
const container = document.getElementById('pages');
let zoom = 1;
let generation = 0;
let observer;
let pdf;

function sizePages() {
  const width = Math.max(1, document.documentElement.clientWidth) * zoom;
  container.style.width = `${width}px`;
  for (const slot of container.children) {
    slot.style.width = `${width}px`;
    slot.style.height = `${width * Number(slot.dataset.aspect)}px`;
  }
  return width;
}

async function layout() {
  const current = ++generation;
  observer?.disconnect();
  if (!container.children.length) {
    const first = await pdf.getPage(1);
    if (current !== generation) return;
    const base = first.getViewport({ scale: 1 });
    for (let number = 1; number <= pdf.numPages; number++) {
      const slot = document.createElement('section');
      slot.className = 'page';
      slot.dataset.number = number;
      slot.dataset.aspect = base.height / base.width;
      slot.setAttribute('aria-label', `Trang ${number}`);
      container.append(slot);
    }
  }
  const width = sizePages();
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      renderPage(entry.target, width, current).catch(showError);
    }
  }, { rootMargin: '400px 0px' });
  for (const slot of container.children) observer.observe(slot);
}

// Resize the document around the fingers, keeping the reading position fixed.
function changeZoom(next, x, y) {
  const previous = zoom;
  zoom = Math.max(1, Math.min(3, next));
  const factor = zoom / previous;
  const left = (scrollX + x) * factor - x;
  const top = (scrollY + y) * factor - y;
  sizePages();
  window.scrollTo(left, top);
}

function enableTouchZoom() {
  let pinch;
  let lastTap;
  let start;
  const distance = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  const midpoint = touches => ({ x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2 });
  container.addEventListener('touchstart', event => {
    if (event.touches.length === 2) {
      event.preventDefault();
      observer?.disconnect();
      generation++;
      pinch = { distance: distance(event.touches), zoom };
      lastTap = start = null;
    } else if (event.touches.length === 1) {
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  }, { passive: false });
  container.addEventListener('touchmove', event => {
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const point = midpoint(event.touches);
    changeZoom(pinch.zoom * distance(event.touches) / pinch.distance, point.x, point.y);
  }, { passive: false });
  container.addEventListener('touchend', event => {
    if (pinch) {
      if (event.touches.length < 2) { pinch = null; start = null; layout().catch(showError); }
      return;
    }
    if (!start || event.touches.length) return;
    const touch = event.changedTouches[0];
    const now = Date.now();
    const tapped = now - start.time < 250 && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) < 12;
    if (tapped && lastTap && now - lastTap.time < 350 && Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < 32) {
      event.preventDefault();
      changeZoom(zoom > 1 ? 1 : 2, touch.clientX, touch.clientY);
      layout().catch(showError);
      lastTap = null;
    } else lastTap = tapped ? { x: touch.clientX, y: touch.clientY, time: now } : null;
    start = null;
  }, { passive: false });
  container.addEventListener('touchcancel', () => { pinch = start = lastTap = null; layout().catch(showError); });
  container.addEventListener('dblclick', event => {
    event.preventDefault();
    changeZoom(zoom > 1 ? 1 : 2, event.clientX, event.clientY);
    layout().catch(showError);
  });
}

async function renderPage(slot, width, current) {
  const page = await pdf.getPage(Number(slot.dataset.number));
  if (current !== generation) return;
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width * ratio);
  canvas.height = Math.ceil(viewport.height * ratio);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', slot.getAttribute('aria-label'));
  slot.style.height = `${viewport.height}px`;
  slot.dataset.aspect = viewport.height / viewport.width;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport,
    transform: [ratio, 0, 0, ratio, 0, 0] }).promise;
  if (current === generation) slot.replaceChildren(canvas);
  page.cleanup();
}

function showError(error) {
  console.error('PDF viewer:', error);
  status.hidden = false;
  status.textContent = 'Không tải được tài liệu. Hãy chọn Mở PDF hoặc Tải PDF ở phía trên.';
}

try {
  const source = new URL(new URLSearchParams(location.search).get('file'), location.href);
  if (source.origin !== location.origin || !source.pathname.toLowerCase().endsWith('.pdf')) throw new Error('Invalid PDF URL');
  const pdfjs = await import('./pdfjs/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = './pdfjs/pdf.worker.mjs';
  pdf = await pdfjs.getDocument({ url: source.href,
    cMapUrl: './pdfjs/cmaps/', cMapPacked: true,
    standardFontDataUrl: './pdfjs/standard_fonts/' }).promise;
  status.hidden = true;
  await layout();
  enableTouchZoom();
  let timer;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => layout().catch(showError), 150); });
} catch (error) { showError(error); }
