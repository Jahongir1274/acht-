pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let currentUser = null;
let currentPdf = null;      // pdf.js document
let currentPdfPages = [];   // [{pageNum, text, items}]
let currentPdfPath = "";
let capturedDataUrl = "";
let aiRequestCount = parseInt(localStorage.getItem('acht_ai_count') || '0', 10);

requireAuth((user) => {
  currentUser = user;
  document.getElementById('whoLabel').textContent = user.name || user.email;
  if(user.role === "owner"){
    document.getElementById('adminLink').style.display = "inline-flex";
    const badge = document.getElementById('ownerBadge');
    setTimeout(() => badge.classList.add('show'), 250);
    setTimeout(() => badge.classList.remove('show'), 3000);
  }
  updateAiCounterLabel();
  loadFolders();
  loadGithubLimitLabel();
});

// ===================== PAPKA/PDF RO'YXATI (GitHub'dan jonli o'qiladi) =====================
async function loadFolders(){
  const grid = document.getElementById('grid');
  grid.innerHTML = `<p style="color:var(--muted);">Kitoblar ro'yxati yuklanmoqda...</p>`;
  try{
    const folders = await fetchPdfFolders();
    renderFolders(folders);
  }catch(err){
    grid.innerHTML = `<p style="color:var(--red);">Ro'yxatni yuklab bo'lmadi: ${err.message}</p>`;
  }
}

function renderFolders(folders){
  document.getElementById('crumbs').innerHTML = "<span>Papkalar</span>";
  const grid = document.getElementById('grid');
  grid.innerHTML = "";
  if(!folders.length){
    grid.innerHTML = `<p style="color:var(--muted);">Hali papka yo'q. Owner PDF qo'shishi kerak.</p>`;
    return;
  }
  folders.forEach(folder => {
    const el = document.createElement('div');
    el.className = "card pick-card";
    el.innerHTML = `<div class="icon">${folder.icon}</div><div class="label">${folder.name}</div>`;
    el.onclick = () => openFolder(folder);
    grid.appendChild(el);
  });
}

async function openFolder(folder){
  document.getElementById('crumbs').innerHTML =
    `<span class="back" onclick="loadFolders()">← Papkalar</span><span>/ ${folder.name}</span>`;
  const grid = document.getElementById('grid');
  grid.innerHTML = `<p style="color:var(--muted);">Fayllar yuklanmoqda...</p>`;
  try{
    const files = await fetchPdfFiles(folder.id);
    grid.innerHTML = "";
    if(!files.length){
      grid.innerHTML = `<p style="color:var(--muted);">Bu papkada hali PDF yo'q.</p>`;
      return;
    }
    files.forEach(f => {
      const el = document.createElement('div');
      el.className = "card pick-card";
      el.innerHTML = `<div class="icon">📄</div><div class="label">${f.name}</div>`;
      el.onclick = () => openPdf(f);
      grid.appendChild(el);
    });
  }catch(err){
    grid.innerHTML = `<p style="color:var(--red);">Fayllarni yuklab bo'lmadi: ${err.message}</p>`;
  }
}

async function openPdf(fileEntry){
  document.getElementById('docName').textContent = fileEntry.name;
  document.getElementById('pickerScreen').style.display = "none";
  document.getElementById('workspace').style.display = "flex";
  document.getElementById('pdfCanvasWrap').innerHTML = "<p>Kitob yuklanmoqda...</p>";
  currentPdfPath = fileEntry.path;

  const loadingTask = pdfjsLib.getDocument(fileEntry.path);
  currentPdf = await loadingTask.promise;
  currentPdfPages = [];
  for(let i = 1; i <= currentPdf.numPages; i++){
    const page = await currentPdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(it => it.str).join(" ");
    currentPdfPages.push({ pageNum: i, text, items: textContent.items });
  }
  await renderPdfPage(1);
}

async function renderPdfPage(pageNum, highlightPhrase){
  const page = await currentPdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.3 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width; canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  const wrap = document.getElementById('pdfCanvasWrap');
  wrap.innerHTML = "";
  wrap.style.position = "relative";
  wrap.appendChild(canvas);

  if(highlightPhrase){
    const textContent = await page.getTextContent();
    const needle = highlightPhrase.toLowerCase().slice(0, 40);
    textContent.items.forEach(item => {
      if(!item.str.trim()) return;
      if(needle.includes(item.str.toLowerCase().trim()) || item.str.toLowerCase().includes(needle.slice(0,12))){
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const x = tx[4], y = tx[5] - item.height * viewport.scale;
        const w = item.width * viewport.scale, h = item.height * viewport.scale * 1.3;
        const mark = document.createElement('div');
        mark.className = "hit";
        mark.style.position = "absolute";
        mark.style.left = x + "px";
        mark.style.top = y + "px";
        mark.style.width = w + "px";
        mark.style.height = h + "px";
        mark.style.background = "rgba(251,191,36,.55)";
        mark.style.borderRadius = "2px";
        wrap.appendChild(mark);
      }
    });
  }
}

