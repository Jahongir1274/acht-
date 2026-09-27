// Qora fonda #af02e8 rangli harflar tepadan pastga tushadigan animatsiya.
// Barcha sahifalarga ulanadi va butun ekran ortida (fon sifatida) ishlaydi.
(function(){
  function initMatrixRain(){
    const canvas = document.createElement('canvas');
    canvas.id = 'matrixRain';
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '-1',
      pointerEvents: 'none',
      background: '#000'
    });
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    const fontSize = 16;
    const chars = "アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
    let w, h, cols, drops;

    function resize(){
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      cols = Math.floor(w / fontSize);
      drops = new Array(cols).fill(0).map(() => Math.floor(Math.random() * -50));
    }
    window.addEventListener('resize', resize);
    resize();

    function draw(){
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#af02e8';
      ctx.font = fontSize + 'px monospace';
      for(let i = 0; i < drops.length; i++){
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
        if(drops[i] * fontSize > h && Math.random() > 0.975){
          drops[i] = 0;
        }
        drops[i]++;
      }
    }
    setInterval(draw, 40);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initMatrixRain);
  }else{
    initMatrixRain();
  }
})();
