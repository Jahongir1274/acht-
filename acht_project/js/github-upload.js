// GitHub Contents API bilan ishlash: PDF yuklash, yangi foydalanuvchi qo'shish,
// va papka/fayllarni jonli (avtomatik) o'qish uchun yordamchi funksiyalar.

function ghToken(){
  return localStorage.getItem('acht_gh_token') || '';
}
function ghSaveToken(token){
  localStorage.setItem('acht_gh_token', token);
}
function ghClearToken(){
  localStorage.removeItem('acht_gh_token');
}

function b64EncodeUnicode(str){
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}
function b64DecodeUnicode(str){
  const bytes = Uint8Array.from(atob(str.replace(/\n/g, '')), c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function ghRequest(path, method = 'GET', body = null, needsAuth = true){
  const token = ghToken();
  if(needsAuth && !token) throw new Error("Avval GitHub token kiriting.");
  if(!GITHUB_OWNER || !GITHUB_REPO) throw new Error("js/github-config.js to'liq to'ldirilmagan.");

  const base = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const url = method === 'GET' ? `${base}?ref=${GITHUB_BRANCH}` : base;

  const headers = { "Accept": "application/vnd.github+json" };
  if(token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

  if(!res.ok){
    const errText = await res.text();
    throw new Error(`GitHub xatosi (${res.status}): ${errText.slice(0, 200)}`);
  }
  return res.json();
}

/** PDF faylni to'g'ridan-to'g'ri repoga (pdf/{folderId}/{fileName}) qo'shadi. */
async function uploadPdfViaGitHub({ folderId, fileName, base64Content }){
  await ghRequest(`pdf/${folderId}/${fileName}`, 'PUT', {
    message: `Acht: "${fileName}" qo'shildi (${folderId})`,
    content: base64Content,
    branch: GITHUB_BRANCH
  });
}

/** data/users.json'ga yangi foydalanuvchi qo'shadi (owner tokeni bilan). */
async function addUserViaGitHub({ email, password, name, role }){
  const fileData = await ghRequest('data/users.json', 'GET');
  const json = JSON.parse(b64DecodeUnicode(fileData.content));
  if(json.users.some(u => u.email.toLowerCase() === email.toLowerCase())){
    throw new Error("Bu login (email) allaqachon mavjud.");
  }
  json.users.push({ email, password, name: name || email.split('@')[0], role: role || "student" });

  const newContent = b64EncodeUnicode(JSON.stringify(json, null, 2));
  await ghRequest('data/users.json', 'PUT', {
    message: `Acht: yangi foydalanuvchi qo'shildi (${email})`,
    content: newContent,
    sha: fileData.sha,
    branch: GITHUB_BRANCH
  });
}

/**
 * pdf/ papkasi ichidagi papkalarni avtomatik o'qiydi (manifest.json shart emas).
 * Token bo'lmasa ham ishlaydi (ochiq repo uchun), lekin so'rov limiti kamroq bo'ladi.
 */
async function fetchPdfFolders(){
  const items = await ghRequest('pdf', 'GET', null, false);
  return items
    .filter(it => it.type === 'dir')
    .map(it => ({ id: it.name, name: prettifyName(it.name), icon: '📁' }));
}

/** Bitta papka ichidagi PDF fayllarni o'qiydi. */
async function fetchPdfFiles(folderId){
  const items = await ghRequest(`pdf/${folderId}`, 'GET', null, false);
  return items
    .filter(it => it.type === 'file' && /\.pdf$/i.test(it.name))
    .map(it => ({ name: prettifyName(it.name.replace(/\.pdf$/i, '')), path: `pdf/${folderId}/${it.name}` }));
}

function prettifyName(str){
  return str.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** GitHub API so'rov limitini o'qiydi (bu chaqiruvning o'zi limitga hisoblanmaydi). */
async function fetchGithubRateLimit(){
  const token = ghToken();
  const headers = { "Accept": "application/vnd.github+json" };
  if(token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch('https://api.github.com/rate_limit', { headers });
  const data = await res.json();
  return data.rate; // { limit, remaining, reset }
}
