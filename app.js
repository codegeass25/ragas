// RAGAS v6.2.0 performance-optimized application UI logic — same business behaviour, lighter data loading
const API=(window.VEGE_API_BASE||(location.hostname.endsWith('github.io')?'https://vege.mdmsportal.uk':location.origin)).replace(/\/$/,'');const apiPath=p=>p.startsWith('/api/')?p:'/api'+p;const $=id=>document.getElementById(id);let products=[],cash=[],sales=[],salesReturns=[],purchases=[],collections=[],supplierPayments=[],outlets=[],outletStock=[];let reportCache=null,dashboardReportCache=null,settings={};let salesConfig={creditDiscountPercent:0};const today=new Date().toISOString().slice(0,10);const ALL_REPORT_FROM='1900-01-01',ALL_REPORT_TO='2999-12-31';
const PERF_PAGE_SIZE=100;let dashboardCounts={sales:0,purchases:0,cash:0,collections:0,supplierPayments:0,products:0};const perfHasMore={cash:false,sales:false,purchases:false,collections:false,supplierPayments:false};let recentActivity=[];
function perfUrl(path,offset=0){return `${path}${path.includes('?')?'&':'?'}limit=${PERF_PAGE_SIZE}&offset=${Math.max(0,offset)}`}
function markPerfMore(name,rows){perfHasMore[name]=Array.isArray(rows)&&rows.length>=PERF_PAGE_SIZE}

const assetUrl=(v,version)=>{if(!v)return'';if(/^https?:\/\//i.test(v))return v;const ver=version||settings?.brandingVersion||settings?._brandingVersion||'';return API+('/'+String(v).replace(/^\/+/,''))+(ver?('?v='+encodeURIComponent(ver)):'');};
let deferredInstallPrompt=null;let realtimeConnection=null;let loadPromise=null;let realtimeRefreshTimer=null;
const NEUTRAL_BRAND={companyName:'Business Manager',tagline:'Business Manager',primaryColor:'#46554d',secondaryColor:'#2f3b34',backgroundColor:'#f4f6f4'};
function setText(id,value){const el=$(id);if(el)el.textContent=value}
/* ==========================================================================\n   GLOBAL SEARCHABLE DROPDOWNS\n   Every native <select> remains the authoritative form control. The wrapper\n   adds type-to-search, while existing .value/.onchange business logic stays\n   unchanged. Options can be rebuilt dynamically at any time.\n   ========================================================================== */
const searchableSelectState=new WeakMap();
function searchableSelectLabel(select){
  const opt=select?.options?.[select.selectedIndex];
  return opt?String(opt.textContent||'').trim():'';
}
function closeAllSearchableSelects(exceptWrap=null){
  document.querySelectorAll('.searchableSelectMenu.open').forEach(menu=>{
    const wrap=menu.parentElement;
    if(exceptWrap&&wrap===exceptWrap)return;
    menu.classList.remove('open');
    const input=wrap?.querySelector('.searchableSelectInput');
    if(input)input.setAttribute('aria-expanded','false');
  });
}
function renderSearchableSelectMenu(select,filter=''){
  const state=searchableSelectState.get(select); if(!state)return;
  const q=String(filter||'').trim().toLowerCase();
  const options=[...select.options]
    .map((o,index)=>({o,index}))
    .filter(({o})=>!o.hidden && !o.disabled && (!q || String(o.textContent||'').toLowerCase().includes(q)));
  state.menu.innerHTML='';
  if(!options.length){state.menu.innerHTML='<div class="searchableSelectEmpty">No matching available option.</div>';return;}
  const frag=document.createDocumentFragment();
  for(const {o,index} of options){
    const b=document.createElement('button');
    b.type='button';
    b.className='searchableSelectOption'+(index===select.selectedIndex?' selected active':'');
    b.dataset.index=String(index);
    b.setAttribute('role','option');
    b.setAttribute('aria-selected',index===select.selectedIndex?'true':'false');
    b.textContent=String(o.textContent||'').trim();
    frag.appendChild(b);
  }
  state.menu.appendChild(frag);
}
function syncSearchableSelect(select){
  const state=searchableSelectState.get(select); if(!state)return;
  state.input.disabled=!!select.disabled;
  state.input.setAttribute('aria-disabled',select.disabled?'true':'false');
  if(document.activeElement!==state.input)state.input.value=searchableSelectLabel(select);
  const filter=document.activeElement===state.input?state.input.value:'';
  renderSearchableSelectMenu(select,filter);
}
function openSearchableSelect(select){
  const state=searchableSelectState.get(select); if(!state||select.disabled)return;
  closeAllSearchableSelects(state.wrap);
  state.input.value='';
  renderSearchableSelectMenu(select,'');
  state.menu.classList.add('open');
  state.input.setAttribute('aria-expanded','true');
}
function selectSearchableOption(select,index){
  const state=searchableSelectState.get(select); if(!state)return;
  const option=select.options[index]; if(!option||option.disabled)return;
  select.selectedIndex=index;
  state.input.value=String(option.textContent||'').trim();
  state.menu.classList.remove('open');
  state.input.setAttribute('aria-expanded','false');
  select.dispatchEvent(new Event('change',{bubbles:true}));
}
function enhanceSearchableSelect(select){
  if(!select||searchableSelectState.has(select))return;
  const wrap=document.createElement('div');
  wrap.className='searchableSelect';
  select.parentNode.insertBefore(wrap,select);
  wrap.appendChild(select);
  select.classList.add('searchableSelectNative');

  const input=document.createElement('input');
  input.type='search';
  input.className='searchableSelectInput';
  input.autocomplete='off';
  input.spellcheck=false;
  input.placeholder='Type to search…';
  input.setAttribute('role','combobox');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-expanded','false');
  input.setAttribute('aria-controls',`search-menu-${select.id}`);

  const arrow=document.createElement('span');
  arrow.className='searchableSelectArrow';
  arrow.textContent='▾';
  arrow.setAttribute('aria-hidden','true');

  const menu=document.createElement('div');
  menu.className='searchableSelectMenu';
  menu.id=`search-menu-${select.id}`;
  menu.setAttribute('role','listbox');

  wrap.insertBefore(input,select);
  wrap.appendChild(arrow);
  wrap.appendChild(menu);
  searchableSelectState.set(select,{wrap,input,menu,observer:null});

  input.addEventListener('focus',()=>openSearchableSelect(select));
  input.addEventListener('click',()=>{if(!menu.classList.contains('open'))openSearchableSelect(select)});
  input.addEventListener('input',()=>{
    if(select.disabled)return;
    if(!menu.classList.contains('open'))menu.classList.add('open');
    input.setAttribute('aria-expanded','true');
    renderSearchableSelectMenu(select,input.value);
  });
  input.addEventListener('keydown',e=>{
    if(e.key==='Escape'){menu.classList.remove('open');input.setAttribute('aria-expanded','false');input.value=searchableSelectLabel(select);return;}
    if(e.key==='ArrowDown'&&!menu.classList.contains('open')){e.preventDefault();openSearchableSelect(select);return;}
    if(e.key==='Enter'&&menu.classList.contains('open')){
      const first=menu.querySelector('.searchableSelectOption');
      if(first){e.preventDefault();selectSearchableOption(select,Number(first.dataset.index));}
    }
  });
  menu.addEventListener('mousedown',e=>e.preventDefault());
  menu.addEventListener('click',e=>{
    const b=e.target.closest('.searchableSelectOption');
    if(b)selectSearchableOption(select,Number(b.dataset.index));
  });
  select.addEventListener('change',()=>syncSearchableSelect(select));

  const observer=new MutationObserver(()=>syncSearchableSelect(select));
  observer.observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  searchableSelectState.get(select).observer=observer;
  syncSearchableSelect(select);
}
function enhanceAllSearchableSelects(){document.querySelectorAll('select').forEach(s=>{if(s.classList.contains('hidden')||s.closest('.hidden')||s.getAttribute('aria-hidden')==='true')return;enhanceSearchableSelect(s)});}
document.addEventListener('click',e=>{if(!e.target.closest('.searchableSelect'))closeAllSearchableSelects();});

function setImg(id,url){const el=$(id);if(!el)return;if(url){el.src=url;el.style.display='block'}else{el.removeAttribute('src');el.style.display='none'}}
function brandingManifestUrl(s){const version=s?.brandingVersion||s?._brandingVersion||s?._updatedAt||'';return './manifest.webmanifest'+(version?`?v=${encodeURIComponent(version)}`:'')}
function applyBranding(s){settings={...NEUTRAL_BRAND,...(s||{})};document.title=(settings.companyName||NEUTRAL_BRAND.companyName)+' — Business Manager';document.documentElement.style.setProperty('--g',settings.primaryColor||NEUTRAL_BRAND.primaryColor);document.documentElement.style.setProperty('--g2',settings.secondaryColor||NEUTRAL_BRAND.secondaryColor);document.documentElement.style.setProperty('--bg',settings.backgroundColor||NEUTRAL_BRAND.backgroundColor);const name=settings.companyName||NEUTRAL_BRAND.companyName;const tag=settings.tagline||NEUTRAL_BRAND.tagline;setText('appTitle',name);setText('appSubtitle',tag);setText('loginTitle',name+' — Sign In');setText('loginTagline',tag);setText('splashTitle',name);setText('sidebarBrandName',name);setText('sidebarBrandSub',tag);const splash=assetUrl(settings.loadingLogo);const header=assetUrl(settings.browserLogo);setImg('splashLogo',splash);setImg('loginLogo',splash);setImg('headerLogo',header);setImg('sidebarLogo',header||splash);const fav=assetUrl(settings.favicon||settings.browserLogo);let favicon=document.querySelector('link[data-whitelabel-favicon]');if(fav){if(!favicon){favicon=document.createElement('link');favicon.rel='icon';favicon.dataset.whitelabelFavicon='1';document.head.appendChild(favicon)}favicon.href=fav}else if(favicon){favicon.remove()};let apple=document.querySelector('link[data-whitelabel-apple]');const appleUrl=assetUrl(settings.desktopIcon)||assetUrl(settings.browserLogo);if(appleUrl){if(!apple){apple=document.createElement('link');apple.rel='apple-touch-icon';apple.dataset.whitelabelApple='1';document.head.appendChild(apple)}apple.href=appleUrl}else if(apple){apple.remove()};const tm=document.querySelector('meta[name="theme-color"]');if(tm)tm.content=settings.primaryColor||NEUTRAL_BRAND.primaryColor;const titleMeta=document.querySelector('meta[name="apple-mobile-web-app-title"]');if(titleMeta)titleMeta.content=name;const manifest=document.getElementById('appManifest');if(manifest)manifest.href=brandingManifestUrl(settings);try{renderSettings()}catch(e){console.warn('Optional settings UI initialization skipped:',e)}}
function preloadImage(url){if(!url)return Promise.resolve();return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>resolve();img.src=url})}
function preloadCriticalBranding(s){const ver=s?.brandingVersion||s?._brandingVersion||'';[s?.loadingLogo,s?.browserLogo,s?.desktopIcon,s?.favicon].forEach(v=>{preloadImage(assetUrl(v,ver))});}
const BRAND_CACHE_KEY='vege_brand_cache';
function readCachedBranding(){try{return JSON.parse(localStorage.getItem(BRAND_CACHE_KEY)||'null')}catch{return null}}
function writeCachedBranding(s){try{localStorage.setItem(BRAND_CACHE_KEY,JSON.stringify(s||{}))}catch{}}
async function loadPublicBranding(){try{const r=await fetch(API+apiPath('/settings/public'),{cache:'no-store'});if(!r.ok)throw new Error('Public branding configuration could not be loaded.');const j=await r.json();applyBranding(j.settings||{});writeCachedBranding(j.settings||{});preloadCriticalBranding(j.settings||{});return true}catch(e){console.warn('White-label bootstrap failed:',e);if(!readCachedBranding())applyBranding(NEUTRAL_BRAND);return false}}
function hideBrandSplash(){const splash=$('brandSplash');if(!splash)return;splash.classList.add('hiddenSplash');splash.addEventListener('transitionend',()=>splash.remove(),{once:true})}
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>'₱'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const num=n=>Number.isFinite(Number(n))?Number(n):0;
function token(){return localStorage.getItem('vege_owner_token')||''}
async function api(path,opt={}){const headers={'Accept':'application/json','X-VEGE-Client':'owner-pwa',...(opt.headers||{})};if(token())headers.Authorization='Bearer '+token();const r=await fetch(API+apiPath(path),{...opt,headers});const ct=r.headers.get('content-type')||'';const body=ct.includes('json')?await r.json():await r.text();if(r.status===401){localStorage.removeItem('vege_owner_token');showAuth();throw Error(body?.error?.message||'Sign-in required.')}if(!r.ok)throw Error(body?.error?.message||body?.message||`HTTP ${r.status}`);return body}
function freshSubmissionKey(prefix='req'){try{return `${prefix}-${crypto.randomUUID()}`}catch{return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`}}
function simpleHash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function stickySubmission(scope,body){const storageKey=`vege_idem_${scope}_${simpleHash(JSON.stringify(body))}`;let key='';try{key=sessionStorage.getItem(storageKey)||''}catch{}if(!key){key=freshSubmissionKey(scope);try{sessionStorage.setItem(storageKey,key)}catch{}}return {key,storageKey}}
function clearStickySubmission(x){if(!x)return;try{sessionStorage.removeItem(x.storageKey)}catch{}}
function showToast(msg,bad=false,action=null){const t=$('toast');t.innerHTML=`<span>${esc(String(msg))}</span>${action?`<button onclick="${action.onclick}">${esc(action.label||'View')}</button>`:''}`;t.style.background=bad?'#7d201b':'#173a29';t.classList.add('show');clearTimeout(showToast._t);showToast._t=setTimeout(()=>t.classList.remove('show'),bad?6000:4000)}
function showAuth(){if(realtimeConnection){try{realtimeConnection.close()}catch{}realtimeConnection=null}document.querySelectorAll('#appHeader,#nav,#appMain,#sidebar,#sidebarOverlay,#mobileNav').forEach(x=>x.classList.add('hidden'));$('auth').classList.remove('hidden');refreshInstallUi()}
function showAppShell(){document.querySelectorAll('#appHeader,#nav,#appMain,#sidebar,#mobileNav').forEach(x=>x.classList.remove('hidden'));$('auth').classList.add('hidden');$('sidebarOverlay').classList.remove('open');refreshInstallUi()}
async function boot(){if(!token()){showAuth();return false}try{const st=await api('/settings');settings=st.settings||{};applyBranding(settings);writeCachedBranding(publicBrandSubset(settings));preloadCriticalBranding(settings);showAppShell();showInvTab(invTab,false);loadCarts();connectRealtime().catch(()=>{});load().catch(()=>{});refreshQueueCount().catch(()=>{});return true}catch(e){if(!token())showAuth();else showToast(e.message,true);return false}}
function publicBrandSubset(s){const out={};for(const k of ['companyName','tagline','primaryColor','secondaryColor','backgroundColor','loadingLogo','browserLogo','desktopIcon','favicon'])if(s&&s[k]!==undefined)out[k]=s[k];out.brandingVersion=s?.brandingVersion||s?._brandingVersion||'';return out}
// Fast start: paint the last known branding synchronously from cache so the
// splash never waits on the network, then do exactly ONE settings request
// (/settings when signed in, /settings/public otherwise) instead of two, and
// never block the splash on logo downloads.
async function initializeApp(){
  const cached=readCachedBranding();
  if(cached)applyBranding(cached); else applyBranding(NEUTRAL_BRAND);
  let ok=false;
  try{ok=await boot()}catch(e){console.warn('Boot failed:',e)}
  hideBrandSplash();
  if(!ok)await loadPublicBranding();
}
async function doLogin(e){e.preventDefault();const loginError=$('loginError');if(loginError)loginError.classList.add('hidden');try{const r=await api('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('loginPassword').value})});localStorage.setItem('vege_owner_token',r.token);const lp=$('loginPassword');if(lp)lp.value='';await boot()}catch(err){if(loginError){loginError.textContent=err.message;loginError.classList.remove('hidden')}else{showToast(err.message,true)}}return false}
async function logout(){try{await api('/auth/logout',{method:'POST'})}catch{}localStorage.removeItem('vege_owner_token');showAuth()}
function renderSettings(){if(!$('setCompanyName'))return;$('setCompanyName').value=settings.companyName||'';$('setTagline').value=settings.tagline||'';for(const [id,val] of [['setPrimaryColor',settings.primaryColor||'#145c3a'],['setSecondaryColor',settings.secondaryColor||'#0d452c'],['setBackgroundColor',settings.backgroundColor||'#f4f7f4']]){$(id).value=val;$(`${id}Text`).value=val;$(id).oninput=()=>{$(`${id}Text`).value=$(id).value};$(`${id}Text`).onchange=()=>{const v=$(`${id}Text`).value;if(/^#[0-9a-fA-F]{6}$/.test(v))$(id).value=v;}}const r=settings.receipt||{};$('receiptEnabled').value=String(Boolean(r.enabled));$('receiptPaper').value=r.paperSize||'80mm';$('receiptHeader').value=r.header||'';$('receiptFooter').value=r.footer||'Thank you for your business.';$('receiptAddress').value=r.address||'';$('receiptPhone').value=r.phone||'';$('receiptEmail').value=r.email||'';$('receiptTin').value=r.tin||'';$('receiptShowLogo').checked=r.showLogo!==false;const assets=[['loadingLogo','Loading Screen Logo'],['favicon','Browser Favicon'],['desktopIcon','Desktop / PWA Icon'],['browserLogo','Header / Browser Logo']];$('assetSettings').innerHTML=assets.map(([key,label])=>{const u=assetUrl(settings[key]);return `<div class="settingsAsset"><div class="assetPreview">${u?`<img src="${esc(u)}" alt="${esc(label)}">`:'<div class="assetPreview"><div style="width:52px;height:52px;border:1px dashed var(--line);border-radius:10px"></div></div>'}<div><b>${esc(label)}</b><div class="muted">${u?'Configured':'Not configured'}</div></div></div><div><label class="secondary" style="cursor:pointer">Upload<input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="uploadBranding('${key}',this)"></label>${u?` <button class="danger" onclick="removeBranding('${key}')">Remove</button>`:''}</div></div>`}).join('');}
async function loadSystemHealth(){const el=$('systemHealthBody');if(!el)return;el.textContent='Checking…';try{const r=await api('/system/health');const rows=[];const badge=(ok,good,bad)=>`<b style="color:${ok?'#1a7f4b':'#b3261e'}">${ok?good:bad}</b>`;rows.push(['Books balance',badge(r.balance.balanced,'Balanced','Off by '+money(r.balance.drift))]);rows.push(['Database integrity',badge(r.databaseIntegrity===true||r.databaseIntegrity==='ok','OK','Check failed')]);rows.push(['Last backup',r.backups.lastBackupAt?badge(!r.backups.stale,new Date(r.backups.lastBackupAt).toLocaleString()+' ('+r.backups.ageHours+'h ago)','Stale — '+new Date(r.backups.lastBackupAt).toLocaleString()):badge(false,'','No backup yet')]);rows.push(['Backup schedule',r.backups.intervalHours?`every ${r.backups.intervalHours}h, keeping ${r.backups.retention} files (${r.backups.count} stored)`:badge(false,'','Disabled')]);rows.push(['Database size',r.databaseBytes?(r.databaseBytes/1048576).toFixed(2)+' MB':'—']);rows.push(['Records',Object.entries(r.counts).map(([k,v])=>`${k.replace(/_/g,' ')}: ${v===null?'—':v}`).join(' · ')]);rows.push(['Mode',r.mode]);const cfg=[...(r.configuration.errors||[]).map(x=>['error',x]),...(r.configuration.warnings||[]).map(x=>['warning',x])];const cfgHtml=cfg.length?`<div class="notice" style="margin-top:10px"><b>Configuration to review</b><ul style="margin:6px 0 0 18px">${cfg.map(([sev,msg])=>`<li><b>${sev}:</b> ${esc(msg)}</li>`).join('')}</ul></div>`:'<div class="notice" style="margin-top:10px">Configuration looks deployment-ready.</div>';el.innerHTML=`<table class="table"><tbody>${rows.map(([k,v])=>`<tr><td style="width:190px">${esc(k)}</td><td>${v}</td></tr>`).join('')}</tbody></table>${cfgHtml}`;}catch(e){el.textContent='Health check failed: '+(e.message||e);}}
async function saveSettings(){try{const pick=id=>$(id+'Text').value||$(id).value;const r=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:{companyName:$('setCompanyName').value,tagline:$('setTagline').value,primaryColor:pick('setPrimaryColor'),secondaryColor:pick('setSecondaryColor'),backgroundColor:pick('setBackgroundColor')}})});settings=r.settings;applyBranding(settings);showToast('White-label settings saved.');}catch(e){showToast(e.message,true)}}
async function saveReceiptSettings(){try{const r=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:{receipt:{enabled:$('receiptEnabled').value==='true',paperSize:$('receiptPaper').value,header:$('receiptHeader').value,footer:$('receiptFooter').value,address:$('receiptAddress').value,phone:$('receiptPhone').value,email:$('receiptEmail').value,tin:$('receiptTin').value,showLogo:$('receiptShowLogo').checked}}})});settings=r.settings;renderSettings();showToast('Receipt configuration saved.');}catch(e){showToast(e.message,true)}}
async function uploadBranding(kind,input){try{if(!input.files?.[0])return;const fd=new FormData();fd.append('kind',kind);fd.append('file',input.files[0]);const r=await api('/settings/branding',{method:'POST',body:fd});settings[kind]=r.url;applyBranding(settings);showToast('Brand asset updated.');}catch(e){showToast(e.message,true)}finally{input.value=''}}
async function removeBranding(kind){try{await api('/settings/branding/'+encodeURIComponent(kind),{method:'DELETE'});settings[kind]='';applyBranding(settings);showToast('Brand asset removed.');}catch(e){showToast(e.message,true)}}
function downloadBackup(){$('backupStatus').textContent='Preparing full backup…';location=`${API}/api/backup?token=${encodeURIComponent(token())}`;setTimeout(()=>{$('backupStatus').textContent='Download started. Keep the .vegebak file somewhere safe.'},800)}
async function restoreBackup(){const file=$('restoreFile').files?.[0];if(!file)return;if(!confirm('Restore this backup? The current database will be backed up for safety first, then replaced. The server will restart.')){return;}$('backupStatus').textContent='Uploading and verifying backup…';try{const fd=new FormData();fd.append('backup',file);const r=await api('/restore',{method:'POST',body:fd});$('backupStatus').textContent=r.message||'Restore accepted. The server is restarting.';showToast('Restore accepted. Please reload after the server restarts.');setTimeout(()=>location.reload(),3500);}catch(e){$('backupStatus').textContent=e.message;showToast(e.message,true)}finally{$('restoreFile').value=''}}


function toggleSidebar(){const el=$('sidebar');if(!el)return;el.classList.toggle('open');$('sidebarOverlay')?.classList.toggle('open',el.classList.contains('open'))}
function closeSidebar(){$('sidebar')?.classList.remove('open');$('sidebarOverlay')?.classList.remove('open')}
async function wipeAllData(){const password=$('wipePassword')?.value||'';const confirmation=($('wipeConfirmation')?.value||'').trim();if(!password){showToast('Enter the admin password first.',true);return}if(confirmation!=='WIPE ALL DATA'){showToast('Type WIPE ALL DATA exactly before wiping.',true);return}if(!confirm('FINAL WARNING: This permanently deletes all business and transaction data. Your login and branding settings will remain. Continue?'))return;$('wipeStatus').textContent='Wiping all business data…';try{const r=await api('/admin/wipe-data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,confirmation})});$('wipePassword').value='';$('wipeConfirmation').value='';$('wipeStatus').textContent=r.message||'Data wiped successfully.';showToast('All business data was wiped.');await load();}catch(e){$('wipeStatus').textContent=e.message;showToast(e.message,true)}}
const UI_ICONS={dashboard:`<svg viewBox="0 0 24 24"><path d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7V11h-7v9Zm0-11h7V4h-7v5Z"/></svg>`,sales:`<svg viewBox="0 0 24 24"><path d="M4 19h16M6 16l4-4 3 3 5-7M18 8h-4M18 8v4"/></svg>`,purchases:`<svg viewBox="0 0 24 24"><path d="M3 5h2l2.2 9h9.8l2-6H7M9 19a1 1 0 1 0 0 .01M17 19a1 1 0 1 0 0 .01"/></svg>`,inventory:`<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v8l9 5 9-5V8M12 13v8"/></svg>`,finance:`<svg viewBox="0 0 24 24"><path d="M3 7h18M5 7V5h14v2M5 11h14v8H5v-8Zm3 3h3M15 14h1"/></svg>`,reports:`<svg viewBox="0 0 24 24"><path d="M5 20V10M10 20V4M15 20v-7M20 20V7"/></svg>`,settings:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>`};
const navs=[['dashboard','Dashboard',UI_ICONS.dashboard],['sales','Sales',UI_ICONS.sales],['purchases','Purchases',UI_ICONS.purchases],['inventory','Inventory',UI_ICONS.inventory],['finance','Finance',UI_ICONS.finance],['reports','Reports',UI_ICONS.reports],['settings','Settings',UI_ICONS.settings]];
const NAV_GROUPS=[['Workspace',['dashboard','sales','purchases','inventory','finance']],['Insights',['reports']],['System',['settings']]];
const MOBILE_PRIMARY=['dashboard','sales','purchases','inventory'];
const navMeta=id=>navs.find(n=>n[0]===id);
function navBtn(id,cls=''){const n=navMeta(id);return `<button class="${cls}" data-page="${id}" title="${n[1]}" aria-label="${n[1]}" onclick="goPage('${id}')"><span class="navIcon">${n[2]}</span><span class="navLabel">${n[1]}</span></button>`}
$('nav').innerHTML=NAV_GROUPS.map(([g,ids])=>`<div class="navGroup">${g}</div>`+ids.map(id=>navBtn(id,id==='dashboard'?'active':'')).join('')).join('');
$('mobileNav').innerHTML=MOBILE_PRIMARY.map(id=>navBtn(id,id==='dashboard'?'active':'')).join('')+`<button data-page="__more" onclick="openMoreSheet()"><span class="navIcon">•••</span><span class="navLabel">More</span></button>`;
$('moreSheetGrid').innerHTML=navs.filter(n=>!MOBILE_PRIMARY.includes(n[0])).map(n=>navBtn(n[0])).join('');
function goPage(id,tab){showPage(id);if(id==='inventory'&&tab)showInvTab(tab);if(id==='finance'&&tab)financeTab(tab);closeSidebar();closeMoreSheet()}
function goFinanceTab(tab,purpose){goPage('finance');financeTab(tab);if(tab==='cash'&&purpose)setTimeout(()=>cashPurpose(purpose),0)}
function openMoreSheet(){$('moreSheet').classList.add('open')}
function closeMoreSheet(){$('moreSheet').classList.remove('open')}
['cashDate','saleDate','purchaseDate','collectionDate','payableDate','stockDate','spoilageDate','outletTransferDate','pOpenDate','fromDate','toDate','salesReturnDate'].forEach(id=>{if($(id))$(id).value=today});$('fromDate').value=ALL_REPORT_FROM;$('toDate').value=ALL_REPORT_TO;
function showPage(id){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));const page=$(id);if(!page)return;page.classList.add('active');document.querySelectorAll('#nav button,#mobileNav button,#moreSheetGrid button').forEach(x=>x.classList.toggle('active',x.dataset.page===id));if(!MOBILE_PRIMARY.includes(id))document.querySelector('#mobileNav button[data-page="__more"]')?.classList.add('active');window.scrollTo({top:0,behavior:'instant'});if(id==='reports')applyReportPeriod();if(id==='settings'){renderSettings();loadSmsSettings();loadSmsHistory();loadSystemHealth().catch?.(()=>{})}if(id==='dashboard')loadAnalytics();if(id==='inventory'){renderInvTabs();refreshQueueCount().catch(()=>{})}if(id==='finance')renderLoansFinance();}

/* ==========================================================================
   INVENTORY INFORMATION ARCHITECTURE
   One shared tab strip for the whole Inventory section: Stock (products plus
   their per-row lot / batch drawer), Queue (with the pending-spoilage
   notification bell), Spoilage / Wastage and Stocktake. Presentation only - no tab performs an inventory or accounting
   mutation by itself.
   ========================================================================== */
const INV_TAB_ICONS={box:`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>`,doc:`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 3h9l4 4v14H6Z"/><path d="M15 3v4h4"/><path d="M9 12h6M9 16h4"/></svg>`,bell:`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/></svg>`,trash:`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>`,chart:`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`};
const INV_TABS=[['stock','Stock','box'],['outlet','Outlet Stock','box'],['queue','Queue','bell'],['spoilage','Spoilage / Wastage','trash'],['stocktake','Stocktake','chart']];
let invTab=(()=>{try{const t=sessionStorage.getItem('vege_inv_tab');return INV_TABS.some(x=>x[0]===t)?t:'stock'}catch{return 'stock'}})();

/* THE authoritative pending queue count. Fetched from
   GET /api/inventory/spoilage-queue/count and nowhere else recomputed.
   null = not known yet, so the badge simply stays hidden (never 0/NaN). */
let pendingQueueCount=null;

function queueBadgeText(n){return n>99?'99+':String(n)}
function renderInvTabs(){
  const el=$('invTabs'); if(!el)return;
  const n=Number.isFinite(pendingQueueCount)?pendingQueueCount:0;
  el.innerHTML=INV_TABS.map(([id,label,icon])=>{
    const active=invTab===id;
    const isQueue=id==='queue';
    const showBadge=isQueue&&n>0;
    // Accessible name never relies on the badge colour alone.
    const aria=isQueue?(n>0?`Queue, ${n} pending item${n===1?'':'s'}`:'Queue, no pending items'):label;
    return `<button type="button" id="invTab-${id}" role="tab" aria-selected="${active}" aria-controls="invPanel-${id}" tabindex="${active?0:-1}" aria-label="${aria}" title="${aria}" onclick="showInvTab('${id}')" onkeydown="onInvTabKey(event,'${id}')">`
      +`<span class="invTabIcon" aria-hidden="true">${INV_TAB_ICONS[icon]||''}</span><span class="invTabLabel">${label}</span>`
      +(showBadge?`<span class="invTabBadge" aria-hidden="true">${queueBadgeText(n)}</span>`:'')+`</button>`;
  }).join('');
}
function showInvTab(id,focus=true){
  if(!INV_TABS.some(x=>x[0]===id))id='stock';
  invTab=id; try{sessionStorage.setItem('vege_inv_tab',id)}catch{}
  document.querySelectorAll('#inventory .invPanel').forEach(p=>p.classList.toggle('active',p.id==='invPanel-'+id));
  renderInvTabs();
  if(id==='queue')loadSpoilageQueue().catch(()=>{});
  if(focus)$('invTab-'+id)?.focus({preventScroll:true});
}
function onInvTabKey(e,id){
  const keys={ArrowRight:1,ArrowLeft:-1,ArrowDown:1,ArrowUp:-1};
  if(keys[e.key]===undefined&&e.key!=='Home'&&e.key!=='End')return;
  e.preventDefault();
  const ids=INV_TABS.map(x=>x[0]); const i=ids.indexOf(id);
  const next=e.key==='Home'?0:e.key==='End'?ids.length-1:(i+keys[e.key]+ids.length)%ids.length;
  showInvTab(ids[next]);
}
/** Single fetch point for the badge number. */
async function refreshQueueCount(){
  try{const r=await api('/inventory/spoilage-queue/count');pendingQueueCount=num(r.pending);}
  catch{/* leave the previous known value; never invent a notification */}
  renderInvTabs();
}

