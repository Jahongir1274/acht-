// Login foydalanuvchilari endi data/users.json'dan o'qiladi (owner buni sayt orqali
// GitHub API bilan yangilaydi — bu fayl to'g'ridan-to'g'ri tahrirlanmaydi).

let _achtUsersCache = null;

async function achtLoadUsers(){
  if(_achtUsersCache) return _achtUsersCache;
  const res = await fetch('data/users.json', { cache: 'no-store' });
  const data = await res.json();
  _achtUsersCache = data.users || [];
  return _achtUsersCache;
}

async function achtLogin(email, password){
  const users = await achtLoadUsers();
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if(!found) return false;
  sessionStorage.setItem('acht_user', JSON.stringify({ email: found.email, name: found.name, role: found.role }));
  return true;
}

function achtCurrentUser(){
  const raw = sessionStorage.getItem('acht_user');
  return raw ? JSON.parse(raw) : null;
}

function requireAuth(onReady){
  const user = achtCurrentUser();
  if(!user){
    window.location.href = "index.html";
    return;
  }
  onReady(user);
}

function requireOwner(onReady){
  requireAuth((user) => {
    if(user.role !== "owner"){
      alert("Bu sahifa faqat owner uchun.");
      window.location.href = "app.html";
      return;
    }
    onReady(user);
  });
}

function logout(){
  sessionStorage.removeItem('acht_user');
  window.location.href = "index.html";
}