function backToPicker(){
  document.getElementById('workspace').style.display = "none";
  document.getElementById('pickerScreen').style.display = "block";
  loadFolders();
}

// ===================== API LIMIT KO'RSATKICHLARI =====================
function updateAiCounterLabel(){
  const el = document.getElementById('aiCounter');
  if(el) el.textContent = `AI so'rovlar: ${aiRequestCount}`;
}

async function loadGithubLimitLabel(){
  const el = document.getElementById('ghLimit');
  if(!el) return;
  try{
    const rate = await fetchGithubRateLimit();
    el.textContent = `GitHub limiti: ${rate.remaining}/${rate.limit}`;
  }catch(err){
    el.textContent = "";
  }
}

// ===================== RASM OLISH (oyna/ekran tanlash) =====================
document.getElementById('captureFab').addEventListener('click', startCapture);

async function startCapture(){
  try{
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();
    // Bir frame kutib olamiz
    await new Promise(r => setTimeout(r, 200));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    stream.getTracks().forEach(t => t.stop());
    openCropOverlay(canvas.toDataURL('image/png'));
  }catch(err){
    alert("Oyna tanlanmadi yoki ruxsat berilmadi.");
  }
}

// ===================== CROP (kesish) OYNASI — ko'chirish + o'lchamini o'zgartirish =====================
const cropOverlay = document.getElementById('cropOverlay');
const cropImg = document.getElementById('cropImg');
const cropRect = document.getElementById('cropRect');
const MIN_CROP = 30;
let dragState = null;

function openCropOverlay(dataUrl){
  cropImg.src = dataUrl;
  cropOverlay.style.display = "flex";
  cropImg.onload = () => {
    const w = cropImg.clientWidth, h = cropImg.clientHeight;
    cropRect.style.left = (w*0.15)+"px";
    cropRect.style.top = (h*0.15)+"px";
    cropRect.style.width = (w*0.7)+"px";
    cropRect.style.height = (h*0.4)+"px";
  };
}

// Rezize uchun 4 burchak handle qo'shamiz (dinamik, bir marta)
const HANDLE_POS = ['nw','ne','sw','se'];
HANDLE_POS.forEach(pos => {
  const h = document.createElement('div');
  h.className = `crop-handle crop-handle-${pos}`;
  h.dataset.pos = pos;
  cropRect.appendChild(h);
});

function stageBounds(){
  return { w: cropImg.clientWidth, h: cropImg.clientHeight };
}

// Ko'chirish (butun to'rtburchakni sudrab siljitish)
cropRect.addEventListener('pointerdown', (e) => {
  if(e.target.classList.contains('crop-handle')) return; // handle o'z ishlovchisiga ega
  dragState = { mode:'move', startX: e.clientX, startY: e.clientY,
    origLeft: cropRect.offsetLeft, origTop: cropRect.offsetTop };
  cropRect.setPointerCapture(e.pointerId);
});

// Burchaklardan o'lchamini o'zgartirish
cropRect.querySelectorAll('.crop-handle').forEach(handle => {
  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    dragState = {
      mode:'resize', pos: handle.dataset.pos,
      startX: e.clientX, startY: e.clientY,
      origLeft: cropRect.offsetLeft, origTop: cropRect.offsetTop,
      origW: cropRect.offsetWidth, origH: cropRect.offsetHeight
    };
    handle.setPointerCapture(e.pointerId);
  });
});