const SMS_CATS=[["inventory", "Inventory & expiry"], ["financial", "Cash & financial"], ["receivable", "Customer receivables"], ["payable", "Supplier payables"], ["loan", "Loans"], ["system", "System & backups"], ["largeTransactions", "Large transactions"], ["dailySummary", "Daily business summary"], ["weeklySummary", "Weekly business summary"]];
const SMS_THRESH=[["largeSale", "Large sale amount"], ["largePurchase", "Large purchase amount"], ["largeCollection", "Large collection amount"], ["largeCashIn", "Large cash in"], ["largeCashOut", "Large cash out"], ["lowCash", "Low cash floor"], ["inventoryLossValue", "Spoilage loss value"], ["stocktakeVarianceValue", "Stocktake variance value"], ["receivableOverdueDays", "Receivable overdue (days)"], ["receivableOverdueAmount", "Receivable overdue amount"], ["payableOverdueDays", "Payable overdue (days)"], ["payableOverdueAmount", "Payable overdue amount"], ["loanOutstanding", "Loan outstanding above"]];
let smsSettings=null;
function smsBadge(t,cls){return `<span class="pill ${cls||''}">${t}</span>`}
async function loadSmsSettings(){const box=$('smsGatewayStatus');if(!box)return;try{const r=await api('/sms/settings');smsSettings=r.settings||{};
 $('smsEnabled').value=String(Boolean(smsSettings.enabled));
 $('smsOwnerNumber').value=smsSettings.ownerNumber||'';
 $('smsDailyTime').value=smsSettings.dailySummaryTime||'18:00';
 $('smsBatchWindow').value=num(smsSettings.batchWindowSeconds);
 $('smsQuietEnabled').value=String(Boolean(smsSettings.quietHours&&smsSettings.quietHours.enabled));
 $('smsQuietFrom').value=(smsSettings.quietHours&&smsSettings.quietHours.from)||'21:00';
 $('smsQuietTo').value=(smsSettings.quietHours&&smsSettings.quietHours.to)||'07:00';
 const cats=smsSettings.categories||{};
 $('smsCategories').innerHTML=SMS_CATS.map(([k,label])=>`<label class="field" style="display:flex;flex-direction:row;gap:10px;align-items:center;justify-content:flex-start"><input type="checkbox" id="smsCat_${k}" style="width:18px;height:18px;flex:0 0 auto;margin:0" ${cats[k]?'checked':''}><span style="flex:1 1 auto">${label}</span></label>`).join('');
 const th=smsSettings.thresholds||{};
 $('smsThresholds').innerHTML=SMS_THRESH.map(([k,label])=>`<div class="field"><label>${label}</label><input id="smsTh_${k}" type="number" min="0" step="1" value="${num(th[k])}"></div>`).join('');
 const g=r.gateway||{};
 box.className='notice'+(g.configured?'':' bad');
 box.innerHTML=g.configured?`<b>Gateway ready</b> — ${g.mode==='cloud'?'SMSGate Cloud':'SMSGate on your device'} at <code>${g.endpoint}</code>${g.sim?' · SIM '+g.sim:''}${g.expeditedPriority?' · high priority':''}`
  :`<b>Gateway not configured.</b> Set <code>SMSGATE_USERNAME</code> and <code>SMSGATE_PASSWORD</code> on the server (from the SMSGate app), then reload. Alerts are recorded but cannot be sent until then.`;
 loadSmsStatus();
}catch(e){box.className='notice bad';box.textContent='Could not load SMS settings: '+e.message}}
async function loadSmsStatus(){const el=$('smsStatusBody');if(!el)return;try{const s=await api('/sms/status');const q=s.queue||{};
 el.innerHTML=`Alerts: <b>${s.enabled?'On':'Off'}</b> · Number: <b>${s.hasOwnerNumber?s.ownerNumberMasked:'not set'}</b> · Queued: <b>${num(q.queued)}</b> · Sent: <b>${num(q.sent)}</b> · Failed: <b>${num(q.failed)}</b> · Watching: <b>${num(s.pendingEvents)}</b> open issue(s)`
  +(s.lastScanAt?`<br>Last check: ${smsWhen(s.lastScanAt)}`:'')
  +(s.lastErrorKind?`<br><span style="color:#8f211b">Last send problem: ${s.lastErrorKind}</span>`:'');
}catch(e){el.textContent=''}}
function smsPayload(){const cats={},th={};for(const [k] of SMS_CATS)cats[k]=$('smsCat_'+k)?.checked||false;for(const [k] of SMS_THRESH)th[k]=num($('smsTh_'+k)?.value);
 return {enabled:$('smsEnabled').value==='true',ownerNumber:$('smsOwnerNumber').value.trim(),categories:cats,thresholds:th,
  dailySummaryTime:$('smsDailyTime').value||'18:00',batchWindowSeconds:num($('smsBatchWindow').value),
  quietHours:{enabled:$('smsQuietEnabled').value==='true',from:$('smsQuietFrom').value||'21:00',to:$('smsQuietTo').value||'07:00'}}}
