# Acht — sozlash yo'riqnomasi

Bu loyiha to'liq statik sayt (GitHub Pages'da 24/7 ishlaydi). Owner saytning o'zidan yangi
foydalanuvchi va PDF qo'sha oladi (GitHub API orqali), maxfiy kalitlar esa `.env` + GitHub Actions
orqali boshqariladi — repo tarixida ochiq holda saqlanmaydi.

## 1-qadam: Repo va birinchi owner hisobi
1. Bu papkadagi barcha fayllarni **public** GitHub repozitoriyingizga yuklang (push qiling).
   (Public bo'lishi kerak — aks holda oddiy o'quvchilar PDF ro'yxatini va login tekshiruvini
   ko'ra olmaydi, chunki bu ma'lumotlar ochiq API/fayl orqali o'qiladi.)
2. `data/users.json` faylida standart owner hisobi bor:
   ```json
   { "email": "owner@acht.uz", "password": "OwnerParol123", "name": "Owner", "role": "owner" }
   ```
   Birinchi push'dan oldin shu parolni albatta o'zgartiring.
3. Shundan keyin boshqa barcha foydalanuvchilarni **Owner paneli** orqali (saytning o'zidan) qo'shishingiz mumkin.

## 2-qadam: Maxfiy kalitlar — .env + GitHub Actions (tavsiya etiladi)
Gemini API kaliti va GitHub repo ma'lumotlari endi **repo tarixida ochiq saqlanmaydi** —
GitHub Secrets orqali, deploy vaqtida avtomatik generatsiya qilinadi.

**Lokal test uchun:**
1. `.env.example` faylini `.env` nomi bilan nusxalang (`.env` git'ga hech qachon qo'shilmaydi).
2. `.env` ichiga qiymatlarni to'ldiring:
   ```
   GEMINI_API_KEY=sizning_gemini_kalitingiz
   GITHUB_OWNER=github_foydalanuvchi_nomi
   GITHUB_REPO=repo_nomi
   GITHUB_BRANCH=main
   ```
3. `node scripts/generate-config.js` ni ishga tushiring — bu `js/gemini-api-config.js` va
   `js/github-config.js` fayllarini yaratadi (ular `.gitignore`da, hech qachon commit qilinmaydi).

**GitHub Pages'da avtomatik ishlashi uchun (tavsiya etiladi):**
1. Repo > **Settings > Secrets and variables > Actions > New repository secret** orqali qo'shing:
   - `GEMINI_API_KEY`
   - `ACHT_GH_OWNER` (GitHub foydalanuvchi nomingiz)
   - `ACHT_GH_REPO` (repo nomi)
   - `ACHT_GH_BRANCH` (odatda `main`)
2. Repo > **Settings > Pages > Source: "GitHub Actions"** ni tanlang (branch emas).
3. Har safar `main`ga push qilganingizda, `.github/workflows/deploy.yml` avtomatik ishga tushadi:
   Secrets'dan config fayllarini generatsiya qiladi va saytni Pages'ga joylaydi.

⚠️ **Muhim tushuncha:** bu usul kalitni **git repo tarixidan** yashiradi, lekin **brauzerga
yuborilgan yakuniy sahifadan emas** — chunki bu client-side (frontend-only) ilova, kalit
baribir foydalanuvchi brauzerida ishlatilishi kerak. Kim view-source yoki tarmoq so'rovlarini
tekshirsa, kalitni ko'ra oladi. Bu — repo'ni tozaroq/xavfsizroq boshqarish uchun yaxshilanish,
lekin to'liq "server-side maxfiylik" emas (buning uchun haqiqiy backend kerak bo'lardi, bu esa
GitHub Pages'ning statik tabiatiga zid).

## 2b-qadam: Login parollari haqida muhim eslatma
`data/users.json` login/parollarni saqlaydi va login sahifasi uni **brauzerda** o'qib tekshiradi —
shuning uchun bu fayl repo ichida **ochiq (public)** turishi shart, `.env` bilan uni yashirib
bo'lmaydi. Bu — server (backend) bo'lmagan statik saytning tabiiy chegarasi. Agar chinakam maxfiy
login tizimi kerak bo'lsa, buning uchun haqiqiy backend (masalan Firebase Auth yoki boshqa server)
zarur bo'ladi.

## 3-qadam: GitHub token (owner panelidagi 2 ta funksiya uchun)
1. GitHub'da **Settings > Developer settings > Fine-grained tokens > Generate new token**.
2. Faqat shu repo uchun ruxsat bering, **Contents: Read and write** huquqi bilan.
3. Owner sifatida saytga kirib, **Owner paneli**ga o'ting, tokenni "GitHub token" maydoniga kiritib **Saqlash**ni bosing.
   (Token faqat sizning brauzeringizda, localStorage'da saqlanadi.)

Shu tokendan keyin owner panelida:
- **Yangi foydalanuvchi qo'shish** — forma orqali login/parol/ism/rol kiritib, "Hisob yaratish"ni bosasiz — `data/users.json` avtomatik yangilanadi.
- **PDF qo'shish (2-usul)** — papka va faylni tanlab "Yuklash"ni bosasiz — fayl avtomatik repoga tushadi.

## 4-qadam: PDF kitoblarni qo'shish (2 xil usul)
Endi **manifest.json shart emas** — sayt `pdf/` papkasi ichidagi haqiqiy papka/fayl tuzilishini
GitHub orqali jonli o'qiydi.

**1-usul — qo'lda (offline):** `pdf/` ichida kerakli papkaga kirib, PDF faylni shu yerga tashlang
(yoki yangi papka yarating) va GitHub'ga push qiling. Boshqa hech narsa qilish shart emas.

**2-usul — sayt orqali:** Owner panelida GitHub token saqlangandan so'ng, "PDF kitob qo'shish" bo'limidagi
2-usul orqali papka va faylni tanlab yuklang.

## 5-qadam: GitHub Pages'ga joylash (24/7 ishlashi uchun)
Ikki xil usul bor — birini tanlang:

**A) Avtomatik (tavsiya etiladi, 2-qadamda sozlangan bo'lsa):** Repo > Settings > Pages > Source:
"GitHub Actions". Har push'da avtomatik deploy bo'ladi, config fayllari Secrets'dan generatsiya qilinadi.

**B) Oddiy (qo'lda, .env ishlatmasdan):** `js/gemini-api-config.js` va `js/github-config.js`
fayllarini qo'lda to'ldiring, keyin Repo > Settings > Pages > Source: `main` branch, `/ (root)`.
Bu holda kalitlar repo tarixida ochiq saqlanadi (2-qadamdagi eslatmaga qarang).

Bir necha daqiqadan so'ng sayt `https://<username>.github.io/<repo-nomi>/` manzilida 24/7 ishlaydi.

## Kirish animatsiyasi va Owner belgisi
- Login sahifasida qulf ikonkasi bor — muvaffaqiyatli kirishda "qulf ochiladi" animatsiyasi ko'rinadi.
- Owner hisobi bilan kirilganda, asosiy sahifada bir necha soniyaga **"Owner rejimi faol"** degan animatsion belgi chiqadi.
- Rasm kesish (crop) oynasida to'rtburchakni **burchaklaridan tortib** o'lchamini o'zgartirish mumkin, markazidan esa butunlay ko'chirish mumkin.

## API limit ko'rsatkichlari
- Asosiy sahifa yuqorisida joriy brauzerda qilingan **AI so'rovlar soni** va **GitHub API limiti** (qolgan/umumiy) ko'rsatiladi.
- Owner panelida ham GitHub limiti alohida ko'rinadi.

## Loyihaning cheklovlari (muhim)
- Repo **public** bo'lishi kerak (aks holda oddiy foydalanuvchilar login va PDF ro'yxatini ko'ra olmaydi).
- `data/users.json` va Gemini kaliti (agar 2-qadamdagi A usuli ishlatilmasa) ochiq API/fayl orqali
  o'qiladi — bu chinakam maxfiy tizim emas, faqat kichik/ishonchli doira uchun mos oddiy to'siq.
- GitHub'ning **avtorizatsiyasiz** so'rovlar limiti soatiga ~60 ta (IP bo'yicha) — juda katta sinf/oqim
  uchun PDF ro'yxatini yuklashda sekinlashish bo'lishi mumkin.
- **Rasm olish (ekran/oyna tanlash)** funksiyasi faqat HTTPS'da va foydalanuvchi ruxsati bilan ishlaydi.
- **PDF ichidan mos matnni topish** — oddiy so'z mosligi asosida ishlaydi (aniq OCR/semantik qidiruv emas).

## Fayllar tuzilishi
```
index.html        — kirish (login) sahifasi, qulf animatsiyasi
app.html / app.js  — asosiy ish maydoni (rasm olish, resize crop, AI, PDF, limit ko'rsatkichlari)
admin.html         — owner paneli (foydalanuvchi qo'shish, PDF qo'shish, GitHub token)
data/users.json    — foydalanuvchilar ro'yxati (owner panel orqali GitHub API bilan yangilanadi)
.env.example       — mahalliy sozlash uchun namuna (haqiqiy .env hech qachon commit qilinmaydi)
scripts/generate-config.js — .env/Secrets'dan config fayllarini yaratadi
.github/workflows/deploy.yml — GitHub Actions: config generatsiya + Pages'ga avtomatik deploy
js/auth.js         — login tekshiruvi (data/users.json'dan o'qiydi)
js/gemini-api-config.js — Gemini API kaliti (generatsiya qilinadi, .gitignore'da)
js/github-config.js     — GitHub repo manzili (generatsiya qilinadi, .gitignore'da)
js/github-upload.js     — GitHub API: PDF yuklash, foydalanuvchi qo'shish, jonli PDF ro'yxati, rate-limit
js/matrix-rain.js  — login sahifasidagi fon animatsiyasi
assets/lock-locked.svg, assets/lock-unlocked.svg — kirish animatsiyasi ikonkalari
pdf/               — PDF papkalari (avtomatik o'qiladi, JSON kerak emas)
```