document.addEventListener('pointermove', (e) => {
  if(!dragState) return;
  const { w: maxW, h: maxH } = stageBounds();
  const dx = e.clientX - dragState.startX, dy = e.clientY - dragState.startY;

  if(dragState.mode === 'move'){
    let left = dragState.origLeft + dx, top = dragState.origTop + dy;
    left = Math.max(0, Math.min(left, maxW - cropRect.offsetWidth));
    top = Math.max(0, Math.min(top, maxH - cropRect.offsetHeight));
    cropRect.style.left = left + "px";
    cropRect.style.top = top + "px";
  } else if(dragState.mode === 'resize'){
    let { origLeft, origTop, origW, origH, pos } = dragState;
    let newLeft = origLeft, newTop = origTop, newW = origW, newH = origH;

    if(pos.includes('e')) newW = Math.max(MIN_CROP, Math.min(origW + dx, maxW - origLeft));
    if(pos.includes('s')) newH = Math.max(MIN_CROP, Math.min(origH + dy, maxH - origTop));
    if(pos.includes('w')){
      newW = Math.max(MIN_CROP, origW - dx);
      newLeft = Math.max(0, origLeft + (origW - newW));
      newW = origLeft + origW - newLeft;
    }
    if(pos.includes('n')){
      newH = Math.max(MIN_CROP, origH - dy);
      newTop = Math.max(0, origTop + (origH - newH));
      newH = origTop + origH - newTop;
    }
    cropRect.style.left = newLeft + "px";
    cropRect.style.top = newTop + "px";
    cropRect.style.width = newW + "px";
    cropRect.style.height = newH + "px";
  }
});
document.addEventListener('pointerup', () => dragState = null);

document.getElementById('cropCancel').addEventListener('click', () => {
  cropOverlay.style.display = "none";
});

document.getElementById('cropConfirm').addEventListener('click', () => {
  const scaleX = cropImg.naturalWidth / cropImg.clientWidth;
  const scaleY = cropImg.naturalHeight / cropImg.clientHeight;
  const sx = cropRect.offsetLeft * scaleX, sy = cropRect.offsetTop * scaleY;
  const sw = cropRect.offsetWidth * scaleX, sh = cropRect.offsetHeight * scaleY;

  const out = document.createElement('canvas');
  out.width = sw; out.height = sh;
  out.getContext('2d').drawImage(cropImg, sx, sy, sw, sh, 0, 0, sw, sh);
  capturedDataUrl = out.toDataURL('image/png');
  cropOverlay.style.display = "none";
  runAiCheck(capturedDataUrl);
});

// ===================== AI TEKSHIRUVI =====================
async function runAiCheck(dataUrl){
  const aiOut = document.getElementById('aiOut');
  aiOut.innerHTML = "AI javobni tekshiryapti...";
  document.getElementById('retryBar').style.display = "none";

  const base64 = dataUrl.split(',')[1];
  const prompt = `Bu rasmda savol va javob variantlari bor. Savolni o'qi, eng to'g'ri javobni tanla.
Javobni FAQAT quyidagi JSON formatda ber, boshqa hech narsa yozma:
{"answer": "tanlangan javob matni (qisqa)", "keyPhrase": "kitobdan qidirish uchun 5-10 so'zlik aniq ibora"}`;

  try{
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/png", data: base64 } }
          ]
        }]
      })
    });
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    let parsed;
    try{ parsed = JSON.parse(raw.replace(/```json|```/g,'').trim()); }
    catch(e){ parsed = { answer: raw, keyPhrase: raw.slice(0,40) }; }

    aiOut.textContent = parsed.answer || "AI javob bera olmadi.";
    matchAgainstPdf(parsed.keyPhrase || parsed.answer || "");

    aiRequestCount++;
    localStorage.setItem('acht_ai_count', String(aiRequestCount));
    updateAiCounterLabel();
  }catch(err){
    aiOut.textContent = "AI (Gemini) bilan bog'lanishda xatolik yuz berdi.";
  }
}

function matchAgainstPdf(keyPhrase){
  const needle = keyPhrase.toLowerCase();
  let best = { score: 0, pageNum: 1 };
  currentPdfPages.forEach(p => {
    const hay = p.text.toLowerCase();
    const words = needle.split(/\s+/).filter(w => w.length > 2);
    const hits = words.filter(w => hay.includes(w)).length;
    const score = words.length ? hits / words.length : 0;
    if(score > best.score) best = { score, pageNum: p.pageNum };
  });

  if(best.score >= 0.5){
    document.getElementById('retryBar').style.display = "none";
    renderPdfPage(best.pageNum, keyPhrase);
  }else{
    document.getElementById('retryBar').style.display = "flex";
    renderPdfPage(best.pageNum || 1);
  }
}

function resetForRetry(){
  document.getElementById('retryBar').style.display = "none";
  document.getElementById('aiOut').innerHTML = '<span class="placeholder">Savol rasmini qaytadan yuklang.</span>';
  startCapture();
}
