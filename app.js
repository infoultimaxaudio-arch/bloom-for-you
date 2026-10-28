(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const THEMES = ['rose', 'midnight', 'peach', 'sage'];
  const MAX_FILE = 800 * 1024;
  const PHOTO_MAX = 180 * 1024;
  const state = {
    to: 'My favourite person', from: 'Your person', headline: 'For someone who makes life bloom',
    message: 'Some people make ordinary days feel like something worth remembering. You do that for me, just by being you. So here\'s a little reminder, whenever you need one: you are appreciated more than you know. Keep blooming, always. ♡',
    signoff: 'All my love, always ♡', theme: 'rose', photos: [null, null, null], music: null, voice: null
  };
  let toastTimer;
  const toast = (msg) => { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3100); };
  const setBusy = (busy, text) => { $('#loading-screen').hidden = !busy; if (text) $('#loading-screen p').textContent = text; };
  const esc = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const updateProgress = () => {
    let score = 20;
    if (state.to.trim() && state.from.trim()) score += 20;
    if (state.message.trim().length > 25) score += 20;
    if (state.theme) score += 10;
    if (state.photos.some(Boolean)) score += 15;
    if (state.music || state.voice) score += 15;
    $('#editor-progress').style.width = `${score}%`;
  };
  const compactHeadline = (value) => esc(value || 'A little something for you').replace(/\n/g, '<br>');
  function syncPreview() {
    $('#preview-to').textContent = (state.to || 'SOMEONE SPECIAL').toUpperCase();
    const words = (state.headline || 'For someone who makes life bloom').split(/\s+/);
    if (words.length > 4) {
      const mid = Math.ceil(words.length / 2);
      $('#preview-headline').innerHTML = `${esc(words.slice(0, mid).join(' '))}<br><em>${esc(words.slice(mid).join(' '))}</em>`;
    } else $('#preview-headline').innerHTML = `${esc(state.headline || 'A little something for you')}`;
    $('#message-count').textContent = `${state.message.length} / 900`;
    $('#gift-preview').className = `gift-preview theme-${state.theme}`;
    $$('.theme-option').forEach(btn => { const active = btn.dataset.theme === state.theme; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active)); });
    state.photos.forEach((photo, i) => {
      const tile = $(`#photo-${i + 1}`).closest('.upload-tile');
      tile.classList.toggle('has-photo', !!photo);
      if (photo) { tile.style.backgroundImage = `url("${photo}")`; $(`#photo-label-${i + 1}`).textContent = 'Photo added'; }
      else { tile.style.backgroundImage = ''; $(`#photo-label-${i + 1}`).textContent = 'Add a photo'; }
    });
    $('#music-name').textContent = state.music?.name || 'Choose background music';
    $('#voice-name').textContent = state.voice?.name || 'Add a voice note';
    updateProgress();
  }
  const readAsDataURL = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read that file.')); reader.readAsDataURL(file); });
  async function compressImage(file) {
    const raw = await readAsDataURL(file);
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('That image could not be opened.')); img.src = raw; });
    const scale = Math.min(1, 1100 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0,canvas.width,canvas.height);
    let quality = .78; let result = canvas.toDataURL('image/jpeg', quality);
    while (result.length * .75 > PHOTO_MAX && quality > .38) { quality -= .1; result = canvas.toDataURL('image/jpeg', quality); }
    if (result.length * .75 > PHOTO_MAX) throw new Error('That photo is still too large. Try a smaller image.');
    return result;
  }
  async function handlePhoto(input, i) {
    const file = input.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Choose an image file, please.'); input.value = ''; return; }
    try { state.photos[i] = await compressImage(file); syncPreview(); toast('Photo added to your memories ♡'); }
    catch (err) { toast(err.message || 'Could not process that photo.'); input.value = ''; }
  }
  async function handleAudio(input, key) {
    const file = input.files?.[0]; if (!file) return;
    if (!file.type.startsWith('audio/')) { toast('Choose an audio file, please.'); input.value = ''; return; }
    if (file.size > MAX_FILE) { toast('That audio is over 800 KB. Choose a shorter or smaller audio file.'); input.value = ''; return; }
    try { state[key] = { name: file.name.slice(0,80), data: await readAsDataURL(file), type: file.type }; syncPreview(); toast(key === 'music' ? 'Your soundtrack is ready ♫' : 'Voice note added ♡'); }
    catch (err) { toast(err.message || 'Could not read that audio.'); input.value = ''; }
  }
  function progressRose(scene, caption, hint, button) {
    const stages = ['seed','sprout','bloom'];
    let stage = stages.indexOf(scene.dataset.stage || 'seed');
    if (stage < stages.length - 1) stage++;
    scene.dataset.stage = stages[stage];
    if (stage === 0) { caption.textContent = 'Every beautiful thing starts small.'; }
    if (stage === 1) { caption.textContent = 'Look what a little care can do.'; }
    if (stage === 2) { caption.textContent = 'Some things bloom because of you. ♡'; }
    hint.textContent = stage === 2 ? 'A LITTLE SOMETHING, MADE JUST FOR YOU' : stage === 1 ? 'KEEP GOING — SOMETHING IS GROWING' : 'TAP TO SEE THE ROSE GROW';
    button.innerHTML = stage === 2 ? 'The rose has bloomed <span>♡</span>' : stage === 1 ? 'Help it bloom <span>✧</span>' : 'Water the little seed <span>✧</span>';
    button.classList.toggle('is-bloomed', stage === 2);
    return stage;
  }
  function resetRose(scene, caption, hint, button) { scene.dataset.stage='seed'; caption.textContent='Every beautiful thing starts small.'; hint.textContent='TAKE YOUR TIME. THIS IS FOR YOU.'; button.innerHTML='Water the little seed <span>✧</span>'; button.classList.remove('is-bloomed'); }
  $('#water-button').addEventListener('click', () => {
    const stage = progressRose($('#rose-scene'), $('#scene-caption'), $('#preview-hint'), $('#water-button'));
    if (stage === 2) toast('That is how a little feeling blooms. ♡');
  });
  $('#gift-form').addEventListener('input', (e) => {
    const map = {'to-name':'to','from-name':'from','headline':'headline','message':'message','signoff':'signoff'};
    const key = map[e.target.id]; if (key) { state[key] = e.target.value; syncPreview(); }
  });
  $$('.theme-option').forEach(btn => btn.addEventListener('click', () => { state.theme = btn.dataset.theme; syncPreview(); }));
  [1,2,3].forEach(n => $(`#photo-${n}`).addEventListener('change', e => handlePhoto(e.target,n-1)));
  $('#music-file').addEventListener('change', e => handleAudio(e.target,'music'));
  $('#voice-file').addEventListener('change', e => handleAudio(e.target,'voice'));
  $('#clear-media').addEventListener('click', () => {
    state.photos = [null,null,null]; state.music = null; state.voice = null;
    [1,2,3].forEach(n => $(`#photo-${n}`).value=''); $('#music-file').value=''; $('#voice-file').value=''; syncPreview(); toast('Uploaded media removed.');
  });
  $('#reset-form').addEventListener('click', () => {
    if (!confirm('Start over and clear your current gift?')) return;
    $('#gift-form').reset();
    Object.assign(state, {to:'',from:'',headline:'',message:'',signoff:'',theme:'rose',photos:[null,null,null],music:null,voice:null});
    $('#to-name').value='';$('#from-name').value='';$('#headline').value='';$('#message').value='';$('#signoff').value='';
    [1,2,3].forEach(n => $(`#photo-${n}`).value='');$('#music-file').value='';$('#voice-file').value='';
    resetRose($('#rose-scene'),$('#scene-caption'),$('#preview-hint'),$('#water-button'));syncPreview();$('#share-result').hidden=true;
  });

  const bytesToBase64Url = (bytes) => { let binary=''; for(let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length))); return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); };
  const base64UrlToBytes = (s) => { const base=s.replace(/-/g,'+').replace(/_/g,'/'); const padded=base+'='.repeat((4-base.length%4)%4); const binary=atob(padded); const bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i); return bytes; };
  async function compressText(str) {
    const bytes = new TextEncoder().encode(str);
    if ('CompressionStream' in window) { const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')); return bytesToBase64Url(new Uint8Array(await new Response(stream).arrayBuffer())); }
    return bytesToBase64Url(bytes);
  }
  async function decompressText(str) {
    const bytes = base64UrlToBytes(str);
    if ('DecompressionStream' in window) { try { const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')); return await new Response(stream).text(); } catch (_) {} }
    return new TextDecoder().decode(bytes);
  }
  function makePayload() { return {v:1,to:state.to.trim()||'Someone special',from:state.from.trim()||'Someone who cares',headline:state.headline.trim()||'A little something for you',message:state.message,signoff:state.signoff,theme:state.theme,photos:state.photos.filter(Boolean),music:state.music,voice:state.voice,createdAt:new Date().toISOString()}; }
  const getBasePath = () => window.location.href.split('#')[0].split('?')[0];
  function showShareResult(url, isOffline) {
    const result = $('#share-result');result.hidden=false;
    result.innerHTML = `<h3>Your little gift is ready ♡</h3><p>${isOffline?'This link carries the gift inside itself. A long link is normal for an offline preview.':'Your gift has been saved. Anyone with this unlisted link can open it on their phone.'}</p><div class="share-url-line"><input id="share-url" readonly aria-label="Your gift link" value="${esc(url)}"><button type="button" class="share-copy" id="copy-link">Copy link</button></div><div class="share-secondary"><button type="button" id="open-link">Open your gift ↗</button><button type="button" id="whatsapp-link">Send on WhatsApp ↗</button></div>`;
    $('#copy-link').addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); toast('Link copied! Send them a little surprise ♡'); } catch (_) { $('#share-url').select(); document.execCommand('copy'); toast('Link copied!'); } });
    $('#open-link').addEventListener('click', () => window.open(url,'_blank','noopener'));
    $('#whatsapp-link').addEventListener('click', () => window.open(`https://wa.me/?text=${encodeURIComponent('I made a little something for you ♡ Open it here: '+url)}`,'_blank','noopener'));
    result.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  async function createShareLink() {
    const payload=makePayload(); const btn=$('#make-link');btn.disabled=true;btn.textContent='Growing your gift…';
    try {
      let url; let savedOnline=false;
      try {
        const response=await fetch('/.netlify/functions/gifts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        if (response.ok) {const data=await response.json();if(data.id){url=`${getBasePath()}?gift=${encodeURIComponent(data.id)}`;savedOnline=true;}}
      } catch (_) {}
      if (!savedOnline) {
        const compressed=await compressText(JSON.stringify(payload));
        url=`${getBasePath()}#gift=${compressed}`;
      }
      showShareResult(url,!savedOnline);
      if(!savedOnline) toast('Gift link created. Deploy to Netlify for shorter, stored share links.'); else toast('Your gift is ready to share ♡');
    } catch(err) { toast(err.message||'Could not create the gift link. Please try again.'); }
    finally {btn.disabled=false;btn.innerHTML='Create their gift <span>↗</span>';}
  }
  $('#make-link').addEventListener('click',createShareLink);

  function applyPayload(data) {
    if (!data || data.v !== 1) throw new Error('This gift link is not valid.');
    Object.assign(state,{to:String(data.to||'Someone special'),from:String(data.from||'Someone who cares'),headline:String(data.headline||'A little something for you'),message:String(data.message||''),signoff:String(data.signoff||''),theme:THEMES.includes(data.theme)?data.theme:'rose',photos:Array.isArray(data.photos)?data.photos.slice(0,3):[null,null,null],music:data.music||null,voice:data.voice||null});
    $('#recipient-view').className=`recipient-view theme-${state.theme}`;
    const displayHeadline = state.headline.split(/\s+/); const mid=Math.ceil(displayHeadline.length/2);
    $('#recipient-headline').innerHTML = displayHeadline.length>3?`${esc(displayHeadline.slice(0,mid).join(' '))} <em>${esc(displayHeadline.slice(mid).join(' '))}</em>`:esc(state.headline);
    $('#recipient-greeting').textContent=`A little something from ${state.from}.`;
    $('#recipient-subtitle').textContent=`Made with a little extra love for ${state.to}.`;
    $('#letter-to').textContent=`Dear ${state.to},`;
    $('#letter-body').textContent=state.message;
    $('#letter-signoff').textContent=state.signoff;
    $('#letter-from').textContent=`— ${state.from}`;
    $('#letter-section').hidden=true;
    const photos=$('#recipient-photos'); photos.innerHTML='';state.photos.filter(p=>typeof p==='string'&&p.startsWith('data:image/')).forEach(src=>{const img=document.createElement('img');img.src=src;img.alt='A little memory';img.className='recipient-photo';photos.appendChild(img);});
    $('#memories-section').hidden=true;
    if(state.music?.data?.startsWith('data:audio/')){$('#recipient-audio').src=state.music.data;$('#recipient-audio-wrap').hidden=true;}else $('#recipient-audio-wrap').hidden=true;
    if(state.voice?.data?.startsWith('data:audio/')){$('#recipient-voice').src=state.voice.data;$('#voice-section').hidden=true;}else $('#voice-section').hidden=true;
    $('#open-letter').hidden=true;
    $('#recipient-ending p').textContent='Some things are better when they bloom slowly.';
    $('#studio-view').hidden=true;$('#recipient-view').hidden=false;$('#topbar-label').textContent='A LITTLE GIFT FOR YOU';
    document.title=`For ${state.to} — a little gift`;window.scrollTo(0,0);
    resetRose($('#recipient-rose-scene'),$('#recipient-scene-caption'),$('#recipient-hint'),$('#recipient-action'));
  }
  async function loadGift() {
    const params=new URLSearchParams(location.search);const id=params.get('gift');const hash=location.hash.startsWith('#gift=')?location.hash.slice(6):null;
    if(!id&&!hash) {syncPreview();return;}
    setBusy(true,'Bringing a little feeling to life…');
    try {
      let data;
      if(id){const response=await fetch(`/.netlify/functions/gifts?id=${encodeURIComponent(id)}`);if(!response.ok)throw new Error(response.status===404?'This gift link could not be found.':'Could not load the gift. Please try again.');const result=await response.json();data=result.gift;}
      else data=JSON.parse(await decompressText(hash));
      applyPayload(data);
    } catch(err) { toast(err.message||'Could not open that gift.'); $('#studio-view').hidden=false; }
    finally {setBusy(false);}
  }
  $('#recipient-action').addEventListener('click', () => {
    const stage=progressRose($('#recipient-rose-scene'),$('#recipient-scene-caption'),$('#recipient-hint'),$('#recipient-action'));
    if(stage===2){$('#recipient-subtitle').textContent=`This rose bloomed for you, ${state.to}. ♡`;$('#open-letter').hidden=false;setTimeout(()=>$('#open-letter').scrollIntoView({behavior:'smooth',block:'nearest'}),500);}
  });
  $('#open-letter').addEventListener('click',()=>{
    $('#letter-section').hidden=false;
    $('#memories-section').hidden=!state.photos.some(Boolean);
    $('#voice-section').hidden=!(state.voice?.data?.startsWith('data:audio/'));
    $('#recipient-audio-wrap').hidden=!(state.music?.data?.startsWith('data:audio/'));
    $('#open-letter').hidden=true;
    $('#letter-section').scrollIntoView({behavior:'smooth',block:'start'});
    const body=$('#letter-body');
    if(body.dataset.typed==='yes') return;
    body.dataset.typed='yes';
    const full=state.message;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){body.textContent=full;return;}
    body.textContent='';let pos=0;
    const type=()=>{pos=Math.min(full.length,pos+3);body.textContent=full.slice(0,pos);if(pos<full.length)window.setTimeout(type,15);};type();
  });
  $('#back-to-top').addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});});
  loadGift();
})();
