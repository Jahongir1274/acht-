// .env (yoki muhit o'zgaruvchilari, masalan GitHub Actions Secrets) asosida
// js/gemini-api-config.js va js/github-config.js fayllarini generatsiya qiladi.
// Bu fayllar git'ga qo'shilmaydi (.gitignore) — har safar shu skript orqali yaratiladi,
// shunda haqiqiy kalit repo tarixida ochiq holda saqlanmaydi.

const fs = require('fs');
const path = require('path');

// .env faylini (agar mavjud bo'lsa) qo'lda o'qiymiz — tashqi paket kerak emas.
function loadDotEnv(){
  const envPath = path.join(__dirname, '..', '.env');
  if(!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if(!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if(idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if(!(key in process.env)) process.env[key] = value;
  });
}

loadDotEnv();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GITHUB_OWNER = process.env.GITHUB_OWNER || '';
const GITHUB_REPO = process.env.GITHUB_REPO || '';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

if(!GEMINI_API_KEY) console.warn('OGOHLANTIRISH: GEMINI_API_KEY bo\'sh — .env yoki Secrets\'ni tekshiring.');
if(!GITHUB_OWNER || !GITHUB_REPO) console.warn('OGOHLANTIRISH: GITHUB_OWNER/GITHUB_REPO bo\'sh — .env yoki Secrets\'ni tekshiring.');

const geminiConfig = `// AVTOMATIK GENERATSIYA QILINGAN FAYL — qo'lda tahrirlamang.
// Qiymat .env (yoki CI Secrets) dagi GEMINI_API_KEY'dan olinadi.
const GEMINI_API_KEY = "${GEMINI_API_KEY}";
const GEMINI_MODEL = "gemini-2.0-flash";
`;

const githubConfig = `// AVTOMATIK GENERATSIYA QILINGAN FAYL — qo'lda tahrirlamang.
// Qiymatlar .env (yoki CI Secrets) dan olinadi.
const GITHUB_OWNER = "${GITHUB_OWNER}";
const GITHUB_REPO = "${GITHUB_REPO}";
const GITHUB_BRANCH = "${GITHUB_BRANCH}";
`;

fs.writeFileSync(path.join(__dirname, '..', 'js', 'gemini-api-config.js'), geminiConfig);
fs.writeFileSync(path.join(__dirname, '..', 'js', 'github-config.js'), githubConfig);

console.log('js/gemini-api-config.js va js/github-config.js muvaffaqiyatli yaratildi.');