async function saveSmsSettings(){try{const r=await api('/sms/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(smsPayload())});smsSettings=r.settings||smsSettings;showToast('SMS settings saved');loadSmsSettings()}catch(e){showToast(e.message,true)}}
async function sendSmsTest(){try{await api('/sms/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});showToast('Test SMS sent')}catch(e){showToast(e.message,true)}finally{loadSmsStatus();loadSmsHistory()}}
async function runSmsScan(){try{await api('/sms/scan',{method:'POST'});showToast('Safety check complete');loadSmsStatus();loadSmsHistory()}catch(e){showToast(e.message,true)}}
async function sendSmsSummary(){try{await api('/sms/summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'daily'})});showToast('Summary SMS queued');loadSmsStatus();loadSmsHistory()}catch(e){showToast(e.message,true)}}
async function retryFailedSms(){try{const r=await api('/sms/retry',{method:'POST'});showToast('Requeued '+num(r.requeued)+' message(s)');loadSmsStatus();loadSmsHistory()}catch(e){showToast(e.message,true)}}
// Timestamps from the database are SQLite CURRENT_TIMESTAMP values in UTC with no
// timezone marker ("2026-08-26 01:57:24"). Parsing them directly makes the browser
// treat them as local time, shifting every SMS row by the timezone offset. Normalise
// to UTC first so the displayed time is the real send attempt time.
function smsDate(value){
  if(!value)return null;
  if(value instanceof Date)return isNaN(value)?null:value;
  const raw=String(value).trim();if(!raw)return null;
  const iso=/[Zz]|[+-]\d{2}:?\d{2}$/.test(raw)?raw:(raw.includes('T')?raw+'Z':raw.replace(' ','T')+'Z');
  const d=new Date(iso);return isNaN(d)?null:d;
}
function smsWhen(value){const d=smsDate(value);if(!d)return '—';
  return d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'})+', '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function smsWhenCell(m){
  const attempt=m.sent_at||m.failed_at||m.delivered_at||m.next_attempt_at||m.at;
  const d=smsDate(attempt);if(!d)return '—';
  const queued=smsDate(m.at);
  const dateLine=d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'});
  const timeLine=d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const sub=(queued&&Math.abs(queued-d)>=1000)?`<br><span class="muted" style="font-size:11px">queued ${queued.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>`:'';
  return `${dateLine}<br><b>${timeLine}</b>${sub}`;
}
async function loadSmsHistory(){const el=$('smsHistoryBody');if(!el)return;try{const r=await api('/sms/history?limit=50');const rows=r.messages||[];
 if(!rows.length){el.textContent='No SMS alerts yet.';return}
 el.innerHTML=`<div class="tablewrap"><table><thead><tr><th>When (attempt)</th><th>Type</th><th>Priority</th><th>Status</th><th>Message</th></tr></thead><tbody>`+
 rows.map(m=>`<tr><td style="white-space:nowrap">${smsWhenCell(m)}</td><td>${m.category}${m.part?' ('+m.part+')':''}</td><td>${m.severity}</td>
  <td>${m.status}${m.delivery&&m.delivery!==m.status?' / '+m.delivery:''}${m.attempts>1?' · try '+m.attempts:''}${m.error_kind?'<br><span style="color:#8f211b">'+m.error_kind+'</span>':''}</td>
  <td style="white-space:pre-wrap">${(m.preview||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</td></tr>`).join('')+`</tbody></table></div>`;
}catch(e){el.textContent='Could not load history: '+e.message}}

const CASH_IN_CATEGORIES=['Other Operating Income','Owner Capital Contribution','Loan Proceeds','Sale of Fixed Asset','Other Income'];
const CASH_OUT_CATEGORIES=['Farm Inputs','Farm Labor','Transportation / Delivery','Fuel','Packaging','Rent','Utilities','Salaries & Wages','Advertising & Marketing','Repairs & Maintenance','Taxes & Government Fees','Bank Charges','Equipment Purchase','Vehicle Purchase','Other Fixed Asset Purchase','Loan Principal Repayment','Owner Drawings / Withdrawal','Other Operating Expense'];
function categories(dir){return dir==='in'?[...CASH_IN_CATEGORIES]:[...CASH_OUT_CATEGORIES]}
function cashDirectionForCategory(cat){return CASH_IN_CATEGORIES.includes(cat)?'in':'out'}
const CASH_PURPOSES={expense:['Farm Inputs','Farm Labor','Transportation / Delivery','Fuel','Packaging','Rent','Utilities','Salaries & Wages','Advertising & Marketing','Repairs & Maintenance','Taxes & Government Fees','Bank Charges','Other Operating Expense'],income:['Other Operating Income','Other Income'],asset:['Equipment Purchase','Vehicle Purchase','Other Fixed Asset Purchase','Sale of Fixed Asset'],loan:['Loan Proceeds','Loan Principal Repayment'],owner:['Owner Capital Contribution','Owner Drawings / Withdrawal']};
let cashPurposeKey='expense';
const cashExamples={
  'Other Operating Income':'kita sa pagbaligya og by-products sa tanom, seedlings, o service nga konektado sa negosyo.',
  'Owner Capital Contribution':'ang tag-iya nagdugang og kwarta para gamiton sa negosyo.',
  'Loan Proceeds':'kwarta nga nadawat gikan sa bangko o lending institution isip loan.',
  'Sale of Fixed Asset':'pagbaligya og tractor, makina, vehicle, o equipment sa negosyo.',
  'Other Income':'interest sa bank account o laing income nga dili gikan sa normal nga operasyon.',
  'Farm Inputs':'abono, binhi, pesticide, feeds, ug uban pang farm supplies.',
  'Farm Labor':'bayad sa mga trabahante sa pagpanguma, pagtanom, pag-ani, ug packing.',
  'Transportation / Delivery':'bayad sa delivery, trucking, pamasahe, o pagdala sa produkto.',
  'Fuel':'diesel, gasolina, ug fuel para sa tractor, vehicle, pump, o generator.',
  'Packaging':'sacks, boxes, crates, plastic, labels, ug uban pang packaging materials.',
  'Rent':'abang sa yuta, building, bodega, stall, o equipment.',
  'Utilities':'kuryente, tubig, internet, telepono, ug uban pang utility bills.',
  'Salaries & Wages':'sweldo sa regular o part-time nga empleyado ug trabahante.',
  'Advertising & Marketing':'tarpaulin, flyers, Facebook ads, promotions, ug marketing materials.',
  'Repairs & Maintenance':'pag-ayo sa vehicle, equipment, building, irrigation, o farm tools.',
  'Taxes & Government Fees':'business permit, licenses, registration, taxes, ug government fees.',
  'Bank Charges':'bank transfer fee, withdrawal fee, service charge, o processing fee.',
  'Equipment Purchase':'pagpalit og tools, machinery, refrigerator, weighing scale, o equipment.',
  'Vehicle Purchase':'pagpalit og delivery van, motorcycle, truck, o farm vehicle.',
  'Loan Principal Repayment':'pagbayad sa principal sa loan; dili apil ang interest.',
  'Owner Drawings / Withdrawal':'pagkuha sa tag-iya og kwarta gikan sa negosyo para personal nga gamit.',
  'Other Operating Expense':'lain-laing gasto nga konektado sa adlaw-adlaw nga operasyon sa negosyo.',
};
function closeCashCategoryMenu(){const m=$('cashCatMenu');const b=$('cashCatBtn');if(m&&b){m.classList.remove('open');b.setAttribute('aria-expanded','false')}}
function selectCashCategory(cat){$('cashCat').value=cat;const dir=cashDirectionForCategory(cat);$('cashDir').value=dir;$('cashCatBtn').innerHTML=`${esc(cat)} <span>▾</span>`;$('cashCatMenu').querySelectorAll('.cashOpt').forEach(x=>x.classList.toggle('active',x.dataset.value===cat));const badge=$('cashDirectionBadge');if(badge){badge.textContent=dir==='in'?'Cash In · determined automatically':'Cash Out · determined automatically';badge.classList.toggle('cashIn',dir==='in');badge.classList.toggle('cashOut',dir==='out')}const help=$('cashCategoryHelp');if(help)help.textContent=cashExamples[cat]?'Example: '+cashExamples[cat]:'Direction and accounting treatment are selected automatically.';closeCashCategoryMenu();loadCashLinkedOptions().catch(()=>{})}
const CASH_PURPOSE_LABELS={expense:'Operating Expense',income:'Other Income',asset:'Assets',loan:'Loans',owner:'Owner Transactions'};
function renderCashCategories(){
  // The purpose cards are the authoritative filter for this dropdown. A user
  // should never see categories from a card they did not select.
  const items=[...(CASH_PURPOSES[cashPurposeKey]||CASH_PURPOSES.expense)];
  const label=CASH_PURPOSE_LABELS[cashPurposeKey]||'Cash';
  const previous=$('cashCat').value;
  const current=items.includes(previous)?previous:(items[0]||'');
  const menu=$('cashCatMenu');
  menu.innerHTML=`<input type="search" class="cashSelectSearch" id="cashCatSearch" autocomplete="off" placeholder="Search ${esc(label)} types…" aria-label="Search ${esc(label)} categories"><div class="cashGroupLabel">${esc(label)} · selected card only</div>`+items.map(x=>`<button type="button" class="cashOpt${x===current?' active':''}" data-value="${esc(x)}" role="option"><span class="cashOptTitle">${esc(x)}</span><span class="cashOptExample">${esc(cashDirectionForCategory(x)==='in'?'Cash In':'Cash Out')} · ${esc(cashExamples[x]||'')}</span></button>`).join('');
  const search=$('cashCatSearch');
  if(search)search.oninput=()=>{const q=search.value.trim().toLowerCase();menu.querySelectorAll('.cashOpt').forEach(btn=>btn.style.display=!q||btn.textContent.toLowerCase().includes(q)?'':'none')};
  menu.querySelectorAll('.cashOpt').forEach(btn=>btn.onclick=()=>selectCashCategory(btn.dataset.value));
  if(current)selectCashCategory(current);
}
function cashPurpose(key){cashPurposeKey=(key||'expense').replace(/-(in|out)$/,'');document.querySelectorAll('#cashPurposeGrid button').forEach(b=>b.classList.remove('active'));const idx={expense:0,income:1,asset:2,loan:3,owner:4}[cashPurposeKey];const b=document.querySelectorAll('#cashPurposeGrid button')[idx];if(b)b.classList.add('active');renderCashCategories();if(key==='loan-in')selectCashCategory('Loan Proceeds');if(key==='loan-out')selectCashCategory('Loan Principal Repayment')}
async function loadCashLinkedOptions(){const loanField=$('cashLoanField'),assetField=$('cashAssetField');const cat=$('cashCat').value;loanField.classList.toggle('hidden',cat!=='Loan Principal Repayment');assetField.classList.toggle('hidden',cat!=='Sale of Fixed Asset');if(cat==='Loan Principal Repayment'){try{const asOf=$('cashDate').value||today;const r=await api('/loans/options?asOf='+encodeURIComponent(asOf));const rows=r.loans||[];$('cashLoan').innerHTML=rows.length?'<option value="">— Select loan —</option>'+rows.map(x=>`<option value="${x.source_id}">${esc(x.loan_id)} — ${esc(x.date)} — Outstanding ${money(x.outstanding_amount)}</option>`).join(''):'<option value="">No outstanding loans</option>';}catch(e){$('cashLoan').innerHTML='<option value="">Unable to load loans</option>';showToast(e.message,true)}}else if(cat==='Sale of Fixed Asset'){try{const asOf=$('cashDate').value||today;const r=await api('/fixed-assets/options?asOf='+encodeURIComponent(asOf));const rows=r.assets||[];$('cashAsset').innerHTML=rows.length?'<option value="">— Select fixed asset —</option>'+rows.map(x=>`<option value="${x.id}">#${x.id} — ${esc(x.description||'Fixed asset')} — Carrying ${money(x.carrying_value)}</option>`).join(''):'<option value="">No open fixed assets</option>';}catch(e){$('cashAsset').innerHTML='<option value="">Unable to load assets</option>';showToast(e.message,true)}}}
$('cashDate').onchange=loadCashLinkedOptions;$('cashCatBtn').onclick=()=>{const m=$('cashCatMenu');const open=m.classList.toggle('open');$('cashCatBtn').setAttribute('aria-expanded',open?'true':'false')};document.addEventListener('click',e=>{if($('cashCatWrap')&&!$('cashCatWrap').contains(e.target))closeCashCategoryMenu()});cashPurpose('expense');
enhanceAllSearchableSelects();
$('saleProduct').onchange=()=>{const p=products.find(x=>x.id==$('saleProduct').value);if(p){$('salePrice').value=p.selling_price||'';}updateCreditDiscountUI()};
$('saleStatus').onchange=()=>{if(String($('saleStatus').value||'Credit').toLowerCase()==='cash')$('saleDiscount').value='0';updateCreditDiscountUI()};
$('salePrice').oninput=updateCreditDiscountUI;
$('saleQty').oninput=updateCreditDiscountUI;
$('purchaseProduct').onchange=()=>{const p=products.find(x=>x.id==$('purchaseProduct').value);if(p)$('purchaseCost').value=p.unit_cost||''};

let alerts={counts:{low_stock:0,expiring_soon:0,expired:0},totals:{},low_stock:[],expiring_soon:[],expired:[]};
let payableOptions={suppliers:[],purchases:[],payments:[]},payableOptionsDate='';
async function loadPayableOptions(){
  const d=$('payableDate')?.value||today;
  try{
    const r=await api(`/reports/detail?type=payables&to=${encodeURIComponent(d)}`);
    payableOptions=r.report||{suppliers:[],purchases:[],payments:[]};
    payableOptionsDate=d;
    renderPayableSuppliers();
  }catch(e){showToast(`Could not refresh payables for ${d}: ${e.message}`,true)}
}
let showArchived=false,inventoryStatusMode='active', expandedLots=new Set();
function saleSelectedOutletId(){return String($('saleOutlet')?.value||'');}
function outletProductQty(outletId,productId){
  if(!outletId)return num(products.find(p=>Number(p.id)===Number(productId))?.stock_qty);
  return outletStock.reduce((sum,row)=>{
    return sum+(Number(row.outlet_id)===Number(outletId)&&Number(row.product_id)===Number(productId)?num(row.qty):0);
  },0);
}
function saleAvailableQty(productId,outletId){return outletProductQty(outletId,productId)}
function renderSaleProductOptions(preferredId){
  const sel=$('saleProduct');if(!sel)return;
  const outletId=saleSelectedOutletId();
  const outlet=outletId?outlets.find(o=>String(o.id)===outletId):null;
  const wanted=preferredId??sel.value;
  const available=products.map(p=>({p,qty:saleAvailableQty(p.id,outletId)})).filter(x=>x.qty>0.000001);
  const labelFor=(p,qty)=>outlet
    ? `${esc(p.name)} — ${esc(outlet.name)} stock ${qty.toFixed(3)} ${esc(p.unit)}`
    : `${esc(p.name)} — Main stock ${qty.toFixed(3)} ${esc(p.unit)}`;
  sel.innerHTML=available.map(({p,qty})=>`<option value="${p.id}">${labelFor(p,qty)}</option>`).join('');
  const preferred=available.find(x=>String(x.p.id)===String(wanted));
  if(preferred)sel.value=String(preferred.p.id);
  else if(available.length)sel.value=String(available[0].p.id);
  else sel.value='';
  if(!available.length)sel.innerHTML='<option value="">No available products at this location</option>';
}
function renderSpoilageProductOptions(preferredId){
  const sel=$('spoilageProduct');if(!sel)return;
  const outletId=$('spoilageOutlet')?.value||'';
  const wanted=preferredId??sel.value;
  const available=products.map(p=>({p,qty:outletId?outletProductQty(outletId,p.id):num(p.stock_qty)})).filter(x=>x.qty>0.000001);
  sel.innerHTML=available.map(({p,qty})=>`<option value="${p.id}">${esc(p.name)} — ${outletId?'Outlet':'Main'} stock ${qty.toFixed(3)} ${esc(p.unit)}</option>`).join('');
  const preferred=available.find(x=>String(x.p.id)===String(wanted));
  if(preferred)sel.value=String(preferred.p.id);
  else if(available.length)sel.value=String(available[0].p.id);
  else sel.value='';
  if(!available.length)sel.innerHTML='<option value="">No available products at this location</option>';
}
function renderOutletTransferProductOptions(preferredId){
  const sel=$('outletTransferProduct');if(!sel)return;
  const wanted=preferredId??sel.value;
  const available=products.map(p=>({p,qty:num(p.stock_qty)})).filter(x=>x.qty>0.000001);
  sel.innerHTML=available.map(({p,qty})=>`<option value="${p.id}">${esc(p.name)} — Main stock ${qty.toFixed(3)} ${esc(p.unit)}</option>`).join('');
  const preferred=available.find(x=>String(x.p.id)===String(wanted));
  if(preferred)sel.value=String(preferred.p.id);
  else if(available.length)sel.value=String(available[0].p.id);
  else sel.value='';
  if(!available.length)sel.innerHTML='<option value="">No stock available in Main Farm Inventory</option>';
}
async function load(){
  if(loadPromise)return loadPromise;
  loadPromise=(async()=>{try{
    const payDate=$('payableDate')?.value||today;let dash,arDetail,apDetail,counts;
    [products,cash,sales,salesReturns,purchases,collections,supplierPayments,dash,alerts,arDetail,apDetail,salesConfig,outlets,outletStock,counts,recentActivity]=await Promise.all([
      api('/products'+(showArchived?'?includeArchived=1':'')),api(perfUrl('/cash')),api(perfUrl('/sales')),api('/sales-returns'),api(perfUrl('/purchases')),api(perfUrl('/collections')),api(perfUrl('/supplier-payments')),api(`/dashboard-summary?to=${encodeURIComponent(today)}`),api('/alerts'),api(`/reports/detail?type=receivables&to=${encodeURIComponent(payDate)}`),api(`/reports/detail?type=payables&to=${encodeURIComponent(payDate)}`),api('/sales/config'),api('/outlets'),api(`/inventory/outlet-stock?to=${ALL_REPORT_TO}`),api('/dashboard-counts'),api('/activity?limit=15')
    ]);
    markPerfMore('cash',cash);markPerfMore('sales',sales);markPerfMore('purchases',purchases);markPerfMore('collections',collections);markPerfMore('supplierPayments',supplierPayments);
    dashboardReportCache=dash;operationalReceivables=arDetail.report||{total:0,customers:[],sales:[],unallocated:[]};payableOptions=apDetail.report||{suppliers:[],purchases:[],payments:[]};dashboardCounts=counts||dashboardCounts;
    outlets=Array.isArray(outlets)?outlets:(Array.isArray(outlets?.rows)?outlets.rows:Array.isArray(outlets?.outlets)?outlets.outlets:[]);outletStock=Array.isArray(outletStock)?outletStock:(Array.isArray(outletStock?.rows)?outletStock.rows:Array.isArray(outletStock?.data)?outletStock.data:[]);payableOptionsDate=payDate;
    render();renderDashboard();updateCreditDiscountUI();renderAlerts();loadSpoilageQueue().catch(()=>{});if(document.getElementById('dashboard')?.classList.contains('active'))setTimeout(()=>loadAnalytics().catch(()=>{}),250);setSync('Synced');
  }catch(e){setSync('Offline / API error',true);throw e}finally{loadPromise=null}})();return loadPromise
}
async function refreshResourcePage(name){
  const map={cash:['/cash',()=>cash,v=>cash=v,renderCash],sales:['/sales',()=>sales,v=>sales=v,renderSales],purchases:['/purchases',()=>purchases,v=>purchases=v,renderPurchases],collections:['/collections',()=>collections,v=>collections=v,renderCollections],supplierPayments:['/supplier-payments',()=>supplierPayments,v=>supplierPayments=v,renderSupplierPayments]};
  const cfg=map[name];if(!cfg)return;const rows=await api(perfUrl(cfg[0],0));cfg[2](rows);markPerfMore(name,rows);cfg[3]();
}
async function refreshAfterChange(change={}){
  try{
    const r=String(change.resource||'');
    const jobs=[];
    if(r==='sales')jobs.push(refreshResourcePage('sales'),api('/products'+(showArchived?'?includeArchived=1':'' )).then(v=>products=v),api(`/reports/detail?type=receivables&to=${encodeURIComponent($('payableDate')?.value||today)}`).then(v=>operationalReceivables=v.report||operationalReceivables));
    else if(r==='purchases')jobs.push(refreshResourcePage('purchases'),api('/products'+(showArchived?'?includeArchived=1':'' )).then(v=>products=v),api(`/reports/detail?type=payables&to=${encodeURIComponent($('payableDate')?.value||today)}`).then(v=>payableOptions=v.report||payableOptions));
    else if(r==='collections')jobs.push(refreshResourcePage('collections'),api(`/reports/detail?type=receivables&to=${encodeURIComponent($('payableDate')?.value||today)}`).then(v=>operationalReceivables=v.report||operationalReceivables));
    else if(r==='supplier-payments'||r==='supplier_payments')jobs.push(refreshResourcePage('supplierPayments'),api(`/reports/detail?type=payables&to=${encodeURIComponent($('payableDate')?.value||today)}`).then(v=>payableOptions=v.report||payableOptions));
    else if(r==='cash')jobs.push(refreshResourcePage('cash'));
    else if(['inventory','products','outlets'].includes(r))jobs.push(api('/products'+(showArchived?'?includeArchived=1':'' )).then(v=>products=v),api('/outlets').then(v=>outlets=Array.isArray(v)?v:(v.rows||v.outlets||[])),api(`/inventory/outlet-stock?to=${ALL_REPORT_TO}`).then(v=>outletStock=Array.isArray(v)?v:(v.rows||v.data||[])));
    else return load();
    jobs.push(api('/alerts').then(v=>alerts=v),api('/dashboard-counts').then(v=>dashboardCounts=v||dashboardCounts),api('/activity?limit=15').then(v=>recentActivity=v||[]));
    if(isSuperAdmin())jobs.push(api(`/dashboard-summary?to=${encodeURIComponent(today)}`).then(v=>dashboardReportCache=v));
    await Promise.all(jobs);render();renderDashboard();renderAlerts();setSync('Synced');
  }catch{await load().catch(()=>{})}
}
function scheduleRealtimeRefresh(change){clearTimeout(realtimeRefreshTimer);realtimeRefreshTimer=setTimeout(()=>refreshAfterChange(change),180)}
function setSync(text,bad=false){$('syncStatus').textContent=text;$('syncStatus').className='status '+(bad?'bad':'ok')}
function tab(headers,rows,empty='No records'){const lab=h=>String(h).replace(/<[^>]*>/g,'').replace(/"/g,'&quot;').trim();return `<div class="tablewrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map((x,i)=>`<td data-label="${lab(headers[i]||'')}"${i===0?' data-primary="1"':''}>${x}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty tdEmpty">${empty}</td></tr>`}</tbody></table></div>`}
function render(){if($('salesReturnDate')&&!$('salesReturnDate').value)$('salesReturnDate').value=today;renderProducts();renderCash();renderSales();renderSalesReturns();renderPurchases();renderCollections();renderSupplierPayments();renderPayableSuppliers();$('purchaseProduct').innerHTML=products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');renderCollectionCustomers();renderOutletUI();renderSaleProductOptions();renderSpoilageProductOptions();renderOutletTransferProductOptions();$('saleProduct').onchange();$('purchaseProduct').onchange();$('spoilageProduct').onchange=()=>{renderSpoilageProductOptions();renderSpoilageLots();};renderSpoilageLots();renderOutletStockTable();renderLoansFinance();updateEntryPreviews();
const tx=(recentActivity&&recentActivity.length?recentActivity.map(x=>({date:x.date,id:x.id,type:String(x.type||'').replace('_',' ').replace(/\b\w/g,m=>m.toUpperCase()),label:x.label||x.detail||'',amount:x.amount,kind:x.source==='sales'?'sale':x.source==='purchases'?'purchase':x.source==='collections'?'collection':x.source==='supplier_payments'?'supplier_payment':'cash'})):[...cash.map(x=>({date:x.date,id:x.id,type:x.direction==='in'?'Cash In':'Cash Out',label:x.category,amount:x.amount,kind:'cash'})),...sales.map(x=>({date:x.date,id:x.id,type:'Sale',label:x.customer||'Walk-in Customer',amount:x.total,kind:'sale'})),...purchases.map(x=>({date:x.date,id:x.id,type:'Purchase',label:x.supplier||'',amount:x.total,kind:'purchase'})),...collections.map(x=>({date:x.date,id:x.id,type:'Customer Payment',label:x.customer||'',amount:x.amount,kind:'collection'})),...supplierPayments.map(x=>({date:x.date,id:x.id,type:'Supplier Payment',label:x.supplier||'',amount:x.amount,kind:'supplier_payment'}))].sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.id-a.id).slice(0,15));$('recent').innerHTML=tx.length?`<div class="activityList">${tx.map(x=>`<button class="activityRow" onclick="openTransaction('${x.kind}',${x.id})"><span class="activityIcon">${x.kind==='sale'?'↗':x.kind==='purchase'?'↙':x.kind==='collection'?'₱':x.kind==='supplier_payment'?'₱':'•'}</span><span class="activityText"><b>${esc(x.type)}</b><small>${esc(x.label||'')} · ${esc(x.date)}</small></span><strong>${money(x.amount)}</strong><span class="activityArrow">›</span></button>`).join('')}</div>`:'<div class="emptyState"><b>No business activity yet</b><span>Record a sale or purchase to begin.</span></div>';enhanceOperationalTables();}
const EXPIRY_TAG={expired:'bad',expiring_soon:'warn',active:'good',none:''};
function expiryBadge(p){
  if(p.expired_qty>0) return `<span class="tag bad" title="Expired stock awaits owner approval in Inventory → Queue">Expired ${num(p.expired_qty).toFixed(3)}</span>`;
  if(p.expiring_soon_qty>0) return `<span class="tag warn" title="Within the product's expiry alert window">Expiring ${num(p.expiring_soon_qty).toFixed(3)}</span>`;
  if(p.next_expiry_date) return `<span class="tag good">OK</span>`;
  return '<span class="muted">—</span>';
}
function nextExpiryText(p){
  if(!p.next_expiry_date) return '<span class="muted">No expiry tracked</span>';
  const d=Number(p.days_to_next_expiry);
  const suffix=Number.isFinite(d)?(d<0?`${Math.abs(d)}d overdue`:d===0?'today':`in ${d}d`):'';
  return `${esc(p.next_expiry_date)}<div class="muted">${esc(suffix)}</div>`;
}
function renderAlerts(){const a=alerts||{};const c=a.counts||{};const b=(dashboardReportCache||{}).balance_sheet||{};const ar=num(b.current_assets?.accounts_receivable),ap=num(b.liabilities?.accounts_payable);const items=[{sev:c.expired?'danger':'ok',icon:'⏱',title:'Expired stock',value:num(c.expired),desc:c.expired?'Review and approve write-offs.':'No expired lots waiting.',action:c.expired?"goPage('inventory','queue')":''},{sev:c.low_stock?'warn':'ok',icon:'▥',title:'Low stock',value:num(c.low_stock),desc:c.low_stock?'Products are at/below reorder level.':'Stock levels look normal.',action:c.low_stock?"goPage('inventory')":''},{sev:ar>0?'info':'ok',icon:'₱',title:'Customer receivables',value:money(ar),desc:ar>0?'Outstanding customer invoices.':'No customer balances due.',action:ar>0?"goFinanceTab('receivables')":''},{sev:ap>0?'info':'ok',icon:'₱',title:'Supplier payables',value:money(ap),desc:ap>0?'Outstanding supplier invoices.':'No supplier balances due.',action:ap>0?"goFinanceTab('payables')":''}];$('alertPanel').innerHTML=`<div class="attentionGrid">${items.map(i=>{const inner=`<span class="attentionIcon">${i.icon}</span><span><b>${i.title}</b><strong>${i.value}</strong><small>${i.desc}</small></span>${i.action?'<em>Review →</em>':'<em>Clear ✓</em>'}`;return i.action?`<button type="button" class="attentionItem ${i.sev}" onclick="${i.action}">${inner}</button>`:`<div class="attentionItem ${i.sev}" aria-label="${esc(i.title)}: clear">${inner}</div>`}).join('')}</div>`;}
function renderDashboard(){const r=dashboardReportCache||{};const b=r.balance_sheet||{};const is=r.income_statement||{};const drift=Math.abs(num(b.balance_check));const balanced=drift<0.01;const badge=$('booksBadge');if(badge){badge.className='booksBadge '+(balanced?'good':'bad');badge.textContent=balanced?'Books Balanced ✓':`Books need review · ${money(drift)}`};const health=$('dashboardHealth');if(health)health.innerHTML=`<div class="healthItem ${balanced?'good':'bad'}"><span class="healthDot"></span><b>${balanced?'Accounting Health: Balanced':'Accounting Health: Review needed'}</b><span>${balanced?'Balance Sheet difference '+money(drift):'Difference '+money(drift)}</span></div>`;renderKpis();const cashNow=num(b.current_assets?.cash),inv=num(b.current_assets?.inventory),ar=num(b.current_assets?.accounts_receivable),ap=num(b.liabilities?.accounts_payable);const card=(title,value,desc,action)=>`<button type="button" class="card reportCard modernReportCard" onclick="${action}"><div class="muted">${title}</div><div class="final-value">${value}</div><div class="dashboardExplain">${desc}</div><span class="cardLink">Open details →</span></button>`;$('reportEntryCards').innerHTML=[card('Profitability',money(num(is.net_income)),'All recorded dates · net result after revenue, COGS, operating expenses and spoilage.',"openReport('income-statement','dashboard')"),card('Working Capital',money(ar+inv-ap),`All-time position · AR ${money(ar)} + Inventory ${money(inv)} − AP ${money(ap)}.`,"openReport('balance-sheet','dashboard')"),card('Cash Position',money(cashNow),'All-time ending cash reconciled through the Cash Flow statement.',"openReport('cash-flow','dashboard')")].join('');renderAlerts();}

/* ---------------- Dashboard analytics -----------------------------------
   All figures come from GET /api/analytics/series, which reuses the same
   reportSnapshot() as the Reports page. No client-side accounting math. */
const ANALYTICS_RANGES=[['7D',7,'day'],['30D',30,'day'],['90D',90,'week'],['1Y',365,'month']];
let analyticsRangeDays=30, analyticsData=null, pnlChart=null, analyticsLoading=false;
queueMicrotask(()=>{renderRangeTabs();renderKpis()});
function shiftDaysClient(dateStr,days){const d=new Date(dateStr+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function renderRangeTabs(){const el=$('analyticsRange');if(!el)return;el.innerHTML=ANALYTICS_RANGES.map(([lbl,days])=>`<button class="${days===analyticsRangeDays?'active':''}" onclick="setAnalyticsRange(${days})">${lbl}</button>`).join('')}
function setAnalyticsRange(days){analyticsRangeDays=days;renderRangeTabs();loadAnalytics(true)}
function deltaTag(cur,prev,goodUp=true){
  if(!isFinite(prev)||prev===0) return `<span class="delta">vs prev \u2014</span>`;
  const pct=((cur-prev)/Math.abs(prev))*100; const up=pct>=0;
  const cls=up===goodUp?'up':'down';
  return `<span class="delta ${cls}">${up?'\u2191':'\u2193'} ${Math.abs(pct).toFixed(1)}% vs prev</span>`;
}
function renderKpis(){const el=$('kpiStrip');if(!el)return;const b=(dashboardReportCache||{}).balance_sheet||{};const todaySales=dashboardReportCache?.today_sales!==undefined?num(dashboardReportCache.today_sales):sales.filter(x=>String(x.date)===today).reduce((a,x)=>a+num(x.total),0);const ar=num(b.current_assets?.accounts_receivable),ap=num(b.liabilities?.accounts_payable),inv=num(b.current_assets?.inventory),cashNow=num(b.current_assets?.cash),low=num((alerts||{}).counts?.low_stock);const stat=(label,value,foot,action,cls='')=>`<button type="button" class="stat ${cls}" onclick="${action}"><div class="statLabel">${label}</div><div class="statValue">${value}</div><div class="statFoot">${foot}<span class="statArrow">→</span></div></button>`;el.innerHTML=[stat("Today's Sales",money(todaySales),'Open sales history',"goPage('sales');salesTab('history')"),stat('Cash Available',money(cashNow),'All-time ending cash',"openReport('cash-flow','dashboard')"),stat('Receivables Due',money(ar),'Customer balances',"goFinanceTab('receivables')",ar>0?'needs':''),stat('Payables Due',money(ap),'Supplier balances',"goFinanceTab('payables')",ap>0?'needs':''),stat('Inventory Value',money(inv),'All-time recorded cost',"openReport('inventory','dashboard')"),stat('Low Stock',String(low),'Products to review',"goPage('inventory')",low>0?'warn':'')].join('');}
async function loadAnalytics(force=false){
  if(!token()||analyticsLoading) return;
  if(analyticsData&&!force&&analyticsData.days===analyticsRangeDays) return;
  analyticsLoading=true; renderRangeTabs();
  const to=today, from=shiftDaysClient(to,-(analyticsRangeDays-1));
  const bucket=(ANALYTICS_RANGES.find(x=>x[1]===analyticsRangeDays)||[])[2]||'day';
  try{
    const d=await api(`/analytics/series?from=${from}&to=${to}&bucket=${bucket}`);
    analyticsData={...d,days:analyticsRangeDays};
    renderKpis(); drawPnlChart();
    $('analyticsNote').textContent=`${d.series.length} ${d.bucket} buckets \u2022 ${d.from} to ${d.to} \u2022 compared with ${d.previous.from} to ${d.previous.to}.`;
  }catch(e){
    $('analyticsNote').textContent='Analytics unavailable: '+e.message;
  }finally{analyticsLoading=false}
}
function bucketLabel(row,bucket){
  if(bucket==='month') return row.label;
  const d=new Date(row.from+'T00:00:00Z');
  return d.toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});
}
function drawPnlChart(){
  const cv=$('pnlChart'); if(!cv||!analyticsData||typeof Chart==='undefined') return;
  const s=analyticsData.series||[];
  const labels=s.map(x=>bucketLabel(x,analyticsData.bucket));
  const ds=(label,key,color,type='bar')=>({type,label,data:s.map(x=>num(x[key])),backgroundColor:color,borderColor:color,borderWidth:type==='line'?2:0,borderRadius:4,tension:.32,pointRadius:s.length>30?0:3,fill:false,order:type==='line'?0:1});
  const cfg={data:{labels,datasets:[ds('Revenue','revenue','#2f7d5b'),ds('Expenses','expenses','#b3261e'),ds('Net Profit','net_profit','#1f4f8b','line')]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.parsed.y)}`}}},
      scales:{x:{grid:{display:false},ticks:{maxRotation:0,autoSkipPadding:14}},y:{beginAtZero:true,suggestedMax:Math.max(100,...s.flatMap(x=>[num(x.revenue),num(x.expenses),num(x.net_profit)])),grid:{color:'#eef2ee'},ticks:{maxTicksLimit:6,callback:v=>compactMoney(v)}}}}};
  if(pnlChart){pnlChart.data=cfg.data;pnlChart.options=cfg.options;pnlChart.update();return}
  pnlChart=new Chart(cv.getContext('2d'),{type:'bar',...cfg});
}
/* Responsive tables: mirror each column header onto its cells so the mobile
   card layout (td::before) stays in sync with any table, including the
   hand-built ones. Presentation only — no data is changed. */
function decorateTables(root=document){
  root.querySelectorAll('.tablewrap table').forEach(t=>{
    const hs=[...t.querySelectorAll('thead th')].map(th=>th.textContent.replace(/\s+/g,' ').trim());
    t.querySelectorAll('tbody tr').forEach(tr=>{
      [...tr.children].forEach((td,i)=>{
        if(td.hasAttribute('colspan')){td.classList.add('tdEmpty');return}
        if(hs[i]!==undefined&&hs[i]!=='')td.setAttribute('data-label',hs[i]);
        if(i===0&&hs[i])td.setAttribute('data-primary','1');
      });
    });
  });
}
let decorateTimer=null;
new MutationObserver(()=>{clearTimeout(decorateTimer);decorateTimer=setTimeout(()=>enhanceOperationalTables(),60)})
  .observe(document.documentElement,{childList:true,subtree:true});
function compactMoney(v){const n=Math.abs(num(v));if(n>=1e6)return (v/1e6).toFixed(1)+'M';if(n>=1e3)return (v/1e3).toFixed(0)+'k';return String(Math.round(v))}

let editingProductId=null;
const ICON_EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const ICON_DELETE='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
const ICON_SAVE='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_CANCEL='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
function rowInput(id,field,value,type='text'){return `<input class="rowInput" id="ed_${field}_${id}" type="${type}" ${type==='number'?'step="0.001" min="0"':''} value="${esc(String(value??''))}">`}
function productRow(p){
  const editing=editingProductId===p.id;
  const lotBtn=`<button class="iconBtn" title="Show lots / batches" aria-label="Show lots" onclick="toggleLots(${p.id})">${expandedLots.has(p.id)?'▾':'▸'} Lots</button>`;
  const actions=editing
    ? `<div class="rowActs"><button class="iconBtn save" title="Save changes" aria-label="Save changes" onclick="saveProductRow(${p.id})">${ICON_SAVE}</button><button class="iconBtn" title="Cancel" aria-label="Cancel" onclick="cancelProductRow()">${ICON_CANCEL}</button></div>`
    : `<div class="rowActs">${lotBtn}<button class="iconBtn" title="Edit product" aria-label="Edit product" onclick="startProductRow(${p.id})">${ICON_EDIT}</button><details class="rowMenu"><summary class="iconBtn" title="More actions">•••</summary><div class="rowMenuPop"><button onclick="archiveProductRow(${p.id},${p.is_archived?0:1})">${p.is_archived?'Restore product':'Archive product'}</button><button class="dangerText" onclick="deleteProductRow(${p.id})">Delete product</button></div></details></div>`;
  const stockCell=`${num(p.stock_qty).toFixed(3)}${p.low_stock?'<div><span class="tag warn">Low stock</span></div>':''}${p.expired_qty>0?`<div class="muted">sellable ${num(p.sellable_qty).toFixed(3)}</div>`:''}`;
  if(!editing) return [
    `${esc(p.name)}${p.is_archived?' <span class="tag">Archived</span>':''}`,
    esc(p.sku),esc(p.category),esc(p.source_type),esc(p.unit),
    money(p.unit_cost),money(p.selling_price),
    stockCell,num(p.reorder_level).toFixed(3),
    num(p.shelf_life_days).toFixed(0),num(p.expiry_alert_days).toFixed(0),
    nextExpiryText(p),expiryBadge(p),actions
  ];
  return [
    rowInput(p.id,'name',p.name),
    rowInput(p.id,'sku',p.sku),
    rowInput(p.id,'category',p.category),
    `<select class="rowInput" id="ed_source_${p.id}">${['Farm Production','Purchased','Other'].map(o=>`<option ${o===p.source_type?'selected':''}>${o}</option>`).join('')}</select>`,
    rowInput(p.id,'unit',p.unit),
    rowInput(p.id,'avgcost',money2s(p.unit_cost),'number'),
    rowInput(p.id,'price',num(p.selling_price),'number'),
    // Editing the stock quantity is the trigger for the automatic lot / batch:
    // an increase books a stock-in adjustment and opens a new lot dated today,
    // reusing this product's existing lot code, with the expiry date below.
    `${rowInput(p.id,'stock',num(p.stock_qty).toFixed(3),'number')}
      <div class="muted" style="margin-top:4px;font-size:.72rem">New lot expiry (if stock increases)</div>
      <input class="rowInput" id="ed_lotexp_${p.id}" type="date" value="${esc(suggestedLotExpiry(p))}">
      <div class="muted" style="margin-top:2px;font-size:.72rem">Lot code: ${esc(latestLotCode(p)||'auto')}</div>`,
    rowInput(p.id,'reorder',num(p.reorder_level),'number'),
    rowInput(p.id,'shelf',num(p.shelf_life_days),'number'),
    rowInput(p.id,'alert',num(p.expiry_alert_days),'number'),
    `<select class="rowInput" id="ed_hasexp_${p.id}"><option value="1" ${p.has_expiration?'selected':''}>Expiry tracked</option><option value="0" ${p.has_expiration?'':'selected'}>Not tracked</option></select>`,
    `<select class="rowInput" id="ed_perish_${p.id}"><option value="1" ${p.is_perishable?'selected':''}>Perishable</option><option value="0" ${p.is_perishable?'':'selected'}>Non-perishable</option></select>`,
    actions
  ];
}
function lotDrawer(p){
  const rows=(p.lots||[]);
  const body=rows.length?rows.map(l=>`<div class="treeRow subrow"><span><b>${esc(l.lot_code||'Lot #'+l.id)}</b> • received ${esc(l.received_date)} • expiry <input class="rowInput" style="max-width:150px" type="date" id="lot_exp_${l.id}" value="${esc(l.expiry_date||'')}"> • ${num(l.remaining_qty).toFixed(3)} ${esc(p.unit||'unit')} left • ${money(l.remaining_value)} <span class="tag ${EXPIRY_TAG[l.expiry_status]||''}">${esc(l.expiry_status_label)}</span></span><span class="rowActs"><button class="iconBtn save" title="Save lot" onclick="saveLot(${l.id})">${ICON_SAVE}</button>${l.needs_spoilage_action?`<button class="secondary small" title="Expired — pending queue review" onclick="goPage('inventory','queue')">Review in Queue</button>`:''}</span></div>`).join(''):'<div class="empty">No open lots. Received stock without lot tracking is shown as untracked quantity.</div>';
  const untracked=num(p.untracked_qty)>0?`<div class="muted" style="margin-top:6px">Untracked legacy stock: ${num(p.untracked_qty).toFixed(3)} ${esc(p.unit||'unit')} (recorded before lot tracking; always sellable).</div>`:'';
  return `<tr><td colspan="14"><div class="reportSubDetail"><b>Lots / batches — ${esc(p.name)}</b>${body}${untracked}</div></td></tr>`;
}
/* ---------------------------------------------------------------------------
   DYNAMIC INVENTORY SEARCH (read-only)
   Pure client-side visibility filtering over the SAME authoritative `products`
   dataset the Inventory page and the Snapshot already render. It performs no
   fetch, no POST/PUT/PATCH/DELETE, no database write, no accounting effect and
   no inventory mutation - it only decides which already-loaded rows are shown.
--------------------------------------------------------------------------- */
let inventoryQuery='';
let snapshotQuery='';
function searchNeedle(v){return String(v==null?'':v).trim().toLowerCase()}
function productMatchesQuery(p,q){
  if(!q)return true;
  // Every identifying field the product schema actually carries. (There is no
  // separate barcode/brand column in this schema: SKU doubles as product code.)
  const hay=[p.name,p.sku,p.category,p.source_type,p.unit,p.id,p.notes]
    .map(v=>String(v==null?'':v).toLowerCase()).join(' \u0001 ');
  return hay.includes(q);
}
function onInventorySearch(value){
  inventoryQuery=searchNeedle(value);
  renderProducts();
}
function onSnapshotSearch(value){
  snapshotQuery=searchNeedle(value);
  renderStocktakeCount();
}
function renderProducts(){
  const headers=['Product','SKU','Category','Source','Unit','Current Avg Cost','Price','Stock','Reorder','Shelf Life (d)','Alert (d)','Next Expiry','Expiry Status','Actions'];
  const visible=products.filter(p=>productMatchesQuery(p,inventoryQuery)).filter(p=>inventoryStatusMode==='all'||(inventoryStatusMode==='archived'?!!p.is_archived:!p.is_archived));
  const countEl=$('invSearchCount');
  if(countEl){const scope=inventoryStatusMode==='all'?'all':inventoryStatusMode;countEl.textContent=`${visible.length} ${scope} product(s)${inventoryQuery?` match "${inventoryQuery}"`:''}`;}
  const body=visible.map(p=>{
    const cells=productRow(p).map(x=>`<td>${x}</td>`).join('');
    return `<tr class="${p.expired_qty>0?'bad':''}">${cells}</tr>`+(expandedLots.has(p.id)?lotDrawer(p):'');
  }).join('');
  const emptyText=inventoryQuery?'No products found.':'No products';
  $('productTable').innerHTML=`<div class="tablewrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${headers.length}" class="empty">${emptyText}</td></tr>`}</tbody></table></div>`;
}

function toggleLots(id){expandedLots.has(id)?expandedLots.delete(id):expandedLots.add(id);renderProducts()}
function toggleArchived(){showArchived=!showArchived;const b=$('archToggleBtn');if(b)b.textContent=showArchived?'Hide Archived':'Show Archived';load()}
async function saveLot(lotId){
  try{await api('/inventory/lots/'+lotId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiry_date:$('lot_exp_'+lotId).value})});showToast('Lot expiry updated.');await load();await applyReportPeriod();}
  catch(e){showToast(e.message,true)}
}
let spoilageQueue=[],spoilageQueueQuery='';
function onSpoilageQueueSearch(v){spoilageQueueQuery=String(v||'').trim().toLowerCase();renderSpoilageQueue()}
async function loadSpoilageQueue(){
  try{const r=await api('/inventory/spoilage-queue?status=PENDING');spoilageQueue=r.items||[];await refreshQueueCount();renderSpoilageQueue()}
  catch(e){/* queue is informational only */}
}
function renderSpoilageQueue(){
  const el=$('spoilageQueueTable'); if(!el)return;
  const q=spoilageQueueQuery;
  const rows=spoilageQueue.filter(i=>!q||[i.product_name,i.lot_code,i.expiry_date,i.unit,String(i.id)].some(x=>String(x||'').toLowerCase().includes(q)));
  const n=Number.isFinite(pendingQueueCount)?pendingQueueCount:spoilageQueue.length;
  const sum=$('spoilQueueSummary');
  if(sum)sum.textContent=n>0?`${n} pending item${n===1?'':'s'} require review.`:'No pending spoilage items. All expired-stock items have been reviewed.';
  const body=rows.map(i=>`<tr><td>${esc(i.product_name||'')}</td><td>${esc(i.lot_code||'#'+i.lot_id)}</td><td>${esc(i.expiry_date||'')}</td><td>${num(i.quantity).toFixed(3)} ${esc(i.unit||'unit')}</td><td>${money(i.estimated_cost)}</td><td>${esc(i.notification_status||'')}</td><td><button class="danger small" onclick="approveSpoilageQueue(${i.id})">Approve &amp; Record</button> <button class="secondary small" onclick="dismissSpoilageQueue(${i.id})">Dismiss</button></td></tr>`).join('');
  const empty=q?'No queued items found.':'No pending spoilage items. All expired-stock items have been reviewed.';
  el.innerHTML=`<div class="tablewrap"><table><thead><tr><th>Product</th><th>Lot</th><th>Expired</th><th>Quantity</th><th>Estimated Cost</th><th>SMS</th><th>Action</th></tr></thead><tbody>${body||`<tr><td colspan="7" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
}
async function scanSpoilageQueue(){
  const btn=$('spoilQueueScanBtn'); if(btn)btn.disabled=true;
  try{const r=await api('/inventory/spoilage-queue/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:$('spoilageDate').value||undefined})});showToast(r.message);await loadSpoilageQueue();}
  catch(e){showToast(e.message,true)}finally{if(btn)btn.disabled=false}
}
async function approveSpoilageQueue(id){
  const item=spoilageQueue.find(x=>x.id===id); if(!item)return;
  if(!confirm(`Approve spoilage of ${num(item.quantity).toFixed(3)} ${item.unit||'unit'} of ${item.product_name}? Inventory will be reduced and a Spoilage / Wastage Expense recorded.`))return;
  try{const r=await api(`/inventory/spoilage-queue/${id}/record`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:$('spoilageDate').value||undefined})});showToast(r.message);await loadSpoilageQueue();await load();await applyReportPeriod();}
  catch(e){showToast(e.message,true)}
}
async function dismissSpoilageQueue(id){
  if(!confirm('Dismiss this request? No stock or accounting entry will be made.'))return;
  try{const r=await api(`/inventory/spoilage-queue/${id}/dismiss`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});showToast(r.message);await loadSpoilageQueue();}
  catch(e){showToast(e.message,true)}
}
function startProductRow(id){editingProductId=id;renderProducts();setTimeout(()=>$('ed_name_'+id)?.focus(),0)}
function cancelProductRow(){editingProductId=null;renderProducts()}
function money2s(v){return (Math.round(num(v)*100)/100).toFixed(2)}
/** The lot code already used by this product's newest lot (kept for new lots). */
function latestLotCode(p){
  const lots=(p.lots||[]).filter(l=>l.lot_code);
  if(!lots.length)return '';
  const newest=lots.slice().sort((a,b)=>String(a.received_date||'').localeCompare(String(b.received_date||''))||num(a.id)-num(b.id)).pop();
  return newest?.lot_code||'';
}
/** Pre-fills the new-lot expiry from the shelf life; still editable before saving. */
function suggestedLotExpiry(p){
  const shelf=num(p.shelf_life_days);
  if(!(shelf>0))return '';
  const d=new Date();d.setDate(d.getDate()+Math.round(shelf));
  return d.toISOString().slice(0,10);
}
async function saveProductRow(id){
  const v=f=>$(`ed_${f}_${id}`)?.value;
  const p=products.find(x=>x.id===id)||{};
  const today=new Date().toISOString().slice(0,10);
  const newCost=Number(v('avgcost')||0), newStock=Number(v('stock')||0);
  const oldCost=num(p.unit_cost), oldStock=num(p.stock_qty);
  const lotExpiry=v('lotexp')||'';
  const costChanged=Math.abs(newCost-oldCost)>0.005;
  const stockDelta=Math.round((newStock-oldStock)*1000)/1000;
  if(newStock<0)return showToast('Stock quantity cannot be negative.',true);
  if(lotExpiry&&lotExpiry<today&&stockDelta>0)return showToast('New lot expiry cannot be earlier than today.',true);
  try{
    await api('/products/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:v('name'),sku:v('sku'),category:v('category'),source_type:v('source'),unit:v('unit'),selling_price:Number(v('price')||0),reorder_level:Number(v('reorder')||0),shelf_life_days:Number(v('shelf')||0),expiry_alert_days:Number(v('alert')||0),has_expiration:Number(v('hasexp')||0),is_perishable:Number(v('perish')||0)})});
    const notes=[];
    // Cost first, so any new stock is added at the corrected average cost.
    if(costChanged&&oldStock>0.0001){
      const r=await api('/inventory/revalue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:id,unit_cost:newCost,date:today,reference:'Inline average cost correction'})});
      notes.push(`Average cost set to ${money(newCost)} (inventory value ${num(r.delta)>=0?'+':''}${money(r.delta)}).`);
    }else if(costChanged){
      notes.push('Average cost is derived from stock on hand; add stock first.');
    }
    if(Math.abs(stockDelta)>0.0005){
      const body={product_id:id,date:today,type:stockDelta>0?'ADJUST_IN':'ADJUST_OUT',quantity:Math.abs(stockDelta),
        unit_cost:costChanged?newCost:oldCost,reference:'Inline stock correction'};
      if(stockDelta>0){ body.batch_lot=latestLotCode(p)||''; if(lotExpiry)body.expiry_date=lotExpiry; }
      const r=await api('/inventory/adjust',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      notes.push(stockDelta>0
        ?`Stock increased by ${Math.abs(stockDelta).toFixed(3)} ${p.unit||''} — new lot ${latestLotCode(p)||'auto'} received ${today}${lotExpiry?`, expiry ${lotExpiry}`:''}.`
        :`Stock reduced by ${Math.abs(stockDelta).toFixed(3)} ${p.unit||''} (count correction #${r.id}).`);
    }
    editingProductId=null;showToast(['Product updated.',...notes].join(' '));await load();
    try{await applyReportPeriod()}catch{}
  }catch(e){showToast(e.message,true)}
}
async function deleteProductRow(id){
  const p=products.find(x=>x.id===id);
  if(!confirm(`Delete "${p?p.name:'this product'}"? Deletion is only allowed when the product has no sales, purchases, stock movements or stocktakes.`))return;
  try{await api('/products/'+id,{method:'DELETE'});editingProductId=null;showToast('Product deleted.');await load();}
  catch(e){
    showToast(e.message,true);
    if(/archive it instead/i.test(e.message)&&confirm(`${e.message}\n\nArchive "${p?p.name:'this product'}" now instead?`)) await archiveProductRow(id,1);
  }
}
async function archiveProductRow(id,archived){
  const p=products.find(x=>x.id===id);
  if(archived&&!confirm(`Archive "${p?p.name:'this product'}"? It stays in every report and keeps its history, but is hidden from new sales, purchases and imports.`))return;
  try{const r=await api(`/products/${id}/archive`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({archived})});showToast(r.message);await load();}
  catch(e){showToast(e.message,true)}
}
function renderCash(){$('cashTable').innerHTML=tab(['Date','Direction','Category','Amount','Description','Source'],cash.map(x=>[esc(x.date),x.direction==='in'?'Cash In':'Cash Out',esc(x.category),money(x.amount),esc(x.description),`<span class="tag">${esc(x.source||'manual')}</span>`]));}
/* ==========================================================================
   BULK (GROUPED) SALES & PURCHASES TABLES
   One checkout stamps every line with the same group_ref, so a bulk sale or
   purchase for one customer / supplier is shown as ONE summary line with the
   products folded inside it. Older rows recorded before group_ref existed are
   grouped by date + customer/supplier + payment status, which is exactly how
   they were entered. Nothing is re-computed: every figure is the sum of the
   stored line rows, so the tables always agree with the ledger.
--------------------------------------------------------------------------- */
function newGroupRef(prefix){return `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,6).toUpperCase()}`}
const expandedTxGroups=new Set();
function toggleTxGroup(key){expandedTxGroups.has(key)?expandedTxGroups.delete(key):expandedTxGroups.add(key);renderSales();renderPurchases();renderCollections();renderSupplierPayments()}
function groupTransactions(rows,partyField){
  const groups=[];const byKey=new Map();
  for(const r of rows){
    const party=String(r[partyField]||'').trim();
    const key=r.group_ref?`g:${r.group_ref}`:`l:${r.date}|${party.toLowerCase()}|${String(r.payment_status||'').toLowerCase()}`;
    let g=byKey.get(key);
    if(!g){g={key,date:r.date,party,payment_status:r.payment_status,ids:[],lines:[]};byKey.set(key,g);groups.push(g)}
    g.ids.push(r.id);g.lines.push(r);
  }
  return groups;
}
function groupTable(headers,groups,buildSummary,buildDetail,detailHeaders,empty){
  const lab=h=>String(h).replace(/<[^>]*>/g,'').replace(/"/g,'&quot;').trim();
  const body=groups.map(g=>{
    const open=expandedTxGroups.has(g.key);
    const cells=buildSummary(g,open).map((x,i)=>`<td data-label="${lab(headers[i]||'')}"${i===0?' data-primary="1"':''}>${x}</td>`).join('');
    const detail=open&&g.lines.length>1
      ? `<tr><td colspan="${headers.length}"><div class="reportSubDetail"><b>${g.lines.length} line(s)</b><div class="tablewrap"><table><thead><tr>${detailHeaders.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${g.lines.map(l=>`<tr>${buildDetail(l).map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></td></tr>`
      : '';
    return `<tr>${cells}</tr>${detail}`;
  }).join('');
  return `<div class="tablewrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${headers.length}" class="empty tdEmpty">${empty}</td></tr>`}</tbody></table></div>`;
}
function groupRefCell(g,open){
  if(g.lines.length===1)return `#${g.ids[0]}`;
  return `<button class="secondary small grpToggle" onclick="toggleTxGroup('${g.key}')">${open?'▾':'▸'} #${g.ids[0]}–#${g.ids[g.ids.length-1]}</button><div class="muted">${g.lines.length} products</div>`;
}
function productSummary(g){
  if(g.lines.length===1)return esc(g.lines[0].product_name||'');
  return `${esc(g.lines.map(l=>l.product_name).filter(Boolean).slice(0,3).join(', '))}${g.lines.length>3?` +${g.lines.length-3} more`:''}`;
}
function renderSales(){
  const groups=groupTransactions(sales,'customer');
  const headers=['Transaction','Date','Customer','Products','Qty','Discount','Net Sales','COGS','Gross Profit','Payment','Detail'];
  const detailHeaders=['ID','Product','Qty','Price','Discount','Net Sales','COGS','Detail'];
  $('salesTable').innerHTML=groupTable(headers,groups,(g,open)=>{
    const qty=g.lines.reduce((a,l)=>a+num(l.quantity),0);
    const disc=g.lines.reduce((a,l)=>a+num(l.discount),0);
    const net=g.lines.reduce((a,l)=>a+num(l.total),0);
    const cogs=g.lines.reduce((a,l)=>a+num(l.cost_total),0);
    return [groupRefCell(g,open),esc(g.date),esc(g.party),productSummary(g),qty.toFixed(3),money(disc),money(net),money(cogs),money(net-cogs),esc(g.payment_status),
      g.lines.length===1?`<button class="secondary small" onclick="openTransaction('sale',${g.ids[0]})">View</button>`:`<button class="secondary small" onclick="toggleTxGroup('${g.key}')">${open?'Hide':'Show'} lines</button>`];
  },l=>[l.id,esc(l.product_name),num(l.quantity).toFixed(3),money(l.price),money(l.discount),money(l.total),money(l.cost_total),`<button class="secondary small" onclick="openTransaction('sale',${l.id})">View</button>`],detailHeaders,'No records');
}
function renderPurchases(){
  const groups=groupTransactions(purchases,'supplier');
  const headers=['Transaction','Date','Supplier','Products','Qty','Total','Payment','Detail'];
  const detailHeaders=['ID','Product','Qty','Unit Cost','Total','Detail'];
  $('purchaseTable').innerHTML=groupTable(headers,groups,(g,open)=>{
    const qty=g.lines.reduce((a,l)=>a+num(l.quantity),0);
    const total=g.lines.reduce((a,l)=>a+num(l.total),0);
    return [groupRefCell(g,open),esc(g.date),esc(g.party),productSummary(g),qty.toFixed(3),money(total),esc(g.payment_status),
      g.lines.length===1?`<button class="secondary small" onclick="openTransaction('purchase',${g.ids[0]})">View</button>`:`<button class="secondary small" onclick="toggleTxGroup('${g.key}')">${open?'Hide':'Show'} lines</button>`];
  },l=>[l.id,esc(l.product_name),num(l.quantity).toFixed(3),money(l.unit_cost),money(l.total),`<button class="secondary small" onclick="openTransaction('purchase',${l.id})">View</button>`],detailHeaders,'No records');
}
/* ==========================================================================
   COLLECTIONS / AR
   The invoice picker is driven purely by stored data: an invoice is "open"
   only while sale.total minus every non-voided collection linked to it is
   still positive, so a fully paid invoice disappears by itself. Customers
   with nothing outstanding never appear in the customer dropdown.
   One payment can settle several invoices; every line it posts carries the
   same group_ref, so the table shows it as ONE collection line - exactly how
   grouped sales and purchases behave.
--------------------------------------------------------------------------- */
const colKey=n=>String(n||'').trim().toLowerCase();
let colSelection=new Map();   // sale_id -> amount typed by the owner
function collectionPaidMap(){const m=new Map();for(const c of collections){if(!c.sale_id)continue;m.set(c.sale_id,(m.get(c.sale_id)||0)+num(c.amount))}return m}
function openInvoices(){
  // Use the authoritative AR schedule so pagination of Sales/Collections never
  // hides an older unpaid invoice from the collection workflow.
  const authoritative=operationalReceivables?.sales;
  if(Array.isArray(authoritative)&&authoritative.length){
    return authoritative.map(s=>({
      ...s,
      total:num(s.original??s.total),
      paid_amount:num(s.collected),
      balance:num(s.balance),
      product_name:s.product_name||''
    })).filter(x=>x.balance>0.005).sort((a,b)=>colKey(a.customer).localeCompare(colKey(b.customer))||String(a.date).localeCompare(String(b.date))||a.id-b.id);
  }
  const paid=collectionPaidMap();
  return sales.filter(s=>String(s.payment_status).toLowerCase()!=='cash').map(s=>{const p=paid.get(s.id)||0,bal=Math.round((num(s.total)-p)*100)/100;return {...s,paid_amount:p,balance:bal}}).filter(x=>x.balance>0.005).sort((a,b)=>colKey(a.customer).localeCompare(colKey(b.customer))||String(a.date).localeCompare(String(b.date))||a.id-b.id);
}
function openCustomers(){
  const m=new Map();
  for(const inv of openInvoices()){
    const k=colKey(inv.customer)||'(no name)';
    const e=m.get(k)||{name:String(inv.customer||'').trim()||'(no name)',balance:0,count:0};
    e.balance+=inv.balance;e.count++;m.set(k,e);
  }
  return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function renderCollectionCustomers(){
  const sel=$('collectionCustomer');if(!sel)return;
  const list=openCustomers(), current=sel.value;
  sel.innerHTML=list.length
    ? '<option value="">— Select customer —</option>'+list.map(c=>`<option value="${esc(colKey(c.name))}">${esc(c.name)} — Balance ${money(c.balance)} (${c.count} invoice${c.count>1?'s':''})</option>`).join('')
    : '<option value="">No customer with an outstanding balance</option>';
  sel.value=list.some(c=>colKey(c.name)===current)?current:'';
  sel.disabled=!list.length;
  renderCollectionPicker();
}
function onCollectionCustomer(){colSelection=new Map();renderCollectionPicker()}
function selectedCustomerInvoices(){
  const k=$('collectionCustomer')?$('collectionCustomer').value:'';
  const inv=openInvoices();
  return k?inv.filter(x=>colKey(x.customer)===k):inv;
}
function toggleColInvoice(id){
  const inv=openInvoices().find(x=>x.id===id);if(!inv)return;
  colSelection.has(id)?colSelection.delete(id):colSelection.set(id,inv.balance.toFixed(2));
  renderCollectionPicker();
}
function setColAmount(id,v){colSelection.set(id,v);updateCollectionSummary()}
function collectionLines(){
  const out=[];
  for(const inv of selectedCustomerInvoices()){
    if(!colSelection.has(inv.id))continue;
    out.push({sale_id:inv.id,customer:inv.customer,amount:num(colSelection.get(inv.id)),balance:inv.balance});
  }
  return out;
}
function updateCollectionSummary(){
  const unalloc=$('collectionUnallocOn')&&$('collectionUnallocOn').checked;
  const lines=collectionLines();
  const total=unalloc?num($('collectionAmount').value):lines.reduce((a,l)=>a+l.amount,0);
  const label=unalloc?`Unallocated collection — ${money(total)}`
    :(lines.length?`Selected: ${lines.length} invoice${lines.length>1?'s':''} — ${money(total)}`:'Select one or more invoices to collect.');
  $('collectionSummary').textContent=label;
}
function renderCollectionPicker(){
  const box=$('collectionPicker');if(!box)return;
  const unalloc=$('collectionUnallocOn')&&$('collectionUnallocOn').checked;
  $('collectionAmount').disabled=!unalloc;
  const k=$('collectionCustomer')?$('collectionCustomer').value:'';
  const rows=selectedCustomerInvoices();
  if(unalloc){box.innerHTML='<div class="notice">Unallocated collection: the payment reduces Accounts Receivable without linking to a specific invoice.</div>';updateCollectionSummary();return}
  if(!openCustomers().length){box.innerHTML='<div class="notice">No outstanding credit sales — every customer is fully paid, so there is nothing to collect.</div>';updateCollectionSummary();return}
  if(!k){box.innerHTML='<div class="notice">Choose a customer above to see all of their unpaid credit sales / invoices.</div>';updateCollectionSummary();return}
  if(!rows.length){box.innerHTML='<div class="notice">This customer is fully paid — no open invoices remain.</div>';updateCollectionSummary();return}
  const body=rows.map(inv=>{
    const on=colSelection.has(inv.id);
    return `<tr>
      <td data-label="Pay" data-primary="1"><label class="chkRow"><input type="checkbox" ${on?'checked':''} onchange="toggleColInvoice(${inv.id})"><span>Sale #${inv.id}</span></label></td>
      <td data-label="Date">${esc(inv.date)}</td>
      <td data-label="Product">${esc(inv.product_name||'')}</td>
      <td data-label="Invoice Total">${money(inv.total)}</td>
      <td data-label="Paid">${money(inv.paid_amount)}</td>
      <td data-label="Balance"><b>${money(inv.balance)}</b></td>
      <td data-label="Amount to collect">${on?`<input type="number" min="0.01" step=".01" max="${inv.balance.toFixed(2)}" value="${esc(colSelection.get(inv.id))}" oninput="setColAmount(${inv.id},this.value)" style="max-width:130px">`:'<span class="muted">—</span>'}</td>
    </tr>`;
  }).join('');
  box.innerHTML=`<div class="tablewrap"><table><thead><tr><th>Credit Sale / Invoice</th><th>Date</th><th>Product</th><th>Invoice Total</th><th>Paid</th><th>Balance</th><th>Amount to collect</th></tr></thead><tbody>${body}</tbody></table></div>`;
  updateCollectionSummary();
}
function groupCollections(){
  const groups=[];const byKey=new Map();
  for(const c of collections){
    const party=String(c.customer||'').trim();
    const key=c.group_ref?`cg:${c.group_ref}`:`cl:${c.date}|${colKey(party)}|${colKey(c.reference)}`;
    let g=byKey.get(key);
    if(!g){g={key,date:c.date,party,reference:c.reference,ids:[],lines:[]};byKey.set(key,g);groups.push(g)}
    g.ids.push(c.id);g.lines.push(c);
  }
  return groups;
}
function renderCollections(){
  const groups=groupCollections();
  const headers=['Transaction','Date','Customer','Invoices Paid','Amount','Reference','Detail'];
  const detailHeaders=['ID','Date','Amount','Invoice','Reference','Detail'];
  const colGroupCell=(g,open)=>{
    if(g.lines.length===1)return `#${g.ids[0]}`;
    const ids=[...g.ids].sort((a,b)=>a-b);
    return `<button class="secondary small grpToggle" onclick="toggleTxGroup('${g.key}')">${open?'▾':'▸'} #${ids[0]}–#${ids[ids.length-1]}</button><div class="muted">${g.lines.length} invoices</div>`;
  };
  $('collectionTable').innerHTML=groupTable(headers,groups,(g,open)=>{
    const amount=g.lines.reduce((a,l)=>a+num(l.amount),0);
    const links=g.lines.map(l=>l.sale_id?`Sale #${l.sale_id}`:'Unallocated');
    const summary=links.length>3?`${links.slice(0,3).join(', ')} +${links.length-3} more`:links.join(', ');
    return [colGroupCell(g,open),esc(g.date),esc(g.party),esc(summary),money(amount),esc(g.reference),
      g.lines.length===1?`<button class="secondary small" onclick="openTransaction('collection',${g.ids[0]})">View</button>`:`<button class="secondary small" onclick="toggleTxGroup('${g.key}')">${open?'Hide':'Show'} lines</button>`];
  },l=>[l.id,esc(l.date),money(l.amount),l.sale_id?`Sale #${l.sale_id}`:'Unallocated',esc(l.reference),`<button class="secondary small" onclick="openTransaction('collection',${l.id})">View</button>`],detailHeaders,'No records');
}
const payKey=n=>String(n||'').trim().toLowerCase();
let payableSelection=new Map();
function supplierPaymentsForPurchaseMap(){const m=new Map();for(const p of supplierPayments){if(!p.purchase_id)continue;m.set(Number(p.purchase_id),(m.get(Number(p.purchase_id))||0)+num(p.amount))}return m}
function openPayableInvoices(){
  const selectedDate=$('payableDate')?.value||today;
  const report=(payableOptionsDate===selectedDate&&payableOptions&&Array.isArray(payableOptions.purchases))?payableOptions:null;
  if(report){return report.purchases.filter(x=>num(x.balance)>0.005).map(x=>({...x,paid_amount:num(x.paid),balance:num(x.balance)}));}
  const explicit=supplierPaymentsForPurchaseMap();
  const rows=purchases.filter(p=>String(p.payment_status||'').toLowerCase()!=='cash').map(p=>({...p,paid_amount:explicit.get(Number(p.id))||0,balance:Math.round((num(p.total)-(explicit.get(Number(p.id))||0))*100)/100}));
  const allTime=(dashboardReportCache&&dashboardReportCache.payables)||null;
  if(allTime&&Array.isArray(allTime.purchases)){
    const byId=new Map(allTime.purchases.map(p=>[Number(p.id),p]));
    return rows.map(r=>byId.has(Number(r.id))?({...r,paid_amount:num(byId.get(Number(r.id)).paid),balance:num(byId.get(Number(r.id)).balance)}):r).filter(x=>x.balance>0.005);
  }
  return rows.filter(x=>x.balance>0.005);
}
function openSuppliers(){
  const m=new Map();
  for(const inv of openPayableInvoices()){
    const k=payKey(inv.supplier)||'(no name)';
    const e=m.get(k)||{name:String(inv.supplier||'').trim()||'(no name)',balance:0,count:0}; e.balance+=num(inv.balance);e.count++;m.set(k,e);
  }
  return [...m.values()].filter(x=>x.balance>0.005).sort((a,b)=>a.name.localeCompare(b.name));
}
function renderPayableSuppliers(){const sel=$('payableSupplier');if(!sel)return;const list=openSuppliers(),current=sel.value;sel.innerHTML=list.length?'<option value="">— Select supplier —</option>'+list.map(x=>`<option value="${esc(payKey(x.name))}">${esc(x.name)} — Owed ${money(x.balance)} (${x.count} invoice${x.count>1?'s':''})</option>`).join(''):'<option value="">No payables - all suppliers are fully paid</option>';sel.value=list.some(x=>payKey(x.name)===current)?current:'';sel.disabled=!list.length;renderPayablePicker()}
function onPayableSupplier(){payableSelection=new Map();renderPayablePicker()}
function selectedPayableInvoices(){const k=$('payableSupplier')?.value||'';return k?openPayableInvoices().filter(x=>payKey(x.supplier)===k):openPayableInvoices()}
function togglePayableInvoice(id){const inv=openPayableInvoices().find(x=>Number(x.id)===Number(id));if(!inv)return;payableSelection.has(inv.id)?payableSelection.delete(inv.id):payableSelection.set(inv.id,inv.balance.toFixed(2));renderPayablePicker()}
function setPayableAmount(id,v){const inv=openPayableInvoices().find(x=>Number(x.id)===Number(id));if(inv)payableSelection.set(id,v);updatePayableSummary()}
function payableLines(){const out=[];for(const inv of selectedPayableInvoices()){if(!payableSelection.has(inv.id))continue;out.push({purchase_id:inv.id,supplier:inv.supplier,amount:num(payableSelection.get(inv.id)),balance:inv.balance})}return out}
function updatePayableSummary(){const unalloc=$('payableUnallocOn')?.checked;const lines=payableLines();const total=unalloc?num($('payableAmount').value):lines.reduce((a,l)=>a+l.amount,0);$('payableSummary').textContent=unalloc?`Unallocated payment - ${money(total)}`:(lines.length?`Selected: ${lines.length} invoices — ${money(total)}`:'Select one or more invoices to pay.');}
function renderPayablePicker(){const box=$('payablePicker');if(!box)return;const unalloc=$('payableUnallocOn').checked;$('payableAmount').disabled=!unalloc;const k=$('payableSupplier').value;const rows=selectedPayableInvoices();if(unalloc){box.innerHTML='<div class="notice">Unallocated payment: the payment reduces the selected supplier balance without linking to a specific purchase invoice.</div>';updatePayableSummary();return}if(!openSuppliers().length){box.innerHTML='<div class="notice">No outstanding supplier payables - every credit purchase is fully paid.</div>';updatePayableSummary();return}if(!k){box.innerHTML='<div class="notice">Choose a supplier above to see all of their unpaid credit purchase invoices.</div>';updatePayableSummary();return}if(!rows.length){box.innerHTML='<div class="notice">This supplier is fully paid - no open purchase invoices remain.</div>';updatePayableSummary();return}const body=rows.map(inv=>{const on=payableSelection.has(inv.id);return `<tr><td data-label="Pay" data-primary="1"><label class="chkRow"><input type="checkbox" ${on?'checked':''} onchange="togglePayableInvoice(${inv.id})"><span>Purchase #${inv.id}</span></label></td><td data-label="Date">${esc(inv.date)}</td><td data-label="Product">${esc(inv.product_name||'')}</td><td data-label="Invoice Total">${money(inv.total)}</td><td data-label="Already Paid">${money(inv.paid_amount)}</td><td data-label="Balance Owed"><b>${money(inv.balance)}</b></td><td data-label="Amount to pay">${on?`<input type="number" min="0.01" step=".01" max="${inv.balance.toFixed(2)}" value="${esc(payableSelection.get(inv.id))}" oninput="setPayableAmount(${inv.id},this.value)" style="max-width:130px">`:'<span class="muted">—</span>'}</td></tr>`}).join('');box.innerHTML=`<div class="tablewrap"><table><thead><tr><th>Purchase / Invoice</th><th>Date</th><th>Product</th><th>Invoice Total</th><th>Already Paid</th><th>Balance Owed</th><th>Amount to pay</th></tr></thead><tbody>${body}</tbody></table></div>`;updatePayableSummary()}
function groupSupplierPayments(){const groups=[];const byKey=new Map();for(const p of supplierPayments){const party=String(p.supplier||'').trim();const key=p.group_ref?`pg:${p.group_ref}`:`pl:${p.date}|${payKey(party)}|${payKey(p.reference)}`;let g=byKey.get(key);if(!g){g={key,date:p.date,party,reference:p.reference,ids:[],lines:[]};byKey.set(key,g);groups.push(g)}g.ids.push(p.id);g.lines.push(p)}return groups}
function renderSupplierPayments(){const el=$('supplierPaymentTable');if(!el)return;const groups=groupSupplierPayments();const headers=['Transaction','Date','Supplier','Invoices Paid','Total','Reference','Detail'];const detailHeaders=['ID','Date','Amount','Invoice','Reference','Detail'];el.innerHTML=groupTable(headers,groups,(g,open)=>{const amount=g.lines.reduce((a,l)=>a+num(l.amount),0);const links=g.lines.map(l=>l.purchase_id?`Purchase #${l.purchase_id}`:'Unallocated');const summary=links.length>3?`${links.slice(0,3).join(', ')} +${links.length-3} more`:links.join(', ');const ids=[...g.ids].sort((a,b)=>a-b);const tx=g.lines.length===1?`#${ids[0]}`:`<button class="secondary small grpToggle" onclick="toggleTxGroup('${g.key}')">${expandedTxGroups.has(g.key)?'▾':'▸'} #${ids[0]}–#${ids[ids.length-1]}</button><div class="muted">${g.lines.length} invoices</div>`;return [tx,esc(g.date),esc(g.party),esc(summary),money(amount),esc(g.reference),g.lines.length===1?`<button class="secondary small" onclick="openTransaction('supplier_payment',${ids[0]})">View</button>`:`<button class="secondary small" onclick="toggleTxGroup('${g.key}')">${open?'Hide':'Show'} lines</button>`]},l=>[l.id,esc(l.date),money(l.amount),l.purchase_id?`Purchase #${l.purchase_id}`:'Unallocated',esc(l.reference),`<button class="secondary small" onclick="openTransaction('supplier_payment',${l.id})">View</button>`],detailHeaders,'No supplier payments recorded.')}

function perfPagerHtml(name,count){
  if(!perfHasMore[name])return `<div class="historyPager done"><span>Showing ${count} loaded record${count===1?'':'s'}.</span></div>`;
  return `<div class="historyPager"><span>Showing latest ${count} records.</span><button class="secondary small" onclick="loadMoreResource('${name}',this)">Load older records</button></div>`;
}
function appendPerfPager(containerId,name,count){const el=$(containerId);if(el)el.insertAdjacentHTML('beforeend',perfPagerHtml(name,count))}
async function loadMoreResource(name,btn){
  const cfg={cash:['/cash',()=>cash,v=>cash=v,()=>renderCash()],sales:['/sales',()=>sales,v=>sales=v,()=>renderSales()],purchases:['/purchases',()=>purchases,v=>purchases=v,()=>renderPurchases()],collections:['/collections',()=>collections,v=>collections=v,()=>renderCollections()],supplierPayments:['/supplier-payments',()=>supplierPayments,v=>supplierPayments=v,()=>renderSupplierPayments()]}[name];
  if(!cfg||!perfHasMore[name])return;const current=cfg[1]();if(btn){btn.disabled=true;btn.textContent='Loading…'}
  try{const rows=await api(perfUrl(cfg[0],current.length));const ids=new Set(current.map(x=>String(x.id)));const merged=current.concat((rows||[]).filter(x=>!ids.has(String(x.id))));cfg[2](merged);perfHasMore[name]=Array.isArray(rows)&&rows.length>=PERF_PAGE_SIZE;cfg[3]();enhanceOperationalTables();}
  catch(e){showToast(e.message,true);if(btn){btn.disabled=false;btn.textContent='Load older records'}}
}
const perfRenderCash=renderCash;renderCash=function(){perfRenderCash();appendPerfPager('cashTable','cash',cash.length)};
const perfRenderSales=renderSales;renderSales=function(){perfRenderSales();appendPerfPager('salesTable','sales',sales.length)};
const perfRenderPurchases=renderPurchases;renderPurchases=function(){perfRenderPurchases();appendPerfPager('purchaseTable','purchases',purchases.length)};
const perfRenderCollections=renderCollections;renderCollections=function(){perfRenderCollections();appendPerfPager('collectionTable','collections',collections.length)};
const perfRenderSupplierPayments=renderSupplierPayments;renderSupplierPayments=function(){perfRenderSupplierPayments();appendPerfPager('supplierPaymentTable','supplierPayments',supplierPayments.length)};

async function savePayment(){const btn=$('payableSaveBtn');const date=$('payableDate').value,reference=$('payableRef').value,unalloc=$('payableUnallocOn').checked;let lines;if(unalloc){const amount=num($('payableAmount').value);if(!$('payableSupplier').value)return showToast('Select the supplier receiving this unallocated payment.',true);if(!(amount>0))return showToast('Enter the payment amount.',true);const supplier=(openSuppliers().find(x=>payKey(x.name)===$('payableSupplier').value)||{}).name||'';lines=[{purchase_id:null,supplier,amount}]}else{lines=payableLines();if(!lines.length)return showToast('Select at least one invoice to pay.',true);const bad=lines.find(l=>!(l.amount>0)||l.amount>l.balance+0.005);if(bad)return showToast(`Amount for Purchase #${bad.purchase_id} must be greater than 0 and at most ${money(bad.balance)}.`,true)}btn.disabled=true;const groupRef=lines.length>1?newGroupRef('PAY'):null;const ok=[],failed=[];for(const l of lines){try{const body={date,supplier:l.supplier,amount:l.amount,reference,purchase_id:l.purchase_id,group_ref:groupRef};const idem=stickySubmission('supplier-payment',body);const r=await api('/supplier-payments',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idem.key},body:JSON.stringify(body)});clearStickySubmission(idem);ok.push(r.id)}catch(e){failed.push(e.message)}}btn.disabled=false;if(ok.length){showToast(`Supplier payment recorded (${ok.length} invoice line${ok.length>1?'s':''}). Accounts Payable reduced; Cash Out recorded.`);payableSelection=new Map();$('payableAmount').value='';$('payableRef').value='';$('payableUnallocOn').checked=false}if(failed.length)showToast(`${failed.length} line(s) not recorded — ${failed[0]}`,true);try{await load()}catch{}renderPayablePicker()}

async function saveCash(){const btn=$('cashSaveBtn');const old=btn.textContent;btn.disabled=true;btn.textContent='Recording…';try{const category=$('cashCat').value;const direction=cashDirectionForCategory(category);$('cashDir').value=direction;const body={date:$('cashDate').value,direction,category,amount:Number($('cashAmt').value),description:$('cashDesc').value};if(category==='Loan Principal Repayment'){body.linked_type='loan';body.linked_id=Number($('cashLoan').value);if(!body.linked_id)throw Error('Select the specific loan being repaid.')}if(category==='Sale of Fixed Asset'){body.asset_id=Number($('cashAsset').value);if(!body.asset_id)throw Error('Select the specific fixed asset being sold.')}const idem=stickySubmission('cash',body);const r=await api('/cash',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idem.key},body:JSON.stringify(body)});clearStickySubmission(idem);$('cashAmt').value='';$('cashDesc').value='';showToast(`Cash transaction #${r.id||''} saved.`);await load();loadCashLinkedOptions();renderLoansFinance()}catch(e){showToast(e.message,true)}finally{btn.disabled=false;btn.textContent=old}}
/* ==========================================================================
   POS-style carts for Sales and Purchases.
   Nothing touches the books until the owner taps Record Sale / Record Purchase;
   each cart line is then posted to the same /api/sales and /api/purchases
   endpoints as before, so costing, FEFO and accounting are unchanged.
   ========================================================================== */
let saleCart=[],purchaseCart=[];
function loadCarts(){
  try{saleCart=JSON.parse(localStorage.getItem('vege_sale_cart')||'[]')||[]}catch{saleCart=[]}
  try{purchaseCart=JSON.parse(localStorage.getItem('vege_purchase_cart')||'[]')||[]}catch{purchaseCart=[]}
  if(!Array.isArray(saleCart))saleCart=[];if(!Array.isArray(purchaseCart))purchaseCart=[];
  renderSaleCart();renderPurchaseCart();
}
function persistCarts(){try{localStorage.setItem('vege_sale_cart',JSON.stringify(saleCart));localStorage.setItem('vege_purchase_cart',JSON.stringify(purchaseCart))}catch{}const s=$('saleDraftState'),p=$('purchaseDraftState');if(s)s.textContent=saleCart.length?`Draft saved · ${saleCart.length} line${saleCart.length===1?'':'s'}`:'Draft autosave on';if(p)p.textContent=purchaseCart.length?`Draft saved · ${purchaseCart.length} line${purchaseCart.length===1?'':'s'}`:'Draft autosave on'}

/* ---------------- sales cart ---------------- */
function selectedSaleOutlet(){const id=$('saleOutlet')?.value||'';return id?outlets.find(o=>String(o.id)===String(id)):null}
function creditDiscountRate(){const o=selectedSaleOutlet();return o&&Number(o.credit_discount_eligible)===1?creditDiscountRateForOutlet(o):0}
function creditDiscountEligible(){const o=selectedSaleOutlet();return !!o&&Number(o.credit_discount_eligible)===1}
function updateCreditDiscountUI(){
  const status=String($('saleStatus')?.value||'Credit').toLowerCase();
  const credit=status==='credit';
  const qualifies=credit&&creditDiscountEligible();
  const price=Number($('salePrice')?.value||0);
  const pct=creditDiscountRate();
  const input=$('saleDiscount');
  const label=$('saleDiscountLabel');
  const outlet=selectedSaleOutlet();
  if(label)label.textContent=qualifies?`Discount / Unit (Auto ${pct.toFixed(2)}%)`:(credit?'Discount / Unit (Manual)':'Discount / Unit');
  if(input){
    input.disabled=qualifies;
    if(qualifies)input.value=(price>0?price*(pct/100):0).toFixed(4);
    else if(input.value==='')input.value='0';
  }
  const existingHint=$('saleDiscountHint');
  if(existingHint)existingHint.textContent=qualifies?`${outlet.name}: automatic ${pct.toFixed(2)}% Credit Discount${outlet.credit_discount_percent!==null&&outlet.credit_discount_percent!==''?' (outlet override)':' (global rate)'}.`:'';
}
function saleManualOrAutomaticDiscount(quantity,price){
  const status=String($('saleStatus')?.value||'Credit').toLowerCase();
  if(status==='credit'&&creditDiscountEligible()){
    const pct=creditDiscountRate();
    return Math.round(quantity*price*(pct/100)*100)/100;
  }
  return Number($('saleDiscount')?.value||0);
}
function saleLineTotals(l){const gross=num(l.quantity)*num(l.price);return {gross,discount:num(l.discount),net:gross-num(l.discount)}}
function addSaleToCart(){
  try{
    const p=products.find(x=>x.id==$('saleProduct').value);if(!p)throw Error('Select a product.');
    const date=$('saleDate').value;if(!date)throw Error('Enter the sale date.');
    const quantity=Number($('saleQty').value);if(!(quantity>0))throw Error('Quantity must be greater than zero.');
    const price=Number($('salePrice').value||p.selling_price);if(!(price>0))throw Error('Selling price must be greater than zero.');
    const discount=saleManualOrAutomaticDiscount(quantity,price);if(discount<0)throw Error('Discount cannot be negative.');
    if(discount>quantity*price+0.005)throw Error('Discount cannot exceed the gross amount of this line.');
    const outlet=$('saleOutlet')?.value||'';const outletObj=outlets.find(o=>String(o.id)===String(outlet));
    const available=saleAvailableQty(p.id,outlet);
    if(available<quantity-1e-9)throw Error(`Insufficient ${p.name} at ${outletObj?.name||'Main Farm Inventory'}. Available: ${available.toFixed(3)} ${p.unit}.`);
    const line={date,customer:$('saleCustomer').value,product_id:p.id,product_name:p.name,unit:p.unit||'',quantity,price,discount,payment_status:$('saleStatus').value,outlet_id:outlet?Number(outlet):null,outlet_name:outletObj?.name||null,submission_key:freshSubmissionKey('sale')};
    const same=saleCart.find(l=>l.product_id===line.product_id&&l.price===line.price&&l.payment_status===line.payment_status&&l.date===line.date&&Number(l.outlet_id||0)===Number(line.outlet_id||0)&&(l.customer||'')===(line.customer||''));
    if(same&&!same.error){same.quantity=num(same.quantity)+quantity;same.discount=num(same.discount)+discount;same.submission_key=freshSubmissionKey('sale');same.error=null}
    else saleCart.push(line);
    $('saleQty').value='';$('saleDiscount').value='0';updateCreditDiscountUI();
    renderSaleCart();showToast(`${p.name} added to cart.`);
  }catch(e){showToast(e.message,true)}
}
function removeSaleLine(i){saleCart.splice(i,1);renderSaleCart()}
function clearSaleCart(){if(!saleCart.length)return;saleCart=[];renderSaleCart();showToast('Sale cart cleared.')}
function renderSaleCart(){
  const body=$('saleCartBody'),totals=$('saleCartTotals'),btn=$('saleBtn'),clear=$('saleClearBtn');
  if(!body)return;
  if(!saleCart.length){
    body.innerHTML='<div class="empty muted">Cart is empty. Fill the form above and tap <b>Add to Cart</b>.</div>';
    if(totals)totals.innerHTML='<span class="muted">0 item(s) in cart</span>';
    if(btn){btn.disabled=true;btn.textContent='Record Sale'}
    if(clear)clear.disabled=true;persistCarts();return;
  }
  let gross=0,disc=0;
  const rows=saleCart.map((l,i)=>{const t=saleLineTotals(l);gross+=t.gross;disc+=t.discount;
    return `<tr><td>${esc(l.product_name)}${l.error?`<div class="posLineErr">${esc(l.error)}</div>`:''}</td><td>${num(l.quantity).toFixed(3)} ${esc(l.unit)}</td><td>${money(l.price)}</td><td>${money(l.discount)}</td><td>${money(t.net)}</td><td>${esc(l.payment_status)}</td><td>${esc(l.outlet_name||'Main Farm Inventory')}</td><td><button class="secondary" onclick="removeSaleLine(${i})">Remove</button></td></tr>`}).join('');
  body.innerHTML=`<div class="tablewrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Discount</th><th>Line Total</th><th>Payment</th><th>Stock Location</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  const net=gross-disc;
  if(totals)totals.innerHTML=`${saleCart.length} line(s) · Gross ${money(gross)} · Discount ${money(disc)} · <b>Net ${money(net)}</b>`;
  if(btn){btn.disabled=false;btn.textContent=`Record Sale • ${money(net)}`}
  if(clear)clear.disabled=false;
  persistCarts();
}
async function saveSale(){
  const btn=$('saleBtn');if(!saleCart.length)return showToast('Add at least one item to the cart first.',true);
  btn.disabled=true;btn.textContent='Recording…';
  const ok=[],failed=[];let cost=0;const fefo=[];
  // One checkout = one transaction reference, so a bulk sale to the same
  // customer shows as ONE line in the Sales table.
  const groupRef=newGroupRef('S');
  for(const line of [...saleCart]){
    try{
      const r=await api('/sales',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':line.submission_key||(line.submission_key=freshSubmissionKey('sale'))},body:JSON.stringify({date:line.date,customer:line.customer,product_id:line.product_id,quantity:num(line.quantity),price:num(line.price),discount:num(line.discount),payment_status:line.payment_status,outlet_id:line.outlet_id||null,group_ref:groupRef})});
      ok.push(r.id);cost+=num(r.cost);
      (r.lot_allocations||[]).filter(a=>a.lot_id).forEach(a=>fefo.push(`${a.lot_code||'Lot #'+a.lot_id}${a.expiry_date?' (exp '+a.expiry_date+')':''} × ${num(a.quantity).toFixed(3)}`));
      saleCart.splice(saleCart.indexOf(line),1);
    }catch(e){line.error=e.message;failed.push(`${line.product_name}: ${e.message}`)}
  }
  renderSaleCart();
  if(ok.length)showToast(`Recorded ${ok.length} sale(s) (#${ok.join(', #')}). Total COGS: ${money(cost)}${fefo.length?` • FEFO: ${fefo.slice(0,4).join(', ')}`:''}`,false,{label:'View sale',onclick:`openTransaction('sale',${ok[0]})`});
  if(failed.length)showToast(`${failed.length} line(s) not recorded — ${failed[0]}`,true);
  try{await load()}catch{}
  renderSaleCart();
}

function renderSalesReturns(){
  const sel=$('salesReturnSale'); if(sel){const current=sel.value;sel.innerHTML=sales.length?'<option value="">— Select original sale —</option>'+sales.map(x=>`<option value="${x.id}">#${x.id} • ${esc(x.date)} • ${esc(x.customer||'Walk-in')} • ${esc(x.product_name)} • ${num(x.quantity).toFixed(3)} • ${money(x.total)}</option>`).join(''):'<option value="">No active sales</option>';if(sales.some(x=>String(x.id)===current))sel.value=current}
  const box=$('salesReturnTable'); if(!box)return; if(!salesReturns.length){box.innerHTML='<div class="empty muted">No sales returns / credit notes recorded.</div>';return}
  box.innerHTML=`<div class="tablewrap"><table><thead><tr><th>ID</th><th>Date</th><th>Sale</th><th>Customer</th><th>Product</th><th>Qty</th><th>Credit Note</th><th>AR Credit</th><th>Cash Refund</th></tr></thead><tbody>${salesReturns.map(r=>`<tr><td>#${r.id}</td><td>${esc(r.date)}</td><td>#${r.sale_id}</td><td>${esc(r.customer||'')}</td><td>${esc(r.product_name||'')}</td><td>${num(r.quantity).toFixed(3)}</td><td>${money(r.amount)}</td><td>${money(r.ar_credit)}</td><td>${money(r.cash_refund)}</td></tr>`).join('')}</tbody></table></div>`;
}
async function saveSalesReturn(){const btn=$('salesReturnBtn');const body={date:$('salesReturnDate').value,sale_id:Number($('salesReturnSale').value),quantity:Number($('salesReturnQty').value),reason:$('salesReturnReason').value,reference:$('salesReturnRef').value};if(!body.date||!body.sale_id||!(body.quantity>0))return showToast('Select the original sale, return date and quantity.',true);const idem=stickySubmission('sales-return',body);btn.disabled=true;try{const r=await api('/sales-returns',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idem.key},body:JSON.stringify(body)});clearStickySubmission(idem);showToast(`Credit Note #${r.id} recorded • ${money(r.amount)}${r.cash_refund>0?` • Cash refund ${money(r.cash_refund)}`:''}`,false,{label:'View sale',onclick:`openTransaction('sale',${body.sale_id})`});$('salesReturnQty').value='';$('salesReturnReason').value='';$('salesReturnRef').value='';await load()}catch(e){showToast(e.message,true)}finally{btn.disabled=false}}

/* ---------------- purchases cart ---------------- */
function purchaseLineTotal(l){return num(l.quantity)*num(l.unit_cost)}
function addPurchaseToCart(){
  try{
    const p=products.find(x=>x.id==$('purchaseProduct').value);if(!p)throw Error('Select a product.');
    const date=$('purchaseDate').value;if(!date)throw Error('Enter the purchase date.');
    const quantity=Number($('purchaseQty').value);if(!(quantity>0))throw Error('Quantity must be greater than zero.');
    const unit_cost=Number($('purchaseCost').value||p.unit_cost);if(!(unit_cost>0))throw Error('Unit cost must be greater than zero.');
    const expiry_date=$('purchaseExpiry').value||'';
    if(expiry_date&&expiry_date<date)throw Error('Expiry date cannot be earlier than the purchase date.');
    // Lot code and expiry are never merged: each lot must stay traceable.
    purchaseCart.push({date,supplier:$('purchaseSupplier').value,product_id:p.id,product_name:p.name,unit:p.unit||'',quantity,unit_cost,batch_lot:$('purchaseLot').value,expiry_date,payment_status:$('purchaseStatus').value,submission_key:freshSubmissionKey('purchase')});
    $('purchaseQty').value='';$('purchaseExpiry').value='';$('purchaseLot').value='';
    renderPurchaseCart();showToast(`${p.name} added to cart.`);
  }catch(e){showToast(e.message,true)}
}
function removePurchaseLine(i){purchaseCart.splice(i,1);renderPurchaseCart()}
function clearPurchaseCart(){if(!purchaseCart.length)return;purchaseCart=[];renderPurchaseCart();showToast('Purchase cart cleared.')}
function renderPurchaseCart(){
  const body=$('purchaseCartBody'),totals=$('purchaseCartTotals'),btn=$('purchaseBtn'),clear=$('purchaseClearBtn');
  if(!body)return;
  if(!purchaseCart.length){
    body.innerHTML='<div class="empty muted">Cart is empty. Fill the form above and tap <b>Add to Cart</b>.</div>';
    if(totals)totals.innerHTML='<span class="muted">0 item(s) in cart</span>';
    if(btn){btn.disabled=true;btn.textContent='Record Purchase'}
    if(clear)clear.disabled=true;persistCarts();return;
  }
  let total=0;
  const rows=purchaseCart.map((l,i)=>{const t=purchaseLineTotal(l);total+=t;
    return `<tr><td>${esc(l.product_name)}${l.error?`<div class="posLineErr">${esc(l.error)}</div>`:''}</td><td>${num(l.quantity).toFixed(3)} ${esc(l.unit)}</td><td>${money(l.unit_cost)}</td><td>${esc(l.batch_lot||'—')}</td><td>${esc(l.expiry_date||'—')}</td><td>${money(t)}</td><td>${esc(l.payment_status)}</td><td><button class="secondary" onclick="removePurchaseLine(${i})">Remove</button></td></tr>`}).join('');
  body.innerHTML=`<div class="tablewrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Lot</th><th>Expiry</th><th>Line Total</th><th>Payment</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  if(totals)totals.innerHTML=`${purchaseCart.length} line(s) · <b>Total ${money(total)}</b>`;
  if(btn){btn.disabled=false;btn.textContent=`Record Purchase • ${money(total)}`}
  if(clear)clear.disabled=false;
  persistCarts();
}
async function savePurchase(){
  const btn=$('purchaseBtn');if(!purchaseCart.length)return showToast('Add at least one item to the cart first.',true);
  btn.disabled=true;btn.textContent='Recording…';
  const ok=[],failed=[];let wac=null;
  const groupRef=newGroupRef('P');
  for(const line of [...purchaseCart]){
    try{
      const r=await api('/purchases',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':line.submission_key||(line.submission_key=freshSubmissionKey('purchase'))},body:JSON.stringify({date:line.date,supplier:line.supplier,product_id:line.product_id,quantity:num(line.quantity),unit_cost:num(line.unit_cost),batch_lot:line.batch_lot,expiry_date:line.expiry_date,payment_status:line.payment_status,group_ref:groupRef})});
      ok.push(r.id);wac=r.newWeightedAverageCost;
      purchaseCart.splice(purchaseCart.indexOf(line),1);
    }catch(e){line.error=e.message;failed.push(`${line.product_name}: ${e.message}`)}
  }
  renderPurchaseCart();
  if(ok.length)showToast(`Recorded ${ok.length} purchase(s) (#${ok.join(', #')}).${wac!=null?` Latest weighted-average cost: ${money(wac)}`:''}`,false,{label:'View purchase',onclick:`openTransaction('purchase',${ok[0]})`});
  if(failed.length)showToast(`${failed.length} line(s) not recorded — ${failed[0]}`,true);
  try{await load()}catch{}
  renderPurchaseCart();
}
async function saveCollection(){
  const btn=$('collectionSaveBtn');
  const date=$('collectionDate').value, reference=$('collectionRef').value;
  const unalloc=$('collectionUnallocOn').checked;
  let lines=[];
  if(unalloc){
    const amount=Number($('collectionAmount').value);
    if(!(amount>0))return showToast('Enter the collection amount.',true);
    const name=(openCustomers().find(c=>colKey(c.name)===$('collectionCustomer').value)||{}).name||'';
    lines=[{sale_id:null,customer:name,amount}];
  }else{
    lines=collectionLines();
    if(!lines.length)return showToast('Select at least one invoice to collect.',true);
    const bad=lines.find(l=>!(l.amount>0)||l.amount>l.balance+0.005);
    if(bad)return showToast(`Amount for Sale #${bad.sale_id} must be greater than 0 and at most ${money(bad.balance)}.`,true);
  }
  btn.disabled=true;
  // One payment = one group_ref shared by every invoice line it settles, so the
  // table renders it as a single collection while the ledger keeps one balanced
  // entry per invoice (Cash debit / Accounts Receivable credit).
  const groupRef=lines.length>1?newGroupRef('COL'):null;
  const ok=[],failed=[];
  for(const l of lines){
    try{
      const body={date,customer:l.customer,amount:l.amount,reference,sale_id:l.sale_id,group_ref:groupRef};const idem=stickySubmission('collection',body);const r=await api('/collections',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idem.key},body:JSON.stringify(body)});clearStickySubmission(idem);
      ok.push(r.id);
    }catch(e){failed.push(e.message)}
  }
  btn.disabled=false;
  if(ok.length){
    const total=lines.slice(0,ok.length).reduce((a,l)=>a+l.amount,0);
    showToast(`Collection recorded (${ok.length} invoice line${ok.length>1?'s':''}, ${money(total)}). Receivables reduced.`);
    colSelection=new Map();$('collectionAmount').value='';$('collectionRef').value='';$('collectionUnallocOn').checked=false;
  }
  if(failed.length)showToast(`${failed.length} line(s) not recorded — ${failed[0]}`,true);
  try{await load()}catch{}
  renderCollectionPicker();
}
function openProduct(){$('productModalTitle').textContent='Add Product';syncExpiryFields();$('productModal').classList.add('open')}function closeModal(id){$(id).classList.remove('open')}
async function saveProduct(){try{const r=await api('/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('pName').value,sku:$('pSku').value,category:$('pCat').value,unit:$('pUnit').value,source_type:$('pSource').value,unit_cost:Number($('pCost').value||0),selling_price:Number($('pPrice').value||0),reorder_level:Number($('pReorder').value||0),is_perishable:Number($('pPerishable').value||0),has_expiration:Number($('pHasExp').value||0),shelf_life_days:Number($('pShelf').value||0),expiry_alert_days:Number($('pAlert').value||7),notes:$('pNotes').value,opening_qty:Number($('pOpen').value||0),opening_date:$('pOpenDate').value,opening_lot_code:$('pOpenLot').value,opening_expiry_date:$('pOpenExp').value})});closeModal('productModal');['pName','pSku','pCat','pCost','pPrice','pReorder','pOpen','pOpenLot','pOpenExp','pNotes'].forEach(id=>$(id).value='');showToast(`Product #${r.id} saved.`);await load()}catch(e){showToast(e.message,true)}}
$('importFile').onchange=async()=>{if(!$('importFile').files[0])return;const fd=new FormData();fd.append('file',$('importFile').files[0]);try{const r=await api('/products/import',{method:'POST',body:fd});showToast(r.message||`Imported ${r.count}`);if(r.skipped?.length)showToast(`${r.skipped.length} row(s) were skipped. Check data.`);$('importFile').value='';await load()}catch(e){showToast(e.message,true)}};
$('lotImportFile').onchange=async()=>{if(!$('lotImportFile').files[0])return;const fd=new FormData();fd.append('file',$('lotImportFile').files[0]);try{const r=await api('/inventory/lots/import',{method:'POST',body:fd});showToast(r.message||`Imported ${r.count}`);if(r.skipped?.length)showToast(`${r.skipped.length} row(s) skipped: ${r.skipped.slice(0,3).map(x=>'row '+x.row+' — '+x.reason).join(' | ')}`,true);$('lotImportFile').value='';await load();await applyReportPeriod();}catch(e){showToast(e.message,true)}};
async function renderSpoilageLots(){
  const p=products.find(x=>x.id==$('spoilageProduct')?.value); const outletId=$('spoilageOutlet')?.value||'';
  if(!p){$('spoilageLot').innerHTML='<option value="">No lot available</option>';if($('spoilageLotHint'))$('spoilageLotHint').textContent='Select an available product at this location.';return;}
  if(outletId){
    try{const r=await api(`/inventory/outlet-stock/lots?outlet_id=${encodeURIComponent(outletId)}&product_id=${p.id}&date=${encodeURIComponent($('spoilageDate')?.value||today)}`);const rows=r.rows||[];$('spoilageLot').innerHTML='<option value="">Automatic FEFO at Outlet</option>'+rows.map(l=>`<option value="${l.id}">${esc(l.batch_lot||'Outlet lot #'+l.id)} • exp ${esc(l.expiry_date||'none')} • ${num(l.remaining_qty).toFixed(3)} ${esc(p.unit)}</option>`).join('');const bal=rows.reduce((a,l)=>a+num(l.remaining_qty),0);$('spoilageLotHint').innerHTML=`<b>${esc(outlets.find(o=>String(o.id)===String(outletId))?.name||'Outlet')}</b> has <b>${bal.toFixed(3)} ${esc(p.unit)}</b> of ${esc(p.name)} available for sale/spoilage.`;}catch(e){$('spoilageLot').innerHTML='<option value="">Unable to load outlet stock</option>';$('spoilageLotHint').textContent=e.message||'Unable to load outlet stock.'}return;
  }
  const lots=(p?.lots||[]).filter(l=>num(l.remaining_qty)>0); $('spoilageLot').innerHTML='<option value="">Automatic (expired first, then FEFO)</option>'+lots.map(l=>`<option value="${l.id}">${esc(l.lot_code||'Lot #'+l.id)} • exp ${esc(l.expiry_date||'none')} • ${num(l.remaining_qty).toFixed(3)} left • ${esc(l.expiry_status_label)}</option>`).join(''); $('spoilageLotHint').innerHTML=p?(num(p.expired_qty)>0?`<b>${esc(p.name)} has ${num(p.expired_qty).toFixed(3)} ${esc(p.unit||'unit')} in expired lot(s).</b>`:'Main farm spoilage uses weighted-average cost and existing lot/FEFO rules.') : '';
}
async function recordSpoilage(){const btn=$('spoilageBtn');btn.disabled=true;try{const p=products.find(x=>x.id==$('spoilageProduct').value);if(!p)throw Error('Select a product.');const qty=Number($('spoilageQty').value);if(!(qty>0))throw Error('Spoiled quantity must be greater than zero.');const r=await api('/inventory/spoilage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:$('spoilageDate').value,product_id:p.id,lot_id:$('spoilageLot').value||null,outlet_id:$('spoilageOutlet')?.value||null,quantity:qty,reason:$('spoilageReason').value})});showToast(`Spoilage recorded. Inventory cost removed: ${money(r.total_cost)}`);$('spoilageQty').value='';await load();await applyReportPeriod();}catch(e){showToast(e.message,true)}finally{btn.disabled=false}}

function renderOutletUI(){
  const opts='<option value="">Main Farm Inventory</option>'+outlets.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('');
  ['saleOutlet','spoilageOutlet'].forEach(id=>{
    if(!$(id))return;
    const cur=$(id).value;
    $(id).innerHTML=opts;
    $(id).value=cur&&[...$(id).options].some(x=>x.value===cur)?cur:'';
  });
  if($('outletTransferOutlet')){
    const cur=$('outletTransferOutlet').value;
    $('outletTransferOutlet').innerHTML=outlets.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join('')||'<option value="">Add an outlet first</option>';
    if(cur&&[...$('outletTransferOutlet').options].some(x=>x.value===cur))$('outletTransferOutlet').value=cur;
  }
  if($('saleOutlet'))$('saleOutlet').onchange=()=>{
    const id=$('saleOutlet').value;
    const o=outlets.find(x=>String(x.id)===String(id));
    if(o&&!$('saleCustomer').value)$('saleCustomer').value=o.name;
    const current=$('saleProduct')?.value;
    renderSaleProductOptions(current);
    $('saleProduct').onchange();
    updateCreditDiscountUI();
  };
  if($('spoilageOutlet'))$('spoilageOutlet').onchange=()=>{
    const current=$('spoilageProduct')?.value;
    renderSpoilageProductOptions(current);
    renderSpoilageLots();
  };
  if($('outletTransferOutlet'))$('outletTransferOutlet').onchange=()=>renderOutletTransferProductOptions();
}

function renderOutletStockTable(){const el=$('outletStockTable');if(!el)return;const rows=outletStock.filter(x=>num(x.qty)>0.000001);el.innerHTML=rows.length?`<div class="tablewrap"><table><thead><tr><th>Outlet</th><th>Product</th><th>Stock</th><th>Inventory Value</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.outlet_name)}</td><td>${esc(x.product_name)}</td><td>${num(x.qty).toFixed(3)} ${esc(x.unit)}</td><td>${money(x.value)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No outlet/display stock has been transferred yet.</div>';renderOutletSettings();}
function renderOutletSettings(){const el=$('outletSettingsTable');if(!el)return;el.innerHTML=outlets.length?`<h3>Outlet Credit Discount Settings</h3><div class="muted" style="margin-bottom:8px">Any outlet marked eligible can use the automatic Credit Discount. Leave Override % blank to use the global .env rate.</div><div class="tablewrap"><table><thead><tr><th>Outlet</th><th>Eligible</th><th>Override %</th><th>Effective %</th><th>Action</th></tr></thead><tbody>${outlets.map(o=>{const eligible=Number(o.credit_discount_eligible)===1;const local=(o.credit_discount_percent!==null&&o.credit_discount_percent!==''&&Number.isFinite(Number(o.credit_discount_percent)))?Number(o.credit_discount_percent):null;const effective=eligible?(local===null?creditDiscountRateForOutlet(o):local):0;return `<tr><td>${esc(o.name)}</td><td><input type="checkbox" id="outletEligible_${o.id}" ${eligible?'checked':''}></td><td><input id="outletPercent_${o.id}" type="number" min="0" max="100" step="0.01" value="${local===null?'':local}" placeholder="Global" style="max-width:110px"></td><td>${eligible?effective.toFixed(2)+'%':'0.00%'}</td><td><button class="secondary small" onclick="saveOutletDiscountSettings(${o.id})">Save</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">No active outlets.</div>';}
function creditDiscountRateForOutlet(o){const local=Number(o?.credit_discount_percent);if(o&&o.credit_discount_percent!==null&&o.credit_discount_percent!==''&&Number.isFinite(local))return Math.min(100,Math.max(0,local));const n=Number(salesConfig?.creditDiscountPercent);return Number.isFinite(n)?Math.min(100,Math.max(0,n)):0}
async function saveOutletDiscountSettings(id){try{const o=outlets.find(x=>Number(x.id)===Number(id));if(!o)throw Error('Outlet not found.');const eligible=!!$(`outletEligible_${id}`)?.checked;const raw=$(`outletPercent_${id}`)?.value?.trim()||'';const override=raw===''?null:Number(raw);if(override!==null&&(!Number.isFinite(override)||override<0||override>100))throw Error('Outlet discount must be between 0 and 100%.');await api(`/outlets/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:o.name,address:o.address,contact:o.contact,credit_discount_eligible:eligible,credit_discount_percent:override})});showToast(`${o.name} discount settings saved.`);await load();}catch(e){showToast(e.message,true)}}
async function createOutlet(){const btn=$('outletCreateBtn');btn.disabled=true;try{const name=$('outletNewName').value.trim();if(!name)throw Error('Enter an outlet name.');const eligible=!!$('outletCreditEligible')?.checked;const raw=$('outletCreditPercent')?.value?.trim()||'';const override=raw===''?null:Number(raw);if(override!==null&&(!Number.isFinite(override)||override<0||override>100))throw Error('Outlet discount must be between 0 and 100%.');await api('/outlets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,address:$('outletNewAddress').value,contact:$('outletNewContact').value,credit_discount_eligible:eligible,credit_discount_percent:override})});$('outletNewName').value='';$('outletNewAddress').value='';$('outletNewContact').value='';if($('outletCreditEligible'))$('outletCreditEligible').checked=true;if($('outletCreditPercent'))$('outletCreditPercent').value='';showToast('Outlet created.');closeModal('outletModal');await load();showInvTab('outlet');}catch(e){showToast(e.message,true)}finally{btn.disabled=false}}
async function transferOutletStock(){try{const outletId=Number($('outletTransferOutlet').value),productId=Number($('outletTransferProduct').value),quantity=Number($('outletTransferQty').value);if(!outletId)throw Error('Select an outlet.');if(!(quantity>0))throw Error('Enter a transfer quantity.');const r=await api('/inventory/outlet-transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:$('outletTransferDate').value,outlet_id:outletId,product_id:productId,quantity,reference:$('outletTransferRef').value})});showToast(r.message||'Stock transferred.');$('outletTransferQty').value='';$('outletTransferRef').value='';await load();showInvTab('outlet');}catch(e){showToast(e.message,true)}}

let currentStocktake=null;
async function recordStocktake(){try{const r=await api('/inventory/stocktake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:$('stockDate').value,notes:$('stockNotes').value})});$('stockResult').textContent=`Snapshot #${r.id}: ${r.items} products • System inventory value ${money(r.total_value)}`;currentStocktake=r.id;await loadStocktakeCount(r.id);showToast('Stocktake snapshot saved. Enter the counted quantities below.')}catch(e){showToast(e.message,true)}}
let stocktakeView=null;
async function loadStocktakeCount(id){try{const r=await api('/inventory/stocktake/'+id);stocktakeView={id,data:r};renderStocktakeCount();
}catch(e){showToast(e.message,true)}}
function renderStocktakeCount(){
  if(!stocktakeView)return;
  const {id,data:r}=stocktakeView;
  // Snapshot rows come straight from the authoritative stocktake payload; the
  // search only hides rows, it never recomputes quantities or values.
  const items=r.items.filter(x=>productMatchesQuery({name:x.product_name,sku:x.sku,category:x.category,source_type:x.source_type,unit:x.unit,id:x.product_id},snapshotQuery));
  const rows=items.map(x=>`<tr><td>${esc(x.product_name||('#'+x.product_id))}</td><td>${Number(x.system_qty).toFixed(3)} ${esc(x.unit||'')}</td><td><input data-stocktake-product="${x.product_id}" type="number" min="0" step=".001" value="${x.counted_qty===null?'':Number(x.counted_qty).toFixed(3)}" style="max-width:120px"></td><td>${x.variance_qty===null?'—':Number(x.variance_qty).toFixed(3)}</td><td>${x.variance_value===null?'—':money(x.variance_value)}</td></tr>`).join('');
  const emptyRow=`<tr><td colspan="5" class="empty">${snapshotQuery?'No products found.':'No products'}</td></tr>`;
  $('stocktakeCount').innerHTML=`<h4 style="margin:6px 0">Physical Count — Stocktake #${id} (${esc(r.stocktake.date)})</h4><div class="tablewrap"><table><thead><tr><th>Product</th><th>System Qty</th><th>Counted Qty</th><th>Variance</th><th>Variance Value</th></tr></thead><tbody>${rows||emptyRow}</tbody></table></div><div class="row" style="margin-top:8px"><button class="primary" onclick="submitStocktakeCount(${id})">Save Counted Quantities</button></div><div class="muted" style="margin-top:6px">${esc(r.formula)}</div>`;
}
async function submitStocktakeCount(id){try{const items=[...document.querySelectorAll('[data-stocktake-product]')].filter(i=>String(i.value).trim()!=='').map(i=>({product_id:Number(i.dataset.stocktakeProduct),counted_qty:Number(i.value)}));
  if(!items.length)return showToast('Enter at least one counted quantity.',true);
  const r=await api('/inventory/stocktake/'+id+'/count',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})});
  showToast(`Counted ${r.items.length} product(s) • Variance value ${money(r.variance_value)}`);
  await loadStocktakeCount(id);await load();
}catch(e){showToast(e.message,true)}}
function setPeriodDefaults(){const p=$('period').value;if(p==='all'){ $('fromDate').value=ALL_REPORT_FROM;$('toDate').value=ALL_REPORT_TO;return }const f=new Date($('fromDate').value+'T00:00:00');if(p==='day')$('toDate').value=$('fromDate').value;else if(p==='week'){const d=new Date(f);d.setDate(d.getDate()+6);$('toDate').value=d.toISOString().slice(0,10)}else if(p==='month')$('toDate').value=new Date(f.getFullYear(),f.getMonth()+1,0).toISOString().slice(0,10);else if(p==='year')$('toDate').value=new Date(f.getFullYear(),11,31).toISOString().slice(0,10)}
$('period').onchange=()=>{setPeriodDefaults();applyReportPeriod()};
$('spoilageDate').value=today;
$('spoilageReason').value='Spoilage / Wastage';
async function applyReportPeriod(){setPeriodDefaults();try{reportCache=await api(`/reports?from=${encodeURIComponent($('fromDate').value)}&to=${encodeURIComponent($('toDate').value)}`);renderReportCards();}catch(e){$('reportCards').innerHTML=`<div class="card bad"><b>Report error:</b> ${esc(e.message)}</div>`;showToast(e.message,true)}}
function reportDisclosure(id,label,value,summary,detailHtml){return `<div class="reportSubCard" id="sub-${id}" onclick="toggleReportSub('${id}')"><div class="reportSubHead"><div><div class="muted">${esc(label)}</div><div class="kpi" style="font-size:21px">${money(value)}</div><div class="muted">${esc(summary||'')}</div></div><div class="chev">›</div></div><div id="detail-${id}" class="reportSubDetail hidden">${detailHtml}</div><div class="reportHint">Click to view details →</div></div>`}
function profitDisclosure(id,label,value,summary,detailHtml){return `<div class="reportSubCard" id="sub-${id}" onclick="event.stopPropagation();toggleReportSub('${id}')"><div class="reportSubHead"><div><div class="muted">${esc(label)}</div><div class="normal-value">${money(value)}</div><div class="muted">${esc(summary||'')}</div></div><div class="chev">›</div></div><div id="detail-${id}" class="reportSubDetail hidden">${detailHtml}</div><div class="reportHint">Click to view details →</div></div>`}
function toggleReportMain(id){const el=$(id);if(!el)return;el.classList.toggle('hidden');const card=$(id.replace('subs-','main-'));if(card){const chev=card.querySelector('.chev');if(chev)chev.textContent=el.classList.contains('hidden')?'＋':'−';}}
function toggleReportSub(id){const d=$('detail-'+id),c=$('sub-'+id);if(!d||!c)return;d.classList.toggle('hidden');c.classList.toggle('open');}
function txRows(rows,kindMap,negative=false){return rows.length?rows.map(t=>{const kind=kindMap(t);return `<div class="treeRow subrow clickable" onclick="event.stopPropagation();openTransaction('${kind}',${Number(t.id)||0})"><span>${esc(t.type)} • ${esc(t.label)} • ${esc(t.date)}</span><strong>${negative?'-':''}${money(t.amount)}</strong></div>`}).join(''):'<div class="empty">No transactions in this category for the selected period.</div>'}
function renderReportCards(){const r=reportCache;const b=r.balance_sheet;const is=r.income_statement;const cf=r.cash_flow;
const opIn=txRows(cf.operating.inflows,t=>t.type==='Cash Sale'?'sale':t.type==='Customer Collection'?'collection':'cash');
const opOut=txRows(cf.operating.outflows,t=>t.type==='Inventory Purchase'?'purchase':t.type==='Supplier Payment'?'cash':'cash',true);
const invIn=txRows(cf.investing.inflows,()=> 'cash');const invOut=txRows(cf.investing.outflows,()=> 'cash',true);const finIn=txRows(cf.financing.inflows,()=> 'cash');const finOut=txRows(cf.financing.outflows,()=> 'cash',true);
const revenueDetail=r.reportData?'' : `<div class="tree">${sales.length?tab(['ID','Date','Customer','Product','Qty','Amount'],sales.filter(x=>x.date>=$('fromDate').value&&x.date<=$('toDate').value).map(x=>[x.id,esc(x.date),esc(x.customer),esc(x.product_name),num(x.quantity).toFixed(3),money(x.total)])):'<div class="empty">No sales in this period.</div>'}</div>`;
const salesPeriod=sales.filter(x=>String(x.date)>=$('fromDate').value&&String(x.date)<=$('toDate').value);const cashPeriod=cash.filter(x=>String(x.date)>=$('fromDate').value&&String(x.date)<=$('toDate').value);
const revenueRows=tab(['ID','Date','Customer','Product','Qty','Amount'],salesPeriod.map(x=>[x.id,esc(x.date),esc(x.customer),esc(x.product_name),num(x.quantity).toFixed(3),money(x.total)]));
const cogsRows=tab(['ID','Date','Customer','Product','Qty','COGS'],salesPeriod.map(x=>[x.id,esc(x.date),esc(x.customer),esc(x.product_name),num(x.quantity).toFixed(3),money(x.cost_total)]));
const expenseRows=is.operating_expenses.groups.flatMap(g=>(g.transactions||[]));
const expenseDetail=expenseRows.length?tab(['Date','Category','Description','Amount'],expenseRows.map(x=>[esc(x.date),esc(x.category),esc(x.description),money(x.amount)])):'<div class="empty">No operating expense transactions in this period.</div>';
const spoilRows=(r.spoilage||[]);const spoilDetail=spoilRows.length?tab(['Date','Product','Qty','Cost'],spoilRows.map(x=>[esc(x.date),esc(x.product_name),num(x.quantity).toFixed(3),money(x.total_cost)])):'<div class="empty">No spoilage recorded in this period.</div>';
const otherRows=cashPeriod.filter(x=>x.direction==='in'&&(x.category==='Other Operating Income'||x.category==='Other Income'));const otherDetail=otherRows.length?tab(['Date','Category','Description','Amount'],otherRows.map(x=>[esc(x.date),esc(x.category),esc(x.description),money(x.amount)])):'<div class="empty">No other income transactions in this period.</div>';
const supportingCards=`<div class="supportingReportGrid" id="supporting-report-cards"><button type="button" class="card reportCard supportingReportCard" onclick="openReport('inventory')"><div class="muted">Inventory Valuation</div><div class="normal-value">${money(b.current_assets.inventory)}</div><div class="dashboardExplain">${r.inventoryRows.length} product(s) in the selected range / as-of position.</div><span class="cardLink">Open schedule →</span></button><button type="button" class="card reportCard supportingReportCard" onclick="openReport('receivables')"><div class="muted">Accounts Receivable</div><div class="normal-value">${money(r.receivables.total)}</div><div class="dashboardExplain">Outstanding customer balances as of the selected To date.</div><span class="cardLink">Open schedule →</span></button><button type="button" class="card reportCard supportingReportCard" onclick="openReport('payables')"><div class="muted">Accounts Payable</div><div class="normal-value">${money(r.payables.total)}</div><div class="dashboardExplain">Outstanding supplier balances as of the selected To date.</div><span class="cardLink">Open schedule →</span></button><button type="button" class="card reportCard supportingReportCard" onclick="openReport('loans')"><div class="muted">Loan Liabilities</div><div class="normal-value">${money(r.loans?.ending_outstanding||0)}</div><div class="dashboardExplain">Outstanding principal and repayment schedule.</div><span class="cardLink">Open schedule →</span></button><button type="button" class="card reportCard supportingReportCard" onclick="openReport('spoilage')"><div class="muted">Spoilage / Wastage</div><div class="normal-value">${money(is.operating_expenses.spoilage_expense||0)}</div><div class="dashboardExplain">Inventory loss expense for the selected period.</div><span class="cardLink">Open schedule →</span></button></div>`;
$('reportCards').innerHTML=`<div class="reportMain" id="main-cash-flow"><div class="reportMainHead" onclick="toggleReportMain('subs-cash-flow')"><div><h3 style="margin:0 0 6px">Cash Flow</h3><div class="kpi">${money(cf.net_cash_flow)}</div><div class="muted">Beginning ${money(cf.beginning_cash)} → Ending ${money(cf.ending_cash)}</div></div><div class="chev">＋</div></div><div id="subs-cash-flow" class="reportSubGrid hidden">${reportDisclosure('cf-op-in','Operating Activities — Cash Inflows',cf.operating.cash_inflows,'Cash received',opIn)}${reportDisclosure('cf-op-out','Operating Activities — Cash Outflows',-cf.operating.cash_outflows,'Cash paid',opOut)}${reportDisclosure('cf-inv-in','Investing Activities — Cash Inflows',cf.investing.cash_inflows,'Investing cash received',invIn)}${reportDisclosure('cf-inv-out','Investing Activities — Cash Outflows',-cf.investing.cash_outflows,'Investing cash paid',invOut)}${reportDisclosure('cf-fin-in','Financing Activities — Cash Inflows',cf.financing.cash_inflows,'Financing cash received',finIn)}${reportDisclosure('cf-fin-out','Financing Activities — Cash Outflows',-cf.financing.cash_outflows,'Financing cash paid',finOut)}</div></div>
<div class="reportMain" id="main-income-statement"><div class="reportMainHead" onclick="toggleReportMain('subs-income-statement')"><div><h3 style="margin:0 0 6px">Income Statement</h3><div class="kpi">${money(is.net_income)}</div><div class="muted">Revenue ${money(is.revenue.total_revenue)} • COGS ${money(is.cost_of_goods_sold.cogs)} • Gross Profit ${money(is.cost_of_goods_sold.gross_profit)}</div></div><div class="chev">＋</div></div><div id="subs-income-statement" class="reportSubGrid hidden">${reportDisclosure('is-revenue','Revenue',is.revenue.total_revenue,'Sales Revenue',revenueRows)}${reportDisclosure('is-cogs','COGS',is.cost_of_goods_sold.cogs,'Cost of Goods Sold',cogsRows)}${reportDisclosure('is-gross','Gross Profit',is.cost_of_goods_sold.gross_profit,'Revenue − COGS',`<div class="formula"><b>Gross Profit</b><br>${money(is.revenue.total_revenue)} − ${money(is.cost_of_goods_sold.cogs)} = ${money(is.cost_of_goods_sold.gross_profit)}</div>`)}${reportDisclosure('is-opex','Operating Expenses',is.operating_expenses.total_operating_expenses,'Business operating costs',expenseDetail)}${reportDisclosure('is-spoil','Spoilage / Wastage',is.operating_expenses.spoilage_expense||0,'Inventory loss expense',spoilDetail)}${reportDisclosure('is-other','Other Income',is.other_income,'Non-sales income',otherDetail)}${reportDisclosure('is-net','Net Income',is.net_income,'Final business result',`<div class="formula"><b>Net Income</b><br>Gross Profit − Operating Expenses − Spoilage + Other Income = ${money(is.net_income)}</div>`)}</div></div>
<div class="reportMain" id="main-balance-sheet"><div class="reportMainHead" onclick="toggleReportMain('subs-balance-sheet')"><div><h3 style="margin:0 0 6px">Balance Sheet</h3><div class="kpi">${money(b.assets.total_assets)}</div><div class="muted">Assets ${money(b.assets.total_assets)} • Liabilities ${money(b.liabilities.total_liabilities)} • Equity ${money(b.equity.owner_equity)}</div></div><div class="chev">＋</div></div><div id="subs-balance-sheet" class="reportSubGrid hidden">${reportDisclosure('bs-cash','Cash',b.current_assets.cash,'Current cash position',`<div class="formula"><b>Cash</b><br>Ending Cash from Cash Flow: ${money(cf.ending_cash)}</div>`)}${reportDisclosure('bs-ar','Accounts Receivable',b.current_assets.accounts_receivable,`${r.receivables.customers.length} customer group(s)`,tab(['Customer','Balance'],(r.receivables.sales||[]).map(x=>[esc(x.customer||'Customer'),money(x.balance)])))}${reportDisclosure('bs-inv','Inventory',b.current_assets.inventory,`${r.inventoryRows.length} product(s)`,tab(['Product','Qty','Value'],r.inventoryRows.map(x=>[esc(x.name),num(x.qty).toFixed(3),money(x.value)])))}${reportDisclosure('bs-ap','Accounts Payable',b.liabilities.accounts_payable,`${r.payables.suppliers.length} supplier group(s)`,tab(['Supplier','Balance'],(r.payables.purchases||[]).map(x=>[esc(x.supplier||'Supplier'),money(x.balance)])))}${reportDisclosure('bs-loans','Loans',b.liabilities.loans,'Loan liabilities',`<div class="formula"><b>Loan Liabilities</b><br>Total outstanding loans: ${money(b.liabilities.loans)}</div>`)}${reportDisclosure('bs-equity','Owner Equity',b.equity.owner_equity,'Owner capital + accumulated result − drawings',`<div class="formula"><b>Owner Equity</b><br>Capital ${money(b.equity.owner_capital)} + Opening Inventory ${money(b.equity.opening_inventory_equity||0)} + Accumulated Result ${money(b.equity.accumulated_business_result)} − Drawings ${money(b.equity.owner_drawings)} = ${money(b.equity.owner_equity)}</div>`)}</div></div>${supportingCards}`;
}
function reportRow(label,value,click=''){return `<div class="treeRow ${click?'clickable':''}" ${click?`onclick="${click}"`:''}><span>${esc(label)}</span><strong>${money(value)}</strong></div>`}
let activeReportRange=null;function selectedReportRange(){return{from:$('fromDate').value,to:$('toDate').value}}function resolveReportRange(mode,modalWasOpen=false){if(mode==='dashboard')return{from:ALL_REPORT_FROM,to:ALL_REPORT_TO,label:'All recorded dates'};if((mode==='active'||(mode==='context'&&modalWasOpen))&&activeReportRange)return activeReportRange;const r=selectedReportRange();return{...r,label:$('period')?.value==='all'?'All recorded dates':`${r.from} to ${r.to}`}}function reportRangeSubtitle(type,r){if(r.label==='All recorded dates')return(type==='receivables'||type==='payables'||type==='loans')?'All recorded dates · latest balance snapshot':'All recorded dates';return(type==='receivables'||type==='payables'||type==='loans')?`As of ${r.to} (balance snapshot)`:r.label}async function openReport(type,mode='context'){const modal=$('reportModal'),modalWasOpen=modal.classList.contains('open'),range=resolveReportRange(mode,modalWasOpen);activeReportRange=range;try{modal.classList.add('open');$('reportTitle').textContent=type==='cash-flow'?'Detailed Cash Flow':type==='income-statement'?'Detailed Income Statement':type==='balance-sheet'?'Detailed Balance Sheet':type==='inventory'?'Detailed Inventory Valuation':type==='receivables'?'Detailed Accounts Receivable':type==='payables'?'Detailed Accounts Payable':type==='loans'?'Detailed Loans':type==='spoilage'?'Detailed Spoilage / Wastage':'Detailed Report';$('reportSubtitle').textContent=reportRangeSubtitle(type,range);$('reportBody').innerHTML='<div class="empty">Loading detailed business data…</div>';const r=await api(`/reports/detail?type=${encodeURIComponent(type)}&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);renderReportDetail(type,r);}catch(e){$('reportBody').innerHTML=`<div class="notice bad">${esc(e.message)}</div>`}}
function renderReportDetail(type,r){const body=$('reportBody');if(type==='cash-flow'){const x=r.report;body.innerHTML=`<div class="detailGrid"><div class="metric"><div class="muted">Beginning Cash</div><div class="final-value">${money(x.beginning_cash)}</div></div><div class="metric"><div class="muted">Net Operating</div><div class="final-value">${money(x.operating.net_operating_cash_flow)}</div></div><div class="metric"><div class="muted">Net Investing</div><div class="final-value">${money(x.investing.net_investing_cash_flow)}</div></div><div class="metric"><div class="muted">Net Financing</div><div class="final-value">${money(x.financing.net_financing_cash_flow)}</div></div><div class="metric"><div class="muted">Ending Cash</div><div class="final-value">${money(x.ending_cash)}</div></div><div class="metric"><div class="muted">Reconciliation</div><div class="final-value">${money(x.reconciliation)}</div></div></div><div class="reportSubGrid">${reportDisclosure('modal-cf-op-in','Operating Activities — Cash Inflows',x.operating.cash_inflows,'Cash received',txRows(x.operating.inflows,t=>t.type==='Cash Sale'?'sale':t.type==='Customer Collection'?'collection':'cash'))}${reportDisclosure('modal-cf-op-out','Operating Activities — Cash Outflows',-x.operating.cash_outflows,'Cash paid',txRows(x.operating.outflows,t=>t.type==='Inventory Purchase'?'purchase':t.type==='Supplier Payment'?'cash':'cash',true))}${reportDisclosure('modal-cf-inv-in','Investing Activities — Cash Inflows',x.investing.cash_inflows,'Investing cash received',txRows(x.investing.inflows,()=> 'cash'))}${reportDisclosure('modal-cf-inv-out','Investing Activities — Cash Outflows',-x.investing.cash_outflows,'Investing cash paid',txRows(x.investing.outflows,()=> 'cash',true))}${reportDisclosure('modal-cf-fin-in','Financing Activities — Cash Inflows',x.financing.cash_inflows,'Financing cash received',txRows(x.financing.inflows,()=> 'cash'))}${reportDisclosure('modal-cf-fin-out','Financing Activities — Cash Outflows',-x.financing.cash_outflows,'Financing cash paid',txRows(x.financing.outflows,()=> 'cash',true))}</div>`;return}
if(type==='income-statement'){const x=r.report;const salesRows=r.sales||[];const spoilRows=r.spoilage||[];const cashRows=r.cash||[];const opGroups=x.operating_expenses.groups||[];const otherIncomeRows=cashRows.filter(t=>t.direction==='in'&&(t.category==='Other Operating Income'||t.category==='Other Income')&&t.source==='manual');const salesDetail=tab(['ID','Date','Customer','Product','Qty','Sales Amount','COGS','Gross Profit','Detail'],salesRows.length?salesRows.map(t=>[t.id,esc(t.date),esc(t.customer||''),esc(t.product_name||''),num(t.quantity).toFixed(3),money(t.total),money(t.cost_total),money(num(t.total)-num(t.cost_total)),`<button class="secondary small" onclick="event.stopPropagation();openTransaction('sale',${t.id})">Open</button>`]):[], 'No sales recorded for this period.');const cogsDetail=tab(['ID','Date','Product','Qty','Inventory Cost','Detail'],salesRows.length?salesRows.map(t=>[t.id,esc(t.date),esc(t.product_name||''),num(t.quantity).toFixed(3),money(t.cost_total),`<button class="secondary small" onclick="event.stopPropagation();openTransaction('sale',${t.id})">Open</button>`]):[],'No COGS transactions for this period.');const expenseSections=opGroups.length?opGroups.map(g=>profitDisclosure('is-exp-'+encodeURIComponent(g.category),g.category,g.amount,'Underlying expense transactions',tab(['ID','Date','Description','Amount','Detail'],(g.transactions||[]).length?g.transactions.map(t=>[t.id,esc(t.date),esc(t.description||''),money(t.amount),`<button class="secondary small" onclick="event.stopPropagation();openTransaction('cash',${t.id})">Open</button>`]):[],'No transactions in this expense category for this period.'))).join(''):'<div class="empty">No operating expense categories for this period.</div>';const spoilDetail=tab(['ID','Date','Product','Qty','Cost','Detail'],spoilRows.length?spoilRows.map(t=>[t.id,esc(t.date),esc(t.product_name||''),num(t.quantity).toFixed(3),money(t.total_cost),`<button class="secondary small" onclick="event.stopPropagation();openTransaction('${t.spoilage_source==='OUTLET'?'outlet_spoilage':'inventory'}',${t.id})">Open</button>`]):[],'No spoilage / wastage recorded for this period.');const otherIncomeDetail=tab(['ID','Date','Category','Description','Amount','Detail'],otherIncomeRows.length?otherIncomeRows.map(t=>[t.id,esc(t.date),esc(t.category),esc(t.description||''),money(t.amount),`<button class="secondary small" onclick="event.stopPropagation();openTransaction('cash',${t.id})">Open</button>`]):[],'No other income recorded for this period.');body.innerHTML=`<div class="detailGrid"><div class="metric"><div class="muted">Net Sales</div><div class="normal-value">${money(x.revenue.total_revenue)}</div></div><div class="metric"><div class="muted">COGS</div><div class="normal-value">${money(x.cost_of_goods_sold.cogs)}</div></div><div class="metric"><div class="muted">Gross Profit</div><div class="normal-value">${money(x.cost_of_goods_sold.gross_profit)}</div></div><div class="metric"><div class="muted">Gross Margin</div><div class="normal-value">${num(x.gross_margin_pct).toFixed(2)}%</div></div><div class="metric"><div class="muted">Operating Expenses</div><div class="normal-value">${money(x.operating_expenses.total_operating_expenses)}</div></div><div class="metric"><div class="muted">Spoilage / Wastage</div><div class="normal-value">${money(x.operating_expenses.spoilage_expense||0)}</div></div><div class="metric"><div class="muted">Net Income</div><div class="final-value">${money(x.net_income)}</div></div></div><div class="formula"><span>How it is calculated</span><br>${esc(x.formulas?.net_income||'Net Income = Gross Profit − Operating Expenses − Spoilage / Wastage + Other Income − Other Expense')}<div class="vb-info">Mao ni ang actual business logic: ang profit dili lang sales minus cash; ang inventory cost ug spoilage kinahanglan ma-account pud.</div></div><div class="reportSubGrid">${profitDisclosure('is-revenue','Revenue',x.revenue.total_revenue,'Net sales for the selected period',salesDetail)}${profitDisclosure('is-cogs','Cost of Goods Sold',x.cost_of_goods_sold.cogs,'Historical / weighted-average inventory cost',cogsDetail)}${profitDisclosure('is-gross','Gross Profit',x.cost_of_goods_sold.gross_profit,'Net Sales − COGS',`<div class="formula">Net Sales ${money(x.revenue.total_revenue)} − COGS ${money(x.cost_of_goods_sold.cogs)} = Gross Profit ${money(x.cost_of_goods_sold.gross_profit)}</div>`)}${profitDisclosure('is-opex','Operating Expenses',x.operating_expenses.total_operating_expenses,'Expense categories → source transactions',expenseSections)}${profitDisclosure('is-spoil','Spoilage / Wastage',x.operating_expenses.spoilage_expense||0,'Inventory loss expense',spoilDetail)}${profitDisclosure('is-other','Other Income',x.other_income,'Non-sales income',otherIncomeDetail)}<div class="reportSubCard"><div class="reportSubHead"><div><div class="muted">Net Income</div><div class="final-value">${money(x.net_income)}</div><div class="muted">Final business result</div></div></div><div class="reportSubDetail"><div class="formula">Gross Profit ${money(x.cost_of_goods_sold.gross_profit)} − Operating Expenses ${money(x.operating_expenses.total_operating_expenses)} − Spoilage / Wastage ${money(x.operating_expenses.spoilage_expense||0)} + Other Income ${money(x.other_income)} = Net Income ${money(x.net_income)}</div></div></div></div>`;return}
if(type==='balance-sheet'){const b=r.report;body.innerHTML=`<div class="detailGrid"><div class="metric"><div class="muted">Total Assets</div><div class="final-value">${money(b.assets.total_assets)}</div></div><div class="metric"><div class="muted">Total Liabilities</div><div class="final-value">${money(b.liabilities.total_liabilities)}</div></div><div class="metric"><div class="muted">Owner Equity</div><div class="final-value">${money(b.equity.owner_equity)}</div></div><div class="metric"><div class="muted">Balance Check</div><div class="final-value">${money(b.balance_check)}</div></div></div><div class="notice ${Math.abs(num(b.balance_check))<.01?'':'bad'}">Reconciliation: ${Math.abs(num(b.balance_check))<.01?'PASS — Assets = Liabilities + Equity':'ERROR — Financial position does not reconcile.'}<div class="vb-info">Kung zero ang Balance Check, nag-match ang assets, liabilities, ug owner equity. Kung dili zero, naa'y transaction classification o data issue nga kinahanglan tan-awon.</div></div><div class="formula"><b>Formula</b><br>Assets − (Liabilities + Owner Equity) = Balance Check</div><div class="tree"><h3>Current Assets</h3>${reportRow('Cash',b.current_assets.cash,'openReport(\'cash-flow\')')}${reportRow('Accounts Receivable',b.current_assets.accounts_receivable,'openReport(\'receivables\')')}${reportRow('Inventory',b.current_assets.inventory,'openReport(\'inventory\')')}${reportRow('Total Current Assets',b.current_assets.total_current_assets)}</div><div class="tree"><h3>Non-current Assets</h3>${reportRow('Total Non-current Assets',b.non_current_assets.total_non_current_assets)}</div><div class="tree"><h3>Liabilities</h3>${reportRow('Accounts Payable',b.liabilities.accounts_payable,'openReport(\'payables\')')}${reportRow('Loans',b.liabilities.loans,'openReport(\'loans\')')}</div><div class="tree"><h3>Owner Equity</h3>${reportRow('Owner Capital',b.equity.owner_capital)}${reportRow('Opening Inventory Equity',b.equity.opening_inventory_equity||0)}${reportRow('Owner Drawings',-b.equity.owner_drawings)}${reportRow('Accumulated Business Result',b.equity.accumulated_business_result)}${reportRow('Owner Equity',b.equity.owner_equity)}</div>`;return}
if(type==='inventory'){body.innerHTML=`<div class="detailGrid"><div class="metric"><div class="muted">Inventory Value</div><div class="final-value">${money(r.total)}</div></div><div class="metric"><div class="muted">Products</div><b>${r.rows.length}</b></div></div>${r.rows.map(p=>`<div class="tree"><div class="treeRow clickable" onclick="toggleSection(this.nextElementSibling)"><span><b>${esc(p.name)}</b> • ${esc(p.sku||'')}</span><strong>${money(p.value)}</strong></div><div class="hidden"><div class="subrow">Qty: ${num(p.qty).toFixed(3)} ${esc(p.unit)} • Weighted-average cost: ${money(p.unit_cost)}</div>${p.transactions.map(t=>`<div class="treeRow subrow clickable" onclick="openTransaction('inventory',${t.id})"><span>${esc(t.date)} • ${esc(t.type)} • ${esc(t.reference||'')}</span><strong>${num(t.type).toString().toUpperCase().includes('OUT')||['LOSS','DAMAGE','ADJUST_OUT'].includes(t.type)?'-':''}${num(t.quantity).toFixed(3)}</strong></div>`).join('')}</div></div>`).join('')}`;return}
if(type==='spoilage'){body.innerHTML=`<div class="detailGrid"><div class="metric"><div class="muted">Spoilage / Wastage Expense</div><div class="final-value">${money(r.total)}</div></div><div class="metric"><div class="muted">Spoilage Movements</div><b>${r.rows.length}</b></div></div><div class="formula"><b>Formula</b><br>${esc(r.formula)}<div class="vb-info">Ang spoilage kay tinuod nga inventory loss: dili na siya sale, pero tinuod nga cost/loss sa negosyo ug mo-minus sa inventory value.</div></div><div class="tree"><h3>Actual Spoilage Transactions</h3>${r.rows.map(x=>`<div class="treeRow clickable" onclick="openTransaction('${x.spoilage_source==='OUTLET'?'outlet_spoilage':'inventory'}',${x.id})"><span>${esc(x.date)} • ${esc(x.product_name)} • ${num(x.quantity).toFixed(3)} ${esc(x.unit)} • ${esc(x.reference||'Spoilage / Wastage')}</span><strong>${money(x.total_cost)}</strong></div>`).join('')||'<div class="empty">No spoilage recorded for this period.</div>'}</div>`;return}
if(type==='receivables'){body.innerHTML=`<div class="notice">Balance snapshot as of <b>${esc(r.to||r.report.selected_to||'')}</b>. The From date is shown for report-period context only.</div><div class="detailGrid"><div class="metric"><div class="muted">Outstanding AR</div><b>${money(r.report.total)}</b></div><div class="metric"><div class="muted">Customer Groups</div><b>${r.report.customers.length}</b></div></div>${r.report.sales.map(s=>`<div class="tree"><div class="treeRow clickable" onclick="openTransaction('sale',${s.id})"><span>Sale #${s.id} • ${esc(s.customer||'Customer')} • ${esc(s.date)}</span><strong>${money(s.balance)}</strong></div><div class="subrow">Original: ${money(s.original)} • Collected: ${money(s.collected)} • Remaining: ${money(s.balance)}</div></div>`).join('')}${r.report.unallocated?.length?`<div class="tree"><h3>Unallocated Collections</h3>${r.report.unallocated.map(x=>`<div class="treeRow clickable" onclick="openTransaction('collection',${x.id})"><span>#${x.id} • ${esc(x.customer||'Customer')}</span><strong>${money(x.unallocated)}</strong></div>`).join('')}</div>`:''}`;return}
if(type==='loans'){const x=r.report;const rows=x.loans||[];body.innerHTML=`<div class="notice">Loan liability snapshot as of <b>${esc(r.to||x.as_of||'')}</b>. Payments reduce principal; loan proceeds increase principal.</div><div class="detailGrid"><div class="metric"><div class="muted">Total Borrowed</div><b>${money(x.total_borrowed)}</b></div><div class="metric"><div class="muted">Principal Paid</div><b>${money(x.total_paid)}</b></div><div class="metric"><div class="muted">Outstanding</div><div class="final-value">${money(x.ending_outstanding)}</div></div><div class="metric"><div class="muted">Active Loans</div><b>${num(x.active_count)}</b></div></div><div class="tree"><h3>Loans</h3>${rows.length?rows.map(l=>`<div class="tree"><div class="treeRow clickable" onclick="openTransaction('cash',${l.source_id})"><span>${esc(l.loan_id)} • ${esc(l.date)} • ${esc(l.description||'Loan')}</span><strong>${money(l.outstanding_amount)}</strong></div><div class="subrow">Original: ${money(l.original_amount)} • Paid: ${money(l.paid_amount)} • Status: ${esc(l.status)}</div>${l.repayments?.length?`<div class="subrow">Repayments: ${l.repayments.map(p=>`${esc(p.date)} ${money(p.amount)}`).join(' • ')}</div>`:''}</div>`).join(''):'<div class="empty">No loan liabilities as of this date.</div>'}</div>`;return}
if(type==='payables'){body.innerHTML=`<div class="notice">Balance snapshot as of <b>${esc(r.to||r.report.selected_to||'')}</b>. The From date is shown for report-period context only.</div><div class="detailGrid"><div class="metric"><div class="muted">Outstanding AP</div><b>${money(r.report.total)}</b></div><div class="metric"><div class="muted">Supplier Groups</div><b>${r.report.suppliers.length}</b></div></div>${r.report.purchases.filter(p=>num(p.balance)>0.005).map(p=>`<div class="tree"><div class="treeRow clickable" onclick="openTransaction('purchase',${p.id})"><span>Purchase #${p.id} • ${esc(p.supplier||'Supplier')} • ${esc(p.date)}</span><strong>${money(p.balance)}</strong></div><div class="subrow">Original credit purchase: ${money(p.original)} • Paid: ${money(p.paid)} • Remaining: ${money(p.balance)}</div></div>`).join('')||'<div class="empty">No outstanding purchase invoices.</div>'}<div class="tree"><h3>Supplier Payments</h3>${r.report.payments.map(x=>{const kind=x.source==='supplier_payment'?'supplier_payment':'cash';const label=x.source==='supplier_payment'?`Payment #${x.id} • ${x.supplier||x.description||'Supplier'}`:`#${x.id} • ${x.description||x.category}`;return `<div class="treeRow clickable" onclick="openTransaction('${kind}',${x.id})"><span>${esc(label)}</span><strong>-${money(x.amount)}</strong></div>`}).join('')||'<div class="empty">No supplier payments recorded.</div>'}</div>`;}
}
function toggleSection(el){el.classList.toggle('hidden')}
async function showSalesDetail(cogs=false){const rows=cogs?sales.map(x=>({...x,display:x.cost_total})):sales.map(x=>({...x,display:x.total}));$('reportBody').insertAdjacentHTML('beforeend',`<div class="tree"><h3>${cogs?'COGS Transactions':'Sales Revenue Transactions'}</h3>${tab(['ID','Date','Customer','Product','Qty','Amount','Detail'],rows.map(x=>[x.id,esc(x.date),esc(x.customer),esc(x.product_name),num(x.quantity).toFixed(3),money(x.display),`<button class="secondary small" onclick="openTransaction('sale',${x.id})">Open</button>`]))}</div>`)}
async function showExpenseDetail(category){const cat=decodeURIComponent(category);const rows=reportCache.cash.filter(x=>x.category===cat&&x.source==='manual');$('reportBody').insertAdjacentHTML('beforeend',`<div class="tree"><h3>${esc(cat)} — Underlying Transactions</h3>${tab(['ID','Date','Description','Amount','Detail'],rows.map(x=>[x.id,esc(x.date),esc(x.description),money(x.amount),`<button class="secondary small" onclick="openTransaction('cash',${x.id})">Open</button>`]))}</div>`)}
async function showOtherIncomeDetail(){const rows=reportCache.cash.filter(x=>x.direction==='in'&&(x.category==='Other Operating Income'||x.category==='Other Income'));$('reportBody').insertAdjacentHTML('beforeend',`<div class="tree"><h3>Other Income — Underlying Transactions</h3>${tab(['ID','Date','Category','Description','Amount','Detail'],rows.map(x=>[x.id,esc(x.date),esc(x.category),esc(x.description),money(x.amount),`<button class="secondary small" onclick="openTransaction('cash',${x.id})">Open</button>`]))}</div>`)}
async function openTransaction(kind,id){try{$('transactionModal').classList.add('open');$('transactionBody').innerHTML='<div class="empty">Loading transaction…</div>';const r=await api(`/reports/transaction/${kind}/${id}`);const t=r.transaction;let html='';
  const baseFields=Object.entries(t).filter(([k])=>!['created_at','voided_at','loan_liquidation','loan_summary','repayments','period_payments'].includes(k));
  if(t.voided_at) html+='<div class="notice">This transaction is voided and excluded from active business totals.</div>';
  html+='<div class="detailGrid">';
  for(const [k,v] of baseFields){const label=k.replace(/_/g,' ');const isMoney=typeof v==='number'&&/(amount|total|cost|price|discount|paid|outstanding)/i.test(k);const shown=Array.isArray(v)?v.join(', '):typeof v==='object'&&v!==null?JSON.stringify(v):String(v??'');html+=`<div class="metric"><div class="muted">${esc(label)}</div><div class="subvalue">${isMoney?money(v):esc(shown)}</div></div>`}
  html+='</div>';
  const loan=t.loan_liquidation||null, summary=t.loan_summary||null;
  if(loan){
    html+=`<div class="tree"><h3>Loan Liquidation</h3><div class="detailGrid"><div class="metric"><div class="muted">Loan Reference</div><div class="subvalue">${esc(loan.loan_id)}</div></div><div class="metric"><div class="muted">Original Principal</div><div class="subvalue">${money(loan.original_amount)}</div></div><div class="metric"><div class="muted">Principal Paid</div><div class="subvalue">${money(loan.paid_amount)}</div></div><div class="metric"><div class="muted">Outstanding Principal</div><div class="final-value">${money(loan.outstanding_amount)}</div></div><div class="metric"><div class="muted">Status</div><div class="subvalue">${esc(loan.status)}</div></div><div class="metric"><div class="muted">Loan Date</div><div class="subvalue">${esc(loan.date)}</div></div></div>${loan.repayments?.length?`<div class="tree"><h4>Applied Repayments</h4>${tab(['Payment ID','Date','Amount','Description','Allocation'],loan.repayments.map(p=>[p.payment_id,esc(p.date),money(p.amount),esc(p.description),p.linked_explicitly?'Explicit link':'FIFO allocation']))}</div>`:'<div class="empty">No principal repayment has been applied to this loan.</div>'}</div>`;
  }
  if(summary){
    html+=`<div class="tree"><h3>Loan Summary</h3><div class="detailGrid"><div class="metric"><div class="muted">Beginning Outstanding</div><div class="subvalue">${money(summary.beginning_outstanding)}</div></div><div class="metric"><div class="muted">New Loans</div><div class="subvalue">${money(summary.new_loans)}</div></div><div class="metric"><div class="muted">Principal Paid</div><div class="subvalue">${money(summary.principal_paid)}</div></div><div class="metric"><div class="muted">Ending Outstanding</div><div class="final-value">${money(summary.ending_outstanding)}</div></div><div class="metric"><div class="muted">Active Loans</div><div class="subvalue">${num(summary.active_count)}</div></div><div class="metric"><div class="muted">Fully Paid</div><div class="subvalue">${num(summary.fully_paid_count)}</div></div></div>${summary.loans?.length?`<div class="tree"><h4>Loans at As-of Date</h4>${tab(['Loan Ref','Date','Original','Paid','Outstanding','Status'],summary.loans.map(l=>[esc(l.loan_id),esc(l.date),money(l.original_amount),money(l.paid_amount),money(l.outstanding_amount),esc(l.status)]))}</div>`:''}</div>`;
  }
  if(String(t.type||'').toUpperCase()==='SPOILAGE')html+=`<div class="formula"><b>Spoilage / Wastage Treatment</b><br>Inventory decreases at the applicable weighted-average cost; Spoilage / Wastage Expense increases by the same amount.<div class="vb-info">Sa simple terms: nadaot nga stock, nawala ang inventory value, ug ang cost ana mahimong expense/loss sa negosyo.</div></div>`;
  if(r.accounting_effects?.length)html+=`<div class="tree"><h3>Accounting Effects</h3>${tab(['Debit','Credit','Amount','Memo'],r.accounting_effects.map(x=>[esc(x.debit_account),esc(x.credit_account),money(x.amount),esc(x.memo)]))}</div>`;
  if(!t.voided_at && ['sale','purchase','collection','supplier_payment','cash'].includes(kind)) html+=`<div class="tree"><h3>Correction</h3><button class="danger" onclick="previewVoid('${kind}',${id})">Void / Reverse this transaction</button><div class="muted">*Mubalik ang accounting/cash effect; inventory-linked transactions are safely reversed and audited.</div></div>`;
  $('transactionBody').innerHTML=html;
}catch(e){$('transactionBody').innerHTML=`<div class="notice bad">${esc(e.message)}</div>`}}

async function voidTransaction(kind,id){const reason=prompt('Reason for voiding / reversing this transaction:');if(!reason||!reason.trim())return;try{await api(`/transactions/${kind}/${id}/void`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:reason.trim()})});showToast('Transaction voided / reversed successfully.');$('transactionModal').classList.remove('open');await load();}catch(e){showToast(e.message,true)}}
let downloadInProgress=false;
async function downloadPath(p,successMessage='Download ready.'){
  downloadInProgress=true;
  setSync('Preparing download…');
  try{
    const headers={'Accept':'application/octet-stream','X-VEGE-Client':'owner-pwa'};
    const t=token();
    if(t) headers.Authorization='Bearer '+t;
    const r=await fetch(API+apiPath(p),{headers});
    if(r.status===401){
      localStorage.removeItem('vege_owner_token');
      showAuth();
      throw Error('Sign-in required.');
    }
    if(!r.ok){
      const ct=r.headers.get('content-type')||'';
      let msg=`HTTP ${r.status}`;
      try{
        if(ct.includes('json')){const j=await r.json();msg=j?.error?.message||msg;}
        else{const txt=await r.text();if(txt)msg=txt;}
      }catch{}
      throw Error(msg);
    }
    const blob=await r.blob();
    const cd=r.headers.get('content-disposition')||'';
    const match=cd.match(/filename[^;=]*=(?:UTF-8''|\")?([^;\"]+)/i);
    const filename=match?decodeURIComponent(match[1].replace(/^\"|\"$/g,'')):((p.split('/').pop()||'download')+'.xlsx');
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast(successMessage);
  }catch(e){showToast(e.message||'Download failed.',true)}
  finally{
    downloadInProgress=false;
    if(realtimeConnection?.connected)setSync('Synced');
    else setSync('Connecting…');
  }
}
function downloadReport(){return downloadPremiumReports('excel')}
function downloadPremiumReports(format){
  if(!requireAdminUi())return;
  const from=$('fromDate')?.value||ALL_REPORT_FROM,to=$('toDate')?.value||ALL_REPORT_TO;
  if(!from||!to||from>to){showToast('Choose a valid report date range.',true);return}
  const fmt=String(format||'excel').toLowerCase()==='pdf'?'pdf':'excel';
  return downloadPath(`/reports/premium-bundle?format=${fmt}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,`Premium ${fmt==='pdf'?'PDF':'Excel'} report ZIP downloaded.`);
}
let socketClientLoader=null;
function loadSocketClient(){if(window.io)return Promise.resolve(window.io);if(socketClientLoader)return socketClientLoader;socketClientLoader=new Promise((resolve,reject)=>{const sc=document.createElement('script');sc.src=API+'/socket.io/socket.io.js';sc.async=true;sc.onload=()=>window.io?resolve(window.io):reject(new Error('Socket.IO client unavailable.'));sc.onerror=()=>reject(new Error('Socket.IO client failed to load.'));document.head.appendChild(sc)});return socketClientLoader}
async function connectRealtime(){if(!token())return;if(realtimeConnection){try{realtimeConnection.close()}catch{}}try{const io=await loadSocketClient();const socket=io(API,{auth:{token:token()},transports:['websocket','polling'],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:500,reconnectionDelayMax:4000,timeout:10000});realtimeConnection=socket;socket.on('ready',()=>setSync('Synced'));socket.on('connect',()=>setSync('Synced'));socket.on('data-change',scheduleRealtimeRefresh);socket.on('disconnect',()=>{if(!downloadInProgress)setSync('Reconnecting…',true)});socket.on('connect_error',()=>{if(!downloadInProgress)setSync('Reconnecting…',true)});window.addEventListener('beforeunload',()=>socket.close(),{once:true})}catch{if(!downloadInProgress)setSync('Offline mode',true)}}
/* ==========================================================================
   PWA installation — single authoritative implementation.
   Generic / white-label: no company name is hardcoded here.
   ========================================================================== */
function pwaBrandName(){return (typeof settings==='object'&&settings&&settings.companyName)||document.getElementById('appTitle')?.textContent||'this app'}
function isStandalone(){
  return window.matchMedia?.('(display-mode: standalone)').matches===true
    || window.matchMedia?.('(display-mode: minimal-ui)').matches===true
    || window.matchMedia?.('(display-mode: window-controls-overlay)').matches===true
    || window.navigator.standalone===true
    || new URLSearchParams(location.search).get('source')==='pwa'&&window.matchMedia?.('(display-mode: standalone)').matches===true;
}
function isIos(){
  const ua=navigator.userAgent||'';
  if(/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13+ reports a desktop Safari user agent.
  return /Macintosh/i.test(ua)&&navigator.maxTouchPoints>1;
}
function isIpadLike(){return isIos()&&(/ipad/i.test(navigator.userAgent)||(/Macintosh/i.test(navigator.userAgent)&&navigator.maxTouchPoints>1))}
function isAndroid(){return /android/i.test(navigator.userAgent)}
function isFirefox(){return /firefox|fxios/i.test(navigator.userAgent)}
function isDesktopSafari(){return /Safari/i.test(navigator.userAgent)&&!/Chrome|Chromium|Edg|OPR/i.test(navigator.userAgent)&&!isIos()}
function installInstructions(){
  if(isIos()){
    const device=isIpadLike()?'iPad':'iPhone';
    return {title:`Install App on ${device}`,steps:[
      'Open this app in Safari.',
      'Tap the Share button at the bottom (or top) of Safari.',
      'Scroll down and tap “Add to Home Screen”.',
      'Tap “Add” in the top-right corner.',
      'Launch the app from your Home Screen — it opens full screen like a normal app.'
    ]};
  }
  if(isAndroid()){
    return {title:'Install App on Android',steps:[
      'Open this app in Chrome (or another Chromium browser).',
      'Tap the browser menu (⋮) in the top-right corner.',
      'Tap “Install app” or “Add to Home screen”.',
      'Confirm with “Install”.'
    ]};
  }
  if(isDesktopSafari()){
    return {title:'Install App on Mac (Safari)',steps:[
      'Open the “File” menu in Safari.',
      'Choose “Add to Dock…”.',
      'Confirm with “Add”. The app appears in your Dock and Launchpad.'
    ]};
  }
  if(isFirefox()){
    return {title:'Install App',steps:[
      'Firefox does not support desktop app installation.',
      'Open this app in Chrome, Edge or another Chromium browser.',
      'Then use “Install App” again, or the install icon in the address bar.'
    ]};
  }
  return {title:'Install App on Desktop',steps:[
    'Look for the install icon in the browser address bar (a screen with a down arrow).',
    'Or open the browser menu (⋮) and choose “Install app” / “Apps → Install this site as an app”.',
    'Confirm with “Install”. The app is added to your desktop and application list.'
  ]};
}
function openInstallGuide(){
  const info=installInstructions();
  const box=$('installGuide');
  if(!box){return}
  setText('installGuideTitle',info.title);
  const list=$('installGuideSteps');
  if(list) list.innerHTML=info.steps.map(step=>`<li style="margin-bottom:7px">${esc(step)}</li>`).join('');
  box.classList.add('open');
}
function closeInstallGuide(){$('installGuide')?.classList.remove('open')}
function refreshInstallUi(){
  const buttons=[$('installAppBtn'),$('authInstallAppBtn')].filter(Boolean);
  const help=$('installHelp');
  const installed=isStandalone();
  if(installed){
    buttons.forEach(b=>{b.textContent='App Installed';b.disabled=true;b.classList.add('hidden')});
    if(help){help.textContent='';help.classList.add('hidden')}
    closeInstallGuide();
    return;
  }
  const label=deferredInstallPrompt?'Install App':(isIos()?`Install App on ${isIpadLike()?'iPad':'iPhone'}`:'Install App');
  buttons.forEach(b=>{b.textContent=label;b.disabled=false;b.classList.remove('hidden')});
  if(help){
    if(deferredInstallPrompt){help.textContent='';help.classList.add('hidden')}
    else{help.textContent=isIos()?'Tap Install App for the Add to Home Screen steps.':'Tap Install App for the installation steps for your browser.';help.classList.remove('hidden')}
  }
}
async function installPwa(){
  if(isStandalone()){refreshInstallUi();showToast('The app is already installed on this device.');return}
  if(deferredInstallPrompt){
    const promptEvent=deferredInstallPrompt;
    try{
      promptEvent.prompt();
      const choice=await promptEvent.userChoice;
      if(choice&&choice.outcome==='accepted'){deferredInstallPrompt=null;refreshInstallUi();return}
      // Dismissed: the same event cannot be reused, offer the manual route instead.
      deferredInstallPrompt=null;
      refreshInstallUi();
      return;
    }catch{
      deferredInstallPrompt=null;
      refreshInstallUi();
      openInstallGuide();
      return;
    }
  }
  openInstallGuide();
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;refreshInstallUi()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;refreshInstallUi();closeInstallGuide();showToast('The app was installed on your device.')});
// Live state detection — no manual refresh is ever required.
['standalone','minimal-ui','window-controls-overlay'].forEach(mode=>{
  const mq=window.matchMedia?.(`(display-mode: ${mode})`);
  if(mq?.addEventListener) mq.addEventListener('change',refreshInstallUi);
  else mq?.addListener?.(refreshInstallUi);
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshInstallUi()});
window.addEventListener('focus',refreshInstallUi);
window.addEventListener('pageshow',refreshInstallUi);
setInterval(refreshInstallUi,4000);
refreshInstallUi();

/* ==========================================================================\n   RAGAS v6.0 UI/UX + ROLE WORKSPACE HELPERS\n   Presentation and workflow helpers only; accounting endpoints remain the\n   accounting-safe transaction engine.\n   ========================================================================== */
let currentFinanceTab='receivables',currentSalesTab='new',currentPurchaseTab='new',currentReportView='overview';
function workspaceSwitch(buttonSelector,paneSelector,key,buttonAttr,paneAttr){document.querySelectorAll(buttonSelector).forEach(b=>b.classList.toggle('active',b.dataset[buttonAttr]===key));document.querySelectorAll(paneSelector).forEach(p=>p.classList.toggle('active',p.dataset[paneAttr]===key));}
function financeTab(key){currentFinanceTab=key;workspaceSwitch('[data-fin]','[data-finpane]',key,'fin','finpane');try{localStorage.setItem('ragas_fin_tab',key)}catch{}if(key==='loans')renderLoansFinance();}
function salesTab(key){currentSalesTab=key;workspaceSwitch('[data-salestab]','[data-salespane]',key,'salestab','salespane');try{localStorage.setItem('ragas_sales_tab',key)}catch{}}
function purchaseTab(key){currentPurchaseTab=key;workspaceSwitch('[data-purchasetab]','[data-purchasepane]',key,'purchasetab','purchasepane');try{localStorage.setItem('ragas_purchase_tab',key)}catch{}}
function openImportHub(){$('importHubModal').classList.add('open')}
function openOutletModal(){$('outletModal').classList.add('open')}
function setInventoryStatus(v){inventoryStatusMode=v||'active';const needArchived=inventoryStatusMode!=='active';if(needArchived!==showArchived){showArchived=needArchived;load();return}renderProducts()}
function syncExpiryFields(){const on=Number($('pHasExp')?.value||0)===1||Number($('pPerishable')?.value||0)===1;const e=$('expiryFields');if(e)e.classList.toggle('mutedDisabled',!on);['pShelf','pAlert'].forEach(id=>{if($(id))$(id).disabled=!on});if(on&&Number($('pPerishable')?.value||0)===1&&$('pHasExp'))$('pHasExp').value='1'}
function renderLoansFinance(){const el=$('loanFinanceSummary');if(!el)return;const rows=cash.filter(x=>['Loan Proceeds','Loan Principal Repayment'].includes(x.category)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.id-a.id);const borrowed=rows.filter(x=>x.category==='Loan Proceeds').reduce((a,x)=>a+num(x.amount),0),paid=rows.filter(x=>x.category==='Loan Principal Repayment').reduce((a,x)=>a+num(x.amount),0);el.innerHTML=`<div class="detailGrid"><div class="metric"><div class="muted">Loan Proceeds Recorded</div><div class="subvalue">${money(borrowed)}</div></div><div class="metric"><div class="muted">Principal Repaid</div><div class="subvalue">${money(paid)}</div></div><div class="metric"><div class="muted">Simple Net Movement</div><div class="subvalue">${money(borrowed-paid)}</div></div></div>${rows.length?tab(['Date','Type','Description','Amount','Detail'],rows.map(x=>[esc(x.date),esc(x.category),esc(x.description||''),money(x.amount),`<button class="secondary small" onclick="openTransaction('cash',${x.id})">Open</button>`])):'<div class="emptyState"><b>No loan activity yet</b><span>Use the buttons above to record loan proceeds or principal repayments.</span></div>'}`;}
function updateEntryPreviews(){const q=num($('saleQty')?.value),p=num($('salePrice')?.value),d=num($('saleDiscount')?.value);if($('saleEntryPreview'))$('saleEntryPreview').textContent=q>0&&p>0?`Line preview: ${q.toFixed(3)} × ${money(p)} − ${money(d)} = ${money(Math.max(0,q*p-d))}`:'Enter quantity and price to preview this line.';const pq=num($('purchaseQty')?.value),pc=num($('purchaseCost')?.value);if($('purchaseImpactPreview'))$('purchaseImpactPreview').textContent=pq>0&&pc>0?`Inventory will increase by ${pq.toFixed(3)} units at ${money(pc)} each · ${money(pq*pc)} total.`:'Enter quantity and unit cost to preview the inventory increase.';const tq=num($('outletTransferQty')?.value),prod=products.find(x=>x.id==$('outletTransferProduct')?.value),out=outlets.find(x=>x.id==$('outletTransferOutlet')?.value);if($('outletTransferPreview'))$('outletTransferPreview').textContent=tq>0&&prod?`${prod.name}: Main ${num(prod.stock_qty).toFixed(3)} → ${Math.max(0,num(prod.stock_qty)-tq).toFixed(3)}; ${out?.name||'Outlet'} receives +${tq.toFixed(3)}.`:'Choose a product and quantity to preview main-stock and outlet-stock changes.';updateReturnImpactPreview();}
['saleQty','salePrice','saleDiscount','purchaseQty','purchaseCost','outletTransferQty'].forEach(id=>$(id)?.addEventListener('input',updateEntryPreviews));['outletTransferProduct','outletTransferOutlet'].forEach(id=>$(id)?.addEventListener('change',updateEntryPreviews));
function updateReturnImpactPreview(){const el=$('returnImpactPreview');if(!el)return;const s=sales.find(x=>x.id==$('salesReturnSale')?.value),q=num($('salesReturnQty')?.value);if(!s||!(q>0)){el.textContent='Select a sale and quantity to preview the credit-note impact.';return}const ratio=Math.min(1,q/Math.max(.000001,num(s.quantity))),amt=num(s.total)*ratio,cost=num(s.cost_total)*ratio;el.innerHTML=`<b>Impact preview</b> · Sales/AR-or-Cash ↓ ${money(amt)} · Inventory/COGS reversal ≈ ${money(cost)} · Quantity restored ${q.toFixed(3)}.`}
$('salesReturnSale')?.addEventListener('change',updateReturnImpactPreview);$('salesReturnQty')?.addEventListener('input',updateReturnImpactPreview);
function setReportPeriod(key){$('period').value=key;document.querySelectorAll('[data-period]').forEach(b=>b.classList.toggle('active',b.dataset.period===key));const custom=key==='custom';$('reportDateRange')?.classList.toggle('customOnly',!custom);if(!custom){const f=$('fromDate');if(key==='all'){f.value=ALL_REPORT_FROM;$('toDate').value=ALL_REPORT_TO}else if(key==='day')f.value=today;else if(key==='week'){const d=new Date(today+'T00:00:00');d.setDate(d.getDate()-d.getDay());f.value=d.toISOString().slice(0,10)}else if(key==='month')f.value=today.slice(0,8)+'01';else if(key==='year')f.value=today.slice(0,4)+'-01-01';setPeriodDefaults()}applyReportPeriod();}
$('fromDate')?.addEventListener('change',()=>{if($('period').value==='custom')applyReportPeriod()});$('toDate')?.addEventListener('change',()=>{if($('period').value==='custom')applyReportPeriod()});
function setReportView(key){currentReportView=key;document.querySelectorAll('[data-reportview]').forEach(b=>b.classList.toggle('active',b.dataset.reportview===key));filterReportCards();}
function filterReportCards(){const cards=[...$('reportCards')?.children||[]];cards.forEach(c=>{const id=c.id||'',txt=(c.textContent||'').toLowerCase();let on=currentReportView==='overview';if(currentReportView==='profit')on=id.includes('income-statement')||txt.includes('income statement');if(currentReportView==='cashflow')on=id.includes('cash-flow')||txt.includes('cash flow');if(currentReportView==='balance')on=id.includes('balance-sheet')||txt.includes('balance sheet');if(currentReportView==='supporting')on=!id.includes('cash-flow')&&!id.includes('income-statement')&&!id.includes('balance-sheet');c.classList.toggle('reportFilteredOut',!on)});}
const originalRenderReportCards=renderReportCards;renderReportCards=function(){originalRenderReportCards();filterReportCards();const s=$('reportRangeSummary');if(s)s.textContent=$('period')?.value==='all'?'Showing all recorded dates. Figures refresh from the accounting ledger.':`Showing ${$('fromDate').value} to ${$('toDate').value}. Figures refresh from the accounting ledger.`;enhanceOperationalTables();};
function openGlobalSearch(seed=''){const m=$('globalSearchModal'),inp=$('globalSearchInput');m.classList.add('open');inp.value=seed||'';renderGlobalSearch(inp.value);setTimeout(()=>inp.focus(),0)}
function globalSearchRows(){return [...products.map(x=>({kind:'product',id:x.id,title:x.name,meta:`Product · ${x.sku||'No SKU'} · ${x.category||''}`,search:[x.name,x.sku,x.category,x.source_type]})),...sales.map(x=>({kind:'sale',id:x.id,title:`Sale #${x.id} · ${x.customer||'Walk-in Customer'}`,meta:`${x.date} · ${x.product_name||''} · ${money(x.total)}`,search:[x.id,x.customer,x.product_name,x.date,x.group_ref]})),...purchases.map(x=>({kind:'purchase',id:x.id,title:`Purchase #${x.id} · ${x.supplier||'Supplier'}`,meta:`${x.date} · ${x.product_name||''} · ${money(x.total)}`,search:[x.id,x.supplier,x.product_name,x.date,x.group_ref,x.batch_lot]})),...collections.map(x=>({kind:'collection',id:x.id,title:`Customer Payment #${x.id} · ${x.customer||''}`,meta:`${x.date} · ${money(x.amount)} · ${x.reference||''}`,search:[x.id,x.customer,x.date,x.reference]})),...supplierPayments.map(x=>({kind:'supplier_payment',id:x.id,title:`Supplier Payment #${x.id} · ${x.supplier||''}`,meta:`${x.date} · ${money(x.amount)} · ${x.reference||''}`,search:[x.id,x.supplier,x.date,x.reference]})),...cash.map(x=>({kind:'cash',id:x.id,title:`${x.category} #${x.id}`,meta:`${x.date} · ${money(x.amount)} · ${x.description||''}`,search:[x.id,x.category,x.date,x.description]}))];}
let globalSearchSeq=0,globalSearchTimer=null;
function renderGlobalSearch(q){const el=$('globalSearchResults');const needle=String(q||'').trim();clearTimeout(globalSearchTimer);const seq=++globalSearchSeq;if(!needle){el.innerHTML='<div class="empty">Start typing to search all products, customers, suppliers and transactions.</div>';return}el.innerHTML='<div class="empty">Searching all records…</div>';globalSearchTimer=setTimeout(async()=>{try{const r=await api(`/search?q=${encodeURIComponent(needle)}&limit=40`);if(seq!==globalSearchSeq)return;const rows=r.rows||[];el.innerHTML=rows.length?rows.map(x=>`<button class="searchResult" onclick="openSearchResult('${x.kind}',${x.id})"><span class="searchKind">${esc(String(x.kind||'').replace('_',' '))}</span><span><b>${esc(x.title||'')}</b><small>${esc(x.meta||'')}</small></span><em>Open →</em></button>`).join(''):'<div class="emptyState"><b>No matches</b><span>Try a product name, party, transaction number or reference.</span></div>'}catch(e){if(seq===globalSearchSeq)el.innerHTML=`<div class="emptyState"><b>Search unavailable</b><span>${esc(e.message)}</span></div>`}},180)}
function openSearchResult(kind,id){closeModal('globalSearchModal');if(kind==='product'){goPage('inventory');const p=products.find(x=>x.id===id);if(p){$('invSearch').value=p.name;onInventorySearch(p.name)}return}openTransaction(kind,id)}
function applyTheme(){const dark=localStorage.getItem('ragas_theme')==='dark';document.documentElement.dataset.theme=dark?'dark':'light';if($('themeBtn'))$('themeBtn').textContent=dark?'☀':'◐'}
function toggleTheme(){localStorage.setItem('ragas_theme',document.documentElement.dataset.theme==='dark'?'light':'dark');applyTheme()}
applyTheme();
async function uploadUnifiedLogo(input){const file=input.files?.[0];if(!file)return;const label=input.closest('.unifiedLogoDrop');label?.classList.add('uploading');try{for(const kind of ['loadingLogo','favicon','desktopIcon','browserLogo']){const fd=new FormData();fd.append('kind',kind);fd.append('file',file);const r=await api('/settings/branding',{method:'POST',body:fd});settings[kind]=r.url}applyBranding(settings);showToast('Business logo updated everywhere.')}catch(e){showToast(e.message,true)}finally{input.value='';label?.classList.remove('uploading')}}
function enhanceOperationalTables(){decorateTables();document.querySelectorAll('.tablewrap table').forEach(table=>{if(table.dataset.enhanced==='1')return;table.dataset.enhanced='1';[...table.querySelectorAll('thead th')].forEach((th,index)=>{if(!th.textContent.trim()||/action|detail/i.test(th.textContent))return;th.classList.add('sortable');th.title='Click to sort';th.onclick=()=>sortTable(table,index,th)});const wrap=table.closest('.tablewrap');if(wrap&&!wrap.previousElementSibling?.classList?.contains('tableTools')){const tools=document.createElement('div');tools.className='tableTools';tools.innerHTML='<button type="button" class="secondary small">Columns ▾</button><div class="columnMenu"></div>';wrap.parentNode.insertBefore(tools,wrap);const menu=tools.querySelector('.columnMenu');const hs=[...table.querySelectorAll('thead th')];menu.innerHTML=hs.map((h,i)=>`<label><input type="checkbox" data-col="${i}" checked> ${esc(h.textContent.trim()||'Column '+(i+1))}</label>`).join('');tools.querySelector('button').onclick=()=>menu.classList.toggle('open');menu.onchange=e=>{if(!e.target.matches('[data-col]'))return;const i=Number(e.target.dataset.col),show=e.target.checked;table.querySelectorAll('tr').forEach(tr=>{if(tr.children[i])tr.children[i].classList.toggle('colHidden',!show)})};}})}
function sortTable(table,index,th){const body=table.tBodies[0];if(!body)return;const rows=[...body.rows].filter(r=>!r.cells[0]?.hasAttribute('colspan'));const dir=th.dataset.sort==='asc'?'desc':'asc';table.querySelectorAll('th').forEach(x=>delete x.dataset.sort);th.dataset.sort=dir;const val=r=>r.cells[index]?.innerText.trim()||'';rows.sort((a,b)=>{const av=val(a).replace(/[₱,]/g,''),bv=val(b).replace(/[₱,]/g,'');const an=Number(av),bn=Number(bv);const cmp=Number.isFinite(an)&&Number.isFinite(bn)?an-bn:av.localeCompare(bv,undefined,{numeric:true});return dir==='asc'?cmp:-cmp});rows.forEach(r=>body.appendChild(r));}
function previewVoid(kind,id){const row=[...sales,...purchases,...collections,...supplierPayments,...cash].find(x=>x.id==id)||{};const amount=num(row.total||row.amount);if(confirm(`Reverse this transaction?\n\nTransaction: ${kind} #${id}\nRecorded amount: ${money(amount)}\n\nRAGAS will create the linked reversal effects and preserve the audit trail. Historical accounting date rules remain enforced.`))voidTransaction(kind,id)}
function installKeyboardShortcuts(){document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));closeMoreSheet();return}const tag=(e.target?.tagName||'').toLowerCase(),typing=['input','textarea','select'].includes(tag);if(e.key==='/'&&!typing){e.preventDefault();openGlobalSearch();return}if(e.altKey&&!typing){const k=e.key.toLowerCase();if(k==='s'){e.preventDefault();goPage('sales')}if(k==='p'){e.preventDefault();goPage('purchases')}if(k==='i'){e.preventDefault();goPage('inventory')}if(k==='f'){e.preventDefault();goPage('finance')}}});}
installKeyboardShortcuts();
try{financeTab(localStorage.getItem('ragas_fin_tab')||'receivables');salesTab(localStorage.getItem('ragas_sales_tab')||'new');purchaseTab(localStorage.getItem('ragas_purchase_tab')||'new')}catch{}
if($('saleCustomer')&&!$('saleCustomer').value)$('saleCustomer').value='Walk-in Customer';
setInterval(()=>{if($('settings')?.classList.contains('active')&&$('setPane-notifications')?.classList.contains('active'))loadSmsHistory().catch?.(()=>{})},30000);

/* ==========================================================================
   RAGAS v6.0 — RBAC, secure settings, accounting periods and UAT operations
   ========================================================================== */
let currentUser=null;
let operationalReceivables={total:0,customers:[],sales:[],unallocated:[]};
let transactionHistoryRows=[];
function isSuperAdmin(){return String(currentUser?.role||'').toUpperCase()==='SUPERADMIN'}
function isProjectManager(){return String(currentUser?.role||'').toUpperCase()==='PROJECT_MANAGER'}
function requireAdminUi(){if(!isSuperAdmin()){showToast('Super Admin permission is required for that control.',true);return false}return true}
function roleLabel(){return isSuperAdmin()?'SUPER ADMIN':'PROJECT MANAGER'}
function v6Icon(kind){return kind==='history'?UI_ICONS.reports:kind==='administration'?UI_ICONS.settings:(navMeta(kind)?.[2]||UI_ICONS.dashboard)}
function applyRoleUi(){
  document.body.dataset.role=currentUser?.role||'';
  const badge=$('userRoleBadge');if(badge){const who=currentUser?.fullName||currentUser?.username||'Current User';badge.textContent=`${who} · ${roleLabel()}`;badge.title=`Signed in as ${currentUser?.username||who}`}
  const adminPages=['reports','administration','settings'];
  adminPages.forEach(id=>$(id)?.classList.toggle('adminOnly',true));
  const items=isSuperAdmin()
    ? [['Workspace',['dashboard','sales','purchases','inventory','finance']],['Insights',['reports']],['Administration',['administration','settings']]]
    : [['Workspace',['dashboard','sales','purchases','inventory','finance','history']]];
  const meta={dashboard:['Dashboard',UI_ICONS.dashboard],sales:['Sales',UI_ICONS.sales],purchases:['Purchases',UI_ICONS.purchases],inventory:['Inventory',UI_ICONS.inventory],finance:['Finance',UI_ICONS.finance],reports:['Reports',UI_ICONS.reports],administration:['Administration',UI_ICONS.settings],settings:['Settings',UI_ICONS.settings],history:['Transaction History',UI_ICONS.reports]};
  const btn=(id,active=false)=>`<button class="${active?'active':''}" data-page="${id}" title="${meta[id][0]}" aria-label="${meta[id][0]}" onclick="goPage('${id}')"><span class="navIcon">${meta[id][1]}</span><span class="navLabel">${meta[id][0]}</span></button>`;
  $('nav').innerHTML=items.map(([g,ids])=>`<div class="navGroup">${g}</div>${ids.map(id=>btn(id,id==='dashboard')).join('')}`).join('');
  const primary=isSuperAdmin()?['dashboard','sales','purchases','inventory']:['dashboard','sales','purchases','inventory'];
  MOBILE_PRIMARY.splice(0,MOBILE_PRIMARY.length,...primary);
  $('mobileNav').innerHTML=primary.map(id=>btn(id,id==='dashboard')).join('')+`<button data-page="__more" onclick="openMoreSheet()"><span class="navIcon">•••</span><span class="navLabel">More</span></button>`;
  const all=items.flatMap(x=>x[1]);$('moreSheetGrid').innerHTML=all.filter(id=>!primary.includes(id)).map(id=>btn(id)).join('');
  document.querySelectorAll('.adminOnly').forEach(el=>{if(!isSuperAdmin())el.classList.add('roleHidden');else el.classList.remove('roleHidden')});
  if($('booksBadge'))$('booksBadge').classList.toggle('hidden',!isSuperAdmin());
}
const v6BaseShowPage=showPage;
showPage=function(id){
  if(!isSuperAdmin()&&['reports','administration','settings'].includes(id)){showToast('This area is restricted to Super Admin.',true);id='dashboard'}
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));const page=$(id);if(!page)return;page.classList.add('active');
  document.querySelectorAll('#nav button,#mobileNav button,#moreSheetGrid button').forEach(x=>x.classList.toggle('active',x.dataset.page===id));if(!MOBILE_PRIMARY.includes(id))document.querySelector('#mobileNav button[data-page="__more"]')?.classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  if(id==='reports'&&isSuperAdmin())applyReportPeriod();
  if(id==='settings'&&isSuperAdmin()){renderSettings();loadIntegrationCredentials();loadSmsSettings();loadSmsHistory();loadSystemHealth().catch?.(()=>{})}
  if(id==='administration'&&isSuperAdmin()){loadUsersAdmin();loadAccountingPeriods();loadApprovalQueue();loadSecurityAudit()}
  if(id==='history')loadTransactionHistory();
  if(id==='dashboard'&&isSuperAdmin())loadAnalytics();
  if(id==='inventory'){renderInvTabs();refreshQueueCount().catch(()=>{})}
  if(id==='finance')renderLoansFinance();
};
boot=async function(){
  if(!token()){showAuth();return false}
  try{
    const me=await api('/auth/me');currentUser=me.user||null;applyRoleUi();
    const st=isSuperAdmin()?await api('/settings'):await api('/settings/public');settings=st.settings||{};applyBranding(settings);writeCachedBranding(publicBrandSubset(settings));preloadCriticalBranding(settings);
    showAppShell();showInvTab(invTab,false);loadCarts();connectRealtime().catch(()=>{});await load();refreshQueueCount().catch(()=>{});
    if(currentUser?.mustChangePassword)showToast('Your password is temporary. Change it from your account when convenient.',false);
    return true
  }catch(e){if(!token())showAuth();else showToast(e.message,true);return false}
};
doLogin=async function(e){e.preventDefault();const loginError=$('loginError');if(loginError)loginError.classList.add('hidden');try{const r=await api('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('loginUsername')?.value||'admin',password:$('loginPassword').value})});localStorage.setItem('vege_owner_token',r.token);currentUser=r.user||null;const lp=$('loginPassword');if(lp)lp.value='';await boot()}catch(err){if(loginError){loginError.textContent=err.message;loginError.classList.remove('hidden')}else showToast(err.message,true)}return false};
const v6BaseLogout=logout;
logout=async function(){try{await api('/auth/logout',{method:'POST'})}catch{}currentUser=null;localStorage.removeItem('vege_owner_token');document.body.dataset.role='';showAuth()};
const v6BaseLoad=load;
load=async function(){
  if(loadPromise)return loadPromise;
  if(isSuperAdmin())return v6BaseLoad();
  loadPromise=(async()=>{try{
    const payDate=$('payableDate')?.value||today;let arDetail,apDetail,counts;
    [products,cash,sales,salesReturns,purchases,collections,supplierPayments,alerts,arDetail,apDetail,salesConfig,outlets,outletStock,counts,recentActivity]=await Promise.all([
      api('/products'+(showArchived?'?includeArchived=1':'')),api(perfUrl('/cash')),api(perfUrl('/sales')),api('/sales-returns'),api(perfUrl('/purchases')),api(perfUrl('/collections')),api(perfUrl('/supplier-payments')),api('/alerts'),api(`/reports/detail?type=receivables&to=${encodeURIComponent(payDate)}`),api(`/reports/detail?type=payables&to=${encodeURIComponent(payDate)}`),api('/sales/config'),api('/outlets'),api(`/inventory/outlet-stock?to=${ALL_REPORT_TO}`),api('/dashboard-counts'),api('/activity?limit=15')
    ]);
    markPerfMore('cash',cash);markPerfMore('sales',sales);markPerfMore('purchases',purchases);markPerfMore('collections',collections);markPerfMore('supplierPayments',supplierPayments);
    operationalReceivables=arDetail.report||{total:0,customers:[],sales:[],unallocated:[]};payableOptions=apDetail.report||{total:0,suppliers:[],purchases:[],payments:[]};payableOptionsDate=payDate;dashboardCounts=counts||dashboardCounts;dashboardReportCache=null;reportCache=null;
    outlets=Array.isArray(outlets)?outlets:(Array.isArray(outlets?.rows)?outlets.rows:Array.isArray(outlets?.outlets)?outlets.outlets:[]);outletStock=Array.isArray(outletStock)?outletStock:(Array.isArray(outletStock?.rows)?outletStock.rows:Array.isArray(outletStock?.data)?outletStock.data:[]);
    render();renderDashboard();updateCreditDiscountUI();renderAlerts();loadSpoilageQueue().catch(()=>{});setSync('Synced');
  }catch(e){setSync('Offline / API error',true);throw e}finally{loadPromise=null}})();return loadPromise
};
const v6BaseRenderKpis=renderKpis,v6BaseRenderAlerts=renderAlerts,v6BaseRenderDashboard=renderDashboard;
renderKpis=function(){if(isSuperAdmin())return v6BaseRenderKpis();const el=$('kpiStrip');if(!el)return;const todaySales=dashboardCounts.todaySales!==undefined?num(dashboardCounts.todaySales):sales.filter(x=>String(x.date)===today).reduce((a,x)=>a+num(x.total),0);const ar=num(operationalReceivables.total),ap=num(payableOptions.total),stock=products.reduce((a,p)=>a+num(p.stock_qty),0),low=num((alerts||{}).counts?.low_stock);const stat=(label,value,foot,action,cls='')=>`<button type="button" class="stat ${cls}" onclick="${action}"><div class="statLabel">${label}</div><div class="statValue">${value}</div><div class="statFoot">${foot}<span class="statArrow">→</span></div></button>`;el.innerHTML=[stat("Today's Sales",money(todaySales),'Open sales history',"goPage('sales');salesTab('history')"),stat('Receivables Due',money(ar),'Customer balances',"goFinanceTab('receivables')",ar>0?'needs':''),stat('Payables Due',money(ap),'Supplier balances',"goFinanceTab('payables')",ap>0?'needs':''),stat('Stock Units',stock.toFixed(3),'Current product quantity',"goPage('inventory')"),stat('Low Stock',String(low),'Products to review',"goPage('inventory')",low>0?'warn':'')].join('')};
renderAlerts=function(){if(isSuperAdmin())return v6BaseRenderAlerts();const c=(alerts||{}).counts||{},ar=num(operationalReceivables.total),ap=num(payableOptions.total);const items=[{sev:c.expired?'danger':'ok',icon:'⏱',title:'Expired stock',value:num(c.expired),desc:c.expired?'Review expired stock queue.':'No expired lots waiting.',action:c.expired?"goPage('inventory','queue')":''},{sev:c.low_stock?'warn':'ok',icon:'▥',title:'Low stock',value:num(c.low_stock),desc:c.low_stock?'Products are at/below reorder level.':'Stock levels look normal.',action:c.low_stock?"goPage('inventory')":''},{sev:ar>0?'info':'ok',icon:'₱',title:'Customer receivables',value:money(ar),desc:'Open operational customer balances.',action:ar>0?"goFinanceTab('receivables')":''},{sev:ap>0?'info':'ok',icon:'₱',title:'Supplier payables',value:money(ap),desc:'Open operational supplier balances.',action:ap>0?"goFinanceTab('payables')":''}];$('alertPanel').innerHTML=`<div class="attentionGrid">${items.map(i=>{const inner=`<span class="attentionIcon">${i.icon}</span><span><b>${i.title}</b><strong>${i.value}</strong><small>${i.desc}</small></span>${i.action?'<em>Review →</em>':'<em>Clear ✓</em>'}`;return i.action?`<button type="button" class="attentionItem ${i.sev}" onclick="${i.action}">${inner}</button>`:`<div class="attentionItem ${i.sev}">${inner}</div>`}).join('')}</div>`};
renderDashboard=function(){if(isSuperAdmin())return v6BaseRenderDashboard();if($('booksBadge'))$('booksBadge').classList.add('hidden');renderKpis();const health=$('dashboardHealth');if(health)health.innerHTML='<div class="healthItem good"><span class="healthDot"></span><b>Operational Workspace</b><span>Transaction entry, stock and payment follow-up. Accounting administration is Super Admin-controlled.</span></div>';const card=(title,value,desc,action)=>`<button type="button" class="card reportCard modernReportCard" onclick="${action}"><div class="muted">${title}</div><div class="final-value">${value}</div><div class="dashboardExplain">${desc}</div><span class="cardLink">Open →</span></button>`;const todayPurch=purchases.filter(x=>String(x.date)===today).reduce((a,x)=>a+num(x.total),0);$('reportEntryCards').innerHTML=[card('Sales Transactions',String(num(dashboardCounts.sales)),'Record sales and review customer transactions.',"goPage('sales')"),card('Purchases',money(todayPurch),"Today's purchases and supplier activity.","goPage('purchases')"),card('Transaction History',String(num(dashboardCounts.cash)+num(dashboardCounts.sales)+num(dashboardCounts.purchases)+num(dashboardCounts.collections)+num(dashboardCounts.supplierPayments)),'Trace posted operational records.',"goPage('history')")].join('');renderAlerts()};
const v6BaseProductRow=productRow;
productRow=function(p){const row=v6BaseProductRow(p);if(!isSuperAdmin()){row[row.length-1]=`<div class="rowActs"><button class="iconBtn" title="Show lots / batches" aria-label="Show lots" onclick="toggleLots(${p.id})">${expandedLots.has(p.id)?'▾':'▸'} Lots</button></div>`}return row};
for(const name of ['startProductRow','archiveProductRow','deleteProductRow','openProduct','openImportHub','openOutletModal']){try{const original=window[name]||eval(name);window['v6_'+name]=original;window[name]=function(...args){if(!requireAdminUi())return;return original(...args)}}catch{}}
const v6BaseVoidTransaction=voidTransaction;
voidTransaction=async function(kind,id){try{const reason=isProjectManager()?prompt('Reason for reversal request:','Training correction'):'Owner reversal';if(isProjectManager()&&!reason)return;const r=await api(`/transactions/${encodeURIComponent(kind)}/${id}/void`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:reason||'Owner reversal'})});if(r?.status==='PENDING'||r?.requestId){showToast('Reversal request submitted for Super Admin approval.')}else showToast('Linked reversal posted.');await load()}catch(e){showToast(e.message,true)}};
async function loadTransactionHistory(){try{transactionHistoryRows=await api('/activity?limit=300');renderTransactionHistory($('historySearch')?.value||'')}catch(e){$('transactionHistoryTable').innerHTML=`<div class="notice bad">${esc(e.message)}</div>`}}
function renderTransactionHistory(q=''){const el=$('transactionHistoryTable');if(!el)return;const n=String(q||'').toLowerCase().trim();const rows=(transactionHistoryRows||[]).filter(r=>!n||JSON.stringify(r).toLowerCase().includes(n));el.innerHTML=tab(['Date','Type','Party / Category','Amount','Detail'],rows.map(r=>[esc(r.date),esc(String(r.type||'').replace('_',' ')),esc(r.label||r.detail||'—'),money(r.amount),`<button class="secondary small" onclick="openTransaction('${r.source==='sales'?'sale':r.source==='purchases'?'purchase':r.source==='collections'?'collection':r.source==='supplier_payments'?'supplier_payment':'cash'}',${r.id})">Open</button>`]),'No matching transactions')}
function adminTab(key){if(!requireAdminUi())return;document.querySelectorAll('#adminTabs [data-admintab]').forEach(b=>b.classList.toggle('active',b.dataset.admintab===key));document.querySelectorAll('[data-adminpane]').forEach(p=>p.classList.toggle('active',p.dataset.adminpane===key));if(key==='users')loadUsersAdmin();if(key==='periods')loadAccountingPeriods();if(key==='approvals')loadApprovalQueue();if(key==='audit')loadSecurityAudit()}
async function loadUsersAdmin(){if(!isSuperAdmin())return;try{const r=await api('/users');const rows=r.users||r;const el=$('usersAdminTable');el.innerHTML=tab(['User','Username','Role','Status','Last Login','Actions'],rows.map(u=>[esc(u.full_name||u.fullName||'—'),esc(u.username),`<span class="tag">${esc(u.role)}</span>`,u.active?'<span class="tag good">Active</span>':'<span class="tag bad">Inactive</span>',esc(u.last_login_at||u.lastLoginAt||'—'),`<button class="secondary small" onclick="toggleUserActive(${u.id},${u.active?0:1})">${u.active?'Deactivate':'Reactivate'}</button> <button class="secondary small" onclick="resetUserPassword(${u.id},'${esc(String(u.username)).replace(/'/g,"\\'")}')">Reset Password</button>`]))}catch(e){$('usersAdminTable').innerHTML=`<div class="notice bad">${esc(e.message)}</div>`}}
async function createUser(){try{const body={fullName:$('newUserFullName').value,username:$('newUserUsername').value,role:$('newUserRole').value,password:$('newUserPassword').value};await api('/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});$('newUserFullName').value=$('newUserUsername').value=$('newUserPassword').value='';showToast('User created.');loadUsersAdmin()}catch(e){showToast(e.message,true)}}
async function toggleUserActive(id,active){try{await api(`/users/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:Boolean(active)})});showToast(active?'User reactivated.':'User deactivated.');loadUsersAdmin()}catch(e){showToast(e.message,true)}}
async function resetUserPassword(id,username){const password=prompt(`Temporary password for ${username}:`);if(!password)return;try{await api(`/users/${id}/reset-password`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});showToast('Temporary password saved.')}catch(e){showToast(e.message,true)}}
async function loadAccountingPeriods(){if(!isSuperAdmin())return;try{const year=String($('periodYear')?.value||new Date().getFullYear());const r=await api(`/accounting-periods?year=${encodeURIComponent(year)}`);const by=new Map((r.periods||[]).map(x=>[x.period_key,x]));const rows=[];for(let m=1;m<=12;m++){const key=`${year}-${String(m).padStart(2,'0')}`,x=by.get(key)||{period_key:key,status:'OPEN'};rows.push([key,`<select id="period_${key}"><option${x.status==='OPEN'?' selected':''}>OPEN</option><option${x.status==='RECONCILING'?' selected':''}>RECONCILING</option><option${x.status==='CLOSED'?' selected':''}>CLOSED</option><option${x.status==='LOCKED'?' selected':''}>LOCKED</option></select>`,`<button class="secondary small" onclick="setAccountingPeriod('${key}')">Save</button>`])}$('periodTable').innerHTML=tab(['Period','Status','Action'],rows)}catch(e){$('periodTable').innerHTML=`<div class="notice bad">${esc(e.message)}</div>`}}
async function setAccountingPeriod(key){try{const status=$(`period_${key}`).value;await api(`/accounting-periods/${key}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,notes:'Updated from RAGAS Administration'})});showToast(`${key} is now ${status}.`)}catch(e){showToast(e.message,true)}}
async function loadApprovalQueue(){if(!isSuperAdmin())return;try{const r=await api('/approval-queue?status=PENDING');const rows=r.requests||[];$('approvalQueueTable').innerHTML=tab(['ID','Requested By','Transaction','Reason','Requested At','Decision'],rows.map(x=>[x.id,esc(x.requester_name||x.requester_username||'—'),`${esc(x.transaction_type)} #${x.transaction_id}`,esc(x.reason||'—'),esc(x.requested_at||'—'),`<button class="primary small" onclick="decideReversal(${x.id},'APPROVE')">Approve</button> <button class="danger small" onclick="decideReversal(${x.id},'REJECT')">Reject</button>`]),'No pending reversal requests')}catch(e){$('approvalQueueTable').innerHTML=`<div class="notice bad">${esc(e.message)}</div>`}}
async function decideReversal(id,action){const note=prompt(`${action==='APPROVE'?'Approval':'Rejection'} note:`,action==='APPROVE'?'Reviewed and approved':'Not approved');if(note===null)return;try{await api(`/approval-queue/${id}/decision`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,note})});showToast(`Request ${action==='APPROVE'?'approved':'rejected'}.`);await loadApprovalQueue();await load()}catch(e){showToast(e.message,true)}}
async function loadSecurityAudit(){if(!isSuperAdmin())return;try{const r=await api('/security-audit?limit=200');$('securityAuditTable').innerHTML=tab(['Time','Action','Actor','Details'],(r.entries||[]).map(x=>[esc(x.created_at||'—'),esc(x.action||'—'),esc(x.actor_username||x.username||x.details?.username||'system'),`<code>${esc(JSON.stringify(x.details||{}))}</code>`]),'No security audit entries')}catch(e){$('securityAuditTable').innerHTML=`<div class="notice bad">${esc(e.message)}</div>`}}
async function loadIntegrationCredentials(){if(!isSuperAdmin())return;try{const r=await api('/settings/integrations'),s=r.smsgate||{};$('smsgateCredentialStatus').textContent=s.configured?'Configured ✓':'Not configured';$('credSmsUsername').value=s.username||'';$('credSmsPassword').value='';$('credSmsBaseUrl').value=s.baseUrl||'';$('credSmsSim').value=s.sim||'';$('credSmsExpedited').value=String(s.expedited!==false);if($('currentAccountSummary'))$('currentAccountSummary').innerHTML=`Signed in as <b>${esc(currentUser?.fullName||currentUser?.username||'')}</b> · ${esc(roleLabel())}` }catch(e){$('smsgateCredentialStatus').textContent='Could not load';showToast(e.message,true)}}
async function saveIntegrationCredentials(){try{const body={smsgate:{username:$('credSmsUsername').value,password:$('credSmsPassword').value,baseUrl:$('credSmsBaseUrl').value,sim:$('credSmsSim').value,expedited:$('credSmsExpedited').value==='true'}};await api('/settings/integrations',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});$('credSmsPassword').value='';showToast('Credentials encrypted and saved.');loadIntegrationCredentials()}catch(e){showToast(e.message,true)}}
async function testSmsgateCredentials(){const el=$('credentialTestResult');el.textContent='Testing…';try{const r=await api('/settings/integrations/test-smsgate',{method:'POST'});el.textContent=r.result?.message||'SMSGate connection passed.'}catch(e){el.textContent=e.message;showToast(e.message,true)}}
async function changeMyPassword(){const cur=$('currentPassword').value,n=$('newPassword').value,c=$('confirmNewPassword').value;if(n!==c){showToast('New passwords do not match.',true);return}try{await api('/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:cur,newPassword:n})});$('currentPassword').value=$('newPassword').value=$('confirmNewPassword').value='';showToast('Password changed successfully.')}catch(e){showToast(e.message,true)}}
async function resetTransactionalData(){const password=$('resetPassword')?.value||'',confirmation=($('resetConfirmation')?.value||'').trim();if(!password||confirmation!=='RESET TRANSACTIONAL DATA'){showToast('Enter your password and type RESET TRANSACTIONAL DATA exactly.',true);return}if(!confirm('This will clear transactional/operational records while preserving users, settings, encrypted credentials and master records. A safety backup is created automatically. Continue?'))return;$('resetStatus').textContent='Creating safety backup and resetting transactions…';try{const r=await api('/admin/reset-transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,confirmation})});$('resetPassword').value=$('resetConfirmation').value='';$('resetStatus').textContent=`${r.message} Safety backup: ${r.safetyBackup||'created'}`;const health=await api('/health');if(!health?.ok)throw Error('Reset completed but backend health verification did not pass.');if(!realtimeConnection?.connected)await connectRealtime().catch(()=>{});showToast('Transactional reset completed. Backend remains online.');await load();setSync(realtimeConnection?.connected?'Synced':'Connected')}catch(e){$('resetStatus').textContent=e.message;showToast(e.message,true)}}
const v6BaseRenderSettings=renderSettings;
renderSettings=function(){v6BaseRenderSettings();if($('setCreditDiscount'))$('setCreditDiscount').value=num(settings.creditSalesDiscountPercent??salesConfig.creditDiscountPercent);if($('currentAccountSummary')&&currentUser)$('currentAccountSummary').innerHTML=`Signed in as <b>${esc(currentUser.fullName||currentUser.username)}</b> · ${esc(roleLabel())}`};
saveSettings=async function(){try{const pick=id=>$(id+'Text').value||$(id).value;const r=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:{companyName:$('setCompanyName').value,tagline:$('setTagline').value,primaryColor:pick('setPrimaryColor'),secondaryColor:pick('setSecondaryColor'),backgroundColor:pick('setBackgroundColor'),creditSalesDiscountPercent:num($('setCreditDiscount').value)}})});settings=r.settings;salesConfig.creditDiscountPercent=num(settings.creditSalesDiscountPercent??salesConfig.creditDiscountPercent);applyBranding(settings);showToast('Business settings saved.')}catch(e){showToast(e.message,true)}};

initializeApp().catch(err=>{setSync('Startup recovered',true);hideBrandSplash();showAuth()});if('serviceWorker' in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(reg=>{reg.update().catch(()=>{});setTimeout(refreshInstallUi,0)}).catch(()=>{});}

/* ---- desktop settings tabs (view-only; no data reloads on switch) ---- */
function settingsTab(key){
  const tabs=[...document.querySelectorAll('#settingsTabs .setTab')];
  if(!tabs.length)return;
  if(!tabs.some(t=>t.dataset.settab===key))key=tabs[0].dataset.settab;
  tabs.forEach(t=>{const on=t.dataset.settab===key;t.classList.toggle('active',on);t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1});
  document.querySelectorAll('#settingsPanes .setPane').forEach(p=>p.classList.toggle('active',p.dataset.setpane===key));
  const activeTab=document.getElementById('setTab-'+key);
  try{activeTab?.scrollIntoView({block:'nearest',inline:'center'})}catch{}
  try{localStorage.setItem('vege_settings_tab',key)}catch{}
}
document.getElementById('settingsTabs')?.addEventListener('keydown',e=>{
  const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(e.key))return;
  const tabs=[...document.querySelectorAll('#settingsTabs .setTab')];
  const cur=tabs.findIndex(t=>t.classList.contains('active'));if(cur<0)return;
  let next=cur;
  if(e.key==='ArrowLeft')next=(cur-1+tabs.length)%tabs.length;
  if(e.key==='ArrowRight')next=(cur+1)%tabs.length;
  if(e.key==='Home')next=0;
  if(e.key==='End')next=tabs.length-1;
  e.preventDefault();settingsTab(tabs[next].dataset.settab);tabs[next].focus();
});
try{let savedTab=localStorage.getItem('vege_settings_tab');if(['receipt','sms','smslog'].includes(savedTab))savedTab='notifications';if(savedTab==='backup')savedTab='system';if(savedTab)settingsTab(savedTab)}catch{}

/* ---- desktop sidebar collapse (rail) ---- */
function toggleDeskNav(){
  const on=!document.body.classList.contains('navRail');
  document.body.classList.toggle('navRail',on);
  const b=document.getElementById('navCollapseBtn');
  if(b){b.setAttribute('aria-label',on?'Expand navigation':'Collapse navigation');b.title=b.getAttribute('aria-label')}
  try{localStorage.setItem('vege_nav_rail',on?'1':'0')}catch{}
}
try{if(localStorage.getItem('vege_nav_rail')==='1'){document.body.classList.add('navRail');const b=document.getElementById('navCollapseBtn');if(b){b.setAttribute('aria-label','Expand navigation');b.title='Expand navigation'}}}catch{}

/* ==========================================================================
   v6.0 interaction polish — traceability, pagination and inline validation
   ========================================================================== */
const v58BaseOpenTransaction = openTransaction;
openTransaction = async function(kind,id){
  await v58BaseOpenTransaction(kind,id);
  const body=$('transactionBody');
  if(!body||body.querySelector('.transactionSectionTitle'))return;
  const grid=body.querySelector(':scope > .detailGrid');
  if(grid){
    const h=document.createElement('div');h.className='transactionSectionTitle';h.innerHTML='<b>Transaction</b><span>Human-readable source details and reference information.</span>';grid.before(h);
  }
  body.querySelectorAll(':scope > .tree').forEach(tree=>{
    const title=(tree.querySelector('h3')?.textContent||'').toLowerCase();
    if(title.includes('accounting'))tree.classList.add('accountingSection');
    if(title.includes('correction'))tree.classList.add('correctionSection');
    if(title.includes('loan'))tree.classList.add('loanSection');
  });
};

const v58BaseEnhanceTables=enhanceOperationalTables;
enhanceOperationalTables=function(){
  v58BaseEnhanceTables();
  document.querySelectorAll('.tablewrap table').forEach(table=>{
    const body=table.tBodies[0]; if(!body)return;
    const rows=[...body.rows].filter(r=>!r.cells[0]?.hasAttribute('colspan'));
    if(rows.length<=50||table.dataset.paged==='1')return;
    table.dataset.paged='1'; table.dataset.visibleRows='50';
    rows.forEach((r,i)=>r.classList.toggle('uiRowHidden',i>=50));
    const wrap=table.closest('.tablewrap'), tools=wrap?.previousElementSibling;
    if(!tools?.classList.contains('tableTools'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='secondary small loadMoreRows';
    btn.textContent=`Load more (${Math.min(50,rows.length-50)} of ${rows.length-50})`;
    btn.onclick=()=>{
      const all=[...body.rows].filter(r=>!r.cells[0]?.hasAttribute('colspan'));
      const current=Number(table.dataset.visibleRows||50),next=Math.min(all.length,current+50);
      all.forEach((r,i)=>r.classList.toggle('uiRowHidden',i>=next));table.dataset.visibleRows=String(next);
      const left=all.length-next;if(left<=0)btn.remove();else btn.textContent=`Load more (${Math.min(50,left)} of ${left})`;
    };
    tools.prepend(btn);
  });
};

const v58BaseSortTable=sortTable;
sortTable=function(table,index,th){
  v58BaseSortTable(table,index,th);
  const body=table.tBodies[0],visible=Number(table.dataset.visibleRows||0);
  if(body&&visible){[...body.rows].filter(r=>!r.cells[0]?.hasAttribute('colspan')).forEach((r,i)=>r.classList.toggle('uiRowHidden',i>=visible));}
};

renderLoansFinance=async function(){
  const el=$('loanFinanceSummary');if(!el)return;
  el.innerHTML='<div class="empty">Loading official loan balances…</div>';
  try{
    const r=await api(`/reports/detail?type=loans&from=1900-01-01&to=${encodeURIComponent(today)}`),x=r.report||{};
    const loans=x.loans||[];
    el.innerHTML=`<div class="detailGrid"><div class="metric"><div class="muted">Beginning Outstanding</div><div class="subvalue">${money(x.beginning_outstanding||0)}</div></div><div class="metric"><div class="muted">New Loans</div><div class="subvalue">${money(x.new_loans||0)}</div></div><div class="metric"><div class="muted">Principal Repaid</div><div class="subvalue">${money(x.principal_paid||0)}</div></div><div class="metric"><div class="muted">Official Outstanding</div><div class="final-value">${money(x.ending_outstanding||0)}</div></div><div class="metric"><div class="muted">Active Loans</div><div class="subvalue">${num(x.active_count||0)}</div></div><div class="metric"><div class="muted">Fully Paid</div><div class="subvalue">${num(x.fully_paid_count||0)}</div></div></div>${loans.length?tab(['Loan Ref','Date','Original','Paid','Outstanding','Status','Detail'],loans.map(l=>[esc(l.loan_id),esc(l.date),money(l.original_amount),money(l.paid_amount),money(l.outstanding_amount),`<span class="statusChip">${esc(l.status)}</span>`,l.source_id?`<button class="secondary small" onclick="openTransaction('cash',${l.source_id})">Open</button>`:''])):'<div class="emptyState"><b>No loan balances</b><span>Loan proceeds and principal repayments will appear here automatically.</span></div>'}`;
    enhanceOperationalTables();
  }catch(e){el.innerHTML=`<div class="notice bad">${esc(e.message||'Could not load loan balances.')}</div>`}
};

previewVoid=async function(kind,id){
  try{
    const r=await api(`/reports/transaction/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`),t=r.transaction||{},fx=r.accounting_effects||[];
    const amount=num(t.total||t.amount), lines=fx.slice(0,8).map(x=>`• Dr ${x.debit_account} / Cr ${x.credit_account}: ${money(x.amount)}`);
    let inventory='';
    if(kind==='sale'&&num(t.quantity)>0)inventory=`\n• Inventory quantity restored: ${num(t.quantity).toFixed(3)}`;
    if(kind==='purchase'&&num(t.quantity)>0)inventory=`\n• Purchased inventory quantity reversed: ${num(t.quantity).toFixed(3)} (subject to stock-safety validation)`;
    const impact=lines.length?`\n\nAccounting reversal preview:\n${lines.join('\n')}`:'';
    const ok=confirm(`Reverse this transaction?\n\n${String(kind).replace('_',' ')} #${id}\nRecorded amount: ${money(amount)}${inventory}${impact}\n\nA linked reversal will be created; the original record and audit trail remain intact.`);
    if(ok)voidTransaction(kind,id);
  }catch(e){showToast(e.message||'Could not preview reversal.',true)}
};

function clearFieldError(el){if(!el)return;el.classList.remove('fieldInvalid');const n=el.parentElement?.querySelector(':scope > .fieldError');if(n)n.remove()}
function markFieldError(el,msg){if(!el)return;clearFieldError(el);el.classList.add('fieldInvalid');const n=document.createElement('div');n.className='fieldError';n.textContent=msg;el.insertAdjacentElement('afterend',n)}
function validateField(el){
  if(!el||el.disabled||el.type==='hidden')return true;clearFieldError(el);
  if(el.required&&!String(el.value||'').trim()){markFieldError(el,'This field is required.');return false}
  if(el.type==='number'&&String(el.value||'').trim()){
    const v=Number(el.value),min=el.min===''?null:Number(el.min),max=el.max===''?null:Number(el.max);
    if(!Number.isFinite(v)){markFieldError(el,'Enter a valid number.');return false}
    if(min!==null&&v<min){markFieldError(el,`Minimum allowed is ${min}.`);return false}
    if(max!==null&&v>max){markFieldError(el,`Maximum allowed is ${max}.`);return false}
  }
  return true;
}
function installInlineFieldValidation(){
  document.querySelectorAll('input,select,textarea').forEach(el=>{
    if(el.dataset.inlineValidation==='1')return;el.dataset.inlineValidation='1';
    el.addEventListener('blur',()=>validateField(el));el.addEventListener('input',()=>{if(el.classList.contains('fieldInvalid'))validateField(el)});el.addEventListener('change',()=>{if(el.classList.contains('fieldInvalid'))validateField(el)});
  });
}
installInlineFieldValidation();
new MutationObserver(()=>installInlineFieldValidation()).observe(document.body,{childList:true,subtree:true});
