const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=n=>Number(n||0).toLocaleString('vi-VN')+'đ';
function toast(message,error=false){const e=$('#toast');if(!e)return;e.textContent=message;e.classList.toggle('error',error);e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),3200)}
async function api(action,data={}){const r=await fetch(`api.php?action=${encodeURIComponent(action)}`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});const j=await r.json().catch(()=>({ok:false,message:'Phản hồi server không hợp lệ.'}));if(!r.ok||!j.ok)throw new Error(j.message||'Có lỗi xảy ra.');return j}
$$('[data-delete-order]').forEach(btn=>btn.addEventListener('click',async()=>{if(!confirm('Xóa đơn này khỏi lịch sử? Số dư không được hoàn lại.'))return;try{loading(btn,true);await api('delete_order',{order_id:Number(btn.dataset.deleteOrder),csrf:window.HISTORY_CSRF||''});btn.closest('.order-receipt')?.remove();toast('Đã xóa đơn khỏi lịch sử.')}catch(err){toast(err.message,true)}finally{loading(btn,false)}}));
function loading(btn,state=true){if(!btn)return;btn.disabled=state;btn.classList.toggle('loading',state)}

// Header + reveal
addEventListener('scroll',()=>$('.topbar')?.classList.toggle('scrolled',scrollY>8),{passive:true});
const io='IntersectionObserver'in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.08}):null;
$$('.reveal').forEach(el=>io?io.observe(el):el.classList.add('visible'));

// Product search/filter/sort
let activeCategory='all';
const productGrid=$('#product-grid'), search=$('#product-search'), sort=$('#product-sort'), count=$('#product-count'), empty=$('#product-empty');
function refreshProducts(){if(!productGrid)return;const q=(search?.value||'').trim().toLocaleLowerCase('vi-VN');let visible=$$('.product',productGrid).filter(p=>{const okCat=activeCategory==='all'||p.dataset.category===activeCategory;const okText=!q||p.textContent.toLocaleLowerCase('vi-VN').includes(q);p.classList.toggle('hidden',!(okCat&&okText));return okCat&&okText});if(sort){const mode=sort.value;const all=$$('.product',productGrid);all.sort((a,b)=>mode==='price-asc'?+a.dataset.price-+b.dataset.price:mode==='price-desc'?+b.dataset.price-+a.dataset.price:mode==='name'?a.dataset.name.localeCompare(b.dataset.name,'vi'):0).forEach(p=>productGrid.appendChild(p))}if(count)count.textContent=`${visible.length} sản phẩm`;empty?.classList.toggle('hidden',visible.length!==0)}
$$('[data-category-filter]').forEach(b=>b.addEventListener('click',()=>{$$('[data-category-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeCategory=b.dataset.categoryFilter;refreshProducts()}));
search?.addEventListener('input',refreshProducts);sort?.addEventListener('change',refreshProducts);$('#reset-products')?.addEventListener('click',()=>{if(search)search.value='';if(sort)sort.value='default';activeCategory='all';$$('[data-category-filter]').forEach((b,i)=>b.classList.toggle('active',i===0));refreshProducts()});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')){e.preventDefault();search?.focus()}});refreshProducts();

// Buy modal
const modal=$('#buy-modal');let pendingBuy=null;
function closeModal(){modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');document.body.classList.remove('body-lock');pendingBuy=null}
function openBuy(btn){if(!window.APP_USER){location.href='dangnhap.php?next=index.php';return}pendingBuy=btn;$('#buy-modal-title').textContent=btn.dataset.name;$('#buy-modal-desc').textContent=btn.dataset.desc||'';$('#buy-modal-price').textContent=money(btn.dataset.price);$('#buy-modal-category').textContent=btn.dataset.category||'Sản phẩm';modal?.classList.add('open');modal?.setAttribute('aria-hidden','false');document.body.classList.add('body-lock');setTimeout(()=>$('#confirm-buy')?.focus(),80)}
$$('[data-buy]').forEach(b=>b.addEventListener('click',()=>openBuy(b)));$$('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModal));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal?.classList.contains('open'))closeModal()});
$('#confirm-buy')?.addEventListener('click',async e=>{if(!pendingBuy)return;const btn=e.currentTarget;try{loading(btn,true);const r=await api('buy',{product_id:pendingBuy.dataset.buy});toast(r.message);closeModal();setTimeout(()=>location.href='lichsu.php',650)}catch(err){toast(err.message,true)}finally{loading(btn,false)}});

// Recharge method tabs
const bankTab=$('#tab-bank'),giftTab=$('#tab-gift'),bankPanel=$('#panel-bank'),giftPanel=$('#panel-gift');
function switchMethod(type){if(!bankTab)return;const bank=type==='bank';bankPanel.classList.toggle('hidden',!bank);giftPanel.classList.toggle('hidden',bank);bankTab.classList.toggle('active',bank);giftTab.classList.toggle('active',!bank)}
bankTab?.addEventListener('click',()=>switchMethod('bank'));giftTab?.addEventListener('click',()=>switchMethod('gift'));
$$('[data-amount]').forEach(b=>b.addEventListener('click',()=>{$$('[data-amount]').forEach(x=>x.classList.remove('active'));b.classList.add('active');const i=$('#bank-amount');if(i){i.value=b.dataset.amount;i.dispatchEvent(new Event('input'))}}));
$('#bank-amount')?.addEventListener('input',()=>{$$('[data-amount]').forEach(b=>b.classList.toggle('active',b.dataset.amount===$('#bank-amount').value))});

let autoCheckTimer=null,countdownTimer=null,invoiceTimer=null,countdown=10,invoiceSeconds=900;
function stopAutoCheck(){clearInterval(autoCheckTimer);clearInterval(countdownTimer);clearInterval(invoiceTimer);autoCheckTimer=countdownTimer=invoiceTimer=null}
function renderInvoiceTime(){const el=$('#invoice-countdown');if(!el)return;const m=String(Math.floor(invoiceSeconds/60)).padStart(2,'0'),s=String(invoiceSeconds%60).padStart(2,'0');el.textContent=m+':'+s}
function expireInvoiceUI(){stopAutoCheck();$('.payment-state')?.classList.remove('paid');$('.payment-state')?.classList.add('expired');$('#bank-status-title').textContent='Hóa đơn đã hết hạn';$('#bank-status').textContent='Vui lòng tạo mã thanh toán mới.';const b=$('#check-bank');if(b)b.disabled=true}
function startAutoCheck(seconds=900){stopAutoCheck();countdown=10;invoiceSeconds=Math.max(0,Number(seconds)||0);renderInvoiceTime();if(invoiceSeconds<=0){expireInvoiceUI();return}const out=$('#check-countdown');if(out)out.textContent=countdown;countdownTimer=setInterval(()=>{countdown--;if(out)out.textContent=Math.max(0,countdown);if(countdown<=0){countdown=10;if(out)out.textContent=countdown;checkBank(true)}},1000);invoiceTimer=setInterval(()=>{invoiceSeconds=Math.max(0,invoiceSeconds-1);renderInvoiceTime();if(invoiceSeconds<=0)expireInvoiceUI()},1000)}
function renderBankInvoice(r,{resume=false}={}){const id=$('#bank-recharge-id');if(id)id.value=r.recharge_id||'';const amount=$('#bank-amount');if(amount)amount.value=r.amount||'';$('#bank-note').textContent=r.transfer_code||'';$('#bank-name').textContent=r.bank_name||'MBBank';$('#bank-account').textContent=r.bank_account||'';const qr=$('#bank-qr'),frame=qr?.closest('.qr-frame');frame?.classList.add('qr-loading');if(qr){qr.onload=()=>frame?.classList.remove('qr-loading');qr.onerror=()=>{frame?.classList.remove('qr-loading');$('#bank-status').textContent='Không tải được mã QR. Vui lòng thử lại.';toast('Không tải được mã QR.',true)};qr.src=`https://img.vietqr.io/image/${encodeURIComponent(r.bank_qr_code||'MB')}-${encodeURIComponent(r.bank_account||'')}-compact.png?amount=${encodeURIComponent(r.amount||0)}&addInfo=${encodeURIComponent(r.transfer_code||'')}&accountName=${encodeURIComponent(r.bank_owner||'')}`;}$('#qr-wrap')?.classList.add('show');const checkBtn=$('#check-bank');if(checkBtn)checkBtn.disabled=false;$('.payment-state')?.classList.remove('paid','expired');$('#bank-status-title').textContent='Đang chờ thanh toán';$('#bank-status').textContent=resume?'Hóa đơn vẫn còn hiệu lực. Bạn có thể tiếp tục chuyển khoản.':'Đang chờ xác nhận giao dịch.';startAutoCheck(r.remaining_seconds??900);setTimeout(()=>$('#qr-wrap')?.scrollIntoView({behavior:'smooth',block:'center'}),120)}
$('#create-bank-request')?.addEventListener('click',async e=>{const btn=e.currentTarget,amount=Number($('#bank-amount').value||0);if(amount<10000){toast('Số tiền tối thiểu 10.000đ.',true);return}try{loading(btn,true);const r=await api('bank_create',{amount});renderBankInvoice(r);toast('Đã tạo mã QR thanh toán.')}catch(err){toast(err.message,true)}finally{loading(btn,false)}});
async function checkBank(silent=false){const recharge_id=Number($('#bank-recharge-id')?.value||0);if(!recharge_id)return;const btn=$('#check-bank'),icon=$('.auto-check i');try{if(!silent)loading(btn,true);icon?.classList.add('spinning');const r=await api('bank_check',{recharge_id});$('#bank-status').textContent=r.message;if(Number.isFinite(Number(r.remaining_seconds)))invoiceSeconds=Math.max(0,Number(r.remaining_seconds));renderInvoiceTime();if(r.expired){expireInvoiceUI();if(!silent)toast('Hóa đơn đã hết hạn.',true);return}if(r.paid){stopAutoCheck();$('.payment-state')?.classList.remove('expired');$('.payment-state')?.classList.add('paid');$('#bank-status-title').textContent='Đã nhận thanh toán';toast('Nạp tiền thành công.');setTimeout(()=>location.href='lichsu.php?tab=recharge',850)}}catch(err){if(!silent){$('#bank-status').textContent=err.message;toast(err.message,true)}}finally{if(!silent)loading(btn,false);icon?.classList.remove('spinning')}}
$('#check-bank')?.addEventListener('click',()=>checkBank(false));
$('#copy-note')?.addEventListener('click',async e=>{const btn=e.currentTarget;try{await navigator.clipboard.writeText($('#bank-note').textContent);btn.classList.add('copied');btn.innerHTML='<i class="fa-solid fa-check"></i>';toast('Đã sao chép nội dung chuyển khoản.');setTimeout(()=>{btn.classList.remove('copied');btn.innerHTML='<i class="fa-regular fa-copy"></i>'},1600)}catch(err){toast('Không thể sao chép tự động.',true)}});
async function resumeBankInvoice(){const rid=Number($('#bank-recharge-id')?.value||0);if(!rid)return;try{switchMethod('bank');const r=await api('bank_invoice',{recharge_id:rid});if(r.paid){toast('Hóa đơn này đã thanh toán.');setTimeout(()=>location.href='lichsu.php?tab=recharge',500);return}if(r.expired){expireInvoiceUI();$('#qr-wrap')?.classList.add('show');return}renderBankInvoice(r,{resume:true});toast('Đã mở lại hóa đơn đang chờ.')}catch(err){toast(err.message,true)}}
resumeBankInvoice();
$('#gift-submit')?.addEventListener('click',async e=>{const btn=e.currentTarget,code=$('#gift-code').value.trim();if(!code){toast('Nhập mã Giftcode trước.',true);return}try{loading(btn,true);const r=await api('giftcode',{code});toast(`${r.message} +${money(r.amount)}`);setTimeout(()=>location.reload(),750)}catch(err){toast(err.message,true)}finally{loading(btn,false)}});

// History tabs
$$('[data-history-tab]').forEach(b=>b.addEventListener('click',()=>{const t=b.dataset.historyTab;$$('[data-history-tab]').forEach(x=>x.classList.toggle('active',x===b));$('#history-orders').style.display=t==='orders'?'grid':'none';$('#history-recharges').style.display=t==='recharge'?'grid':'none';history.replaceState(null,'',`lichsu.php?tab=${t==='recharge'?'recharge':'orders'}`)}));

// Auth / logout
async function refreshLoginCaptcha(){
 const btn=$('#refresh-captcha'),submit=$('#auth-submit');
 try{loading(btn,true);if(submit)submit.disabled=true;const r=await api('login_captcha');$('#captcha-question').textContent=r.question;$('#captcha-answer').value='';}
 catch(err){toast('Không tải được phép tính mới. Hãy bấm Đổi phép tính để thử lại.',true)}
 finally{loading(btn,false);if(submit)submit.disabled=false}
}
$('#refresh-captcha')?.addEventListener('click',refreshLoginCaptcha);
$('#auth-form')?.addEventListener('submit',async e=>{e.preventDefault();const btn=e.currentTarget.querySelector('[type=submit]'),f=new FormData(e.currentTarget),data=Object.fromEntries(f.entries());try{loading(btn,true);const r=await api(data.mode,data);toast(data.mode==='register'?'Tạo tài khoản thành công.':'Đăng nhập thành công.');setTimeout(()=>location.href=r.redirect||'index.php',350)}catch(err){toast(err.message,true);await refreshLoginCaptcha()}finally{loading(btn,false)}});
$('#logout')?.addEventListener('click',async e=>{const btn=e.currentTarget;try{loading(btn,true);const r=await api('logout');location.href=r.redirect}catch(err){toast(err.message,true);loading(btn,false)}});

// Small counter animation
$$('[data-counter-text]').forEach(el=>{const target=Number(el.dataset.counterText||0);if(!target||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const isMoney=el.dataset.money==='1',start=performance.now(),duration=200;const step=now=>{const p=Math.min(1,(now-start)/duration),v=Math.round(target*(1-Math.pow(1-p,3)));el.textContent=isMoney?money(v):v.toLocaleString('vi-VN');if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)});


// Product detail purchase
$('#detail-buy')?.addEventListener('click', async e=>{
  const btn=e.currentTarget, data=window.PRODUCT_DETAIL||{};
  if(!data.logged_in){location.href=data.login_url||'dangnhap.php';return;}
  try{loading(btn,true);const r=await api('buy',{product_id:data.id});toast(r.message);setTimeout(()=>location.href='lichsu.php',650)}catch(err){toast(err.message,true)}finally{loading(btn,false)}
});


// Page entrance + navigation progress
const finishPageLoad=()=>{document.body.classList.add('page-ready');setTimeout(()=>$('#page-loader')?.classList.add('done'),120)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finishPageLoad,{once:true});else finishPageLoad();setTimeout(finishPageLoad,1800);
$$('a[href]').forEach(a=>a.addEventListener('click',e=>{const h=a.getAttribute('href')||'';if(e.defaultPrevented||a.target==='_blank'||h.startsWith('#')||h.startsWith('javascript:')||e.ctrlKey||e.metaKey||e.shiftKey)return;if(h.startsWith('http')&&!h.startsWith(location.origin))return;$('#nav-progress')?.classList.add('run')}));

// Subtle button ripple
$$('.btn,.filter-btn,.method-tab,.quick-amounts button,.mobile-nav a').forEach(el=>el.addEventListener('pointerdown',e=>{const r=el.getBoundingClientRect(),dot=document.createElement('span');dot.className='ripple';dot.style.left=(e.clientX-r.left)+'px';dot.style.top=(e.clientY-r.top)+'px';el.appendChild(dot);setTimeout(()=>dot.remove(),620)}));

// Image load state
$$('img').forEach(img=>{if(img.complete)img.classList.add('img-ready');else img.addEventListener('load',()=>img.classList.add('img-ready'),{once:true})});

$$('[data-confirm]').forEach(f=>f.addEventListener('submit',e=>{if(!confirm(f.dataset.confirm||'Xác nhận thao tác?'))e.preventDefault()}));

// v11 resilient product images
$$('.js-product-image').forEach(img=>{
  const box=img.closest('.product-thumb,.product-detail-media');
  const markError=()=>{box?.classList.add('image-error');img.setAttribute('aria-hidden','true')};
  const markLoaded=()=>{box?.classList.remove('image-error');img.removeAttribute('aria-hidden');img.classList.add('img-ready')};
  img.addEventListener('error',markError);
  img.addEventListener('load',markLoaded);
  if(img.complete){if(img.naturalWidth>0)markLoaded();else if(img.loading!=='lazy')markError();}
});


// v15 fullscreen product image viewer
(()=>{
  const images=[...document.querySelectorAll('.product-detail-media .js-product-zoom')];
  if(!images.length) return;
  const lb=document.createElement('div');
  lb.className='product-lightbox';
  lb.setAttribute('role','dialog');
  lb.setAttribute('aria-modal','true');
  lb.setAttribute('aria-label','Xem ảnh sản phẩm toàn màn hình');
  lb.innerHTML='<button class="product-lightbox-close" type="button" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button><div class="product-lightbox-stage"><img alt=""></div><div class="product-lightbox-hint">Chạm 2 lần để phóng to • Nhấn × để đóng</div>';
  document.body.appendChild(lb);
  const view=lb.querySelector('img'), closeBtn=lb.querySelector('.product-lightbox-close'), stage=lb.querySelector('.product-lightbox-stage');
  let lastTap=0;
  const open=(source)=>{
    if(source.closest('.product-detail-media')?.classList.contains('image-error')) return;
    view.src=source.currentSrc||source.src;
    view.alt=source.alt||'Ảnh sản phẩm';
    view.classList.remove('is-zoomed');
    lb.classList.add('is-open');
    document.body.classList.add('lightbox-open');
    closeBtn.focus({preventScroll:true});
  };
  const close=()=>{
    lb.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    view.classList.remove('is-zoomed');
    setTimeout(()=>{if(!lb.classList.contains('is-open')) view.removeAttribute('src')},220);
  };
  const toggleZoom=()=>view.classList.toggle('is-zoomed');
  images.forEach(img=>{
    img.addEventListener('click',()=>open(img));
    img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(img)}});
  });
  closeBtn.addEventListener('click',close);
  lb.addEventListener('click',e=>{if(e.target===lb||e.target===stage) close()});
  view.addEventListener('click',e=>{e.stopPropagation();toggleZoom()});
  view.addEventListener('touchend',e=>{const now=Date.now();if(now-lastTap<320){e.preventDefault();toggleZoom()}lastTap=now},{passive:false});
  document.addEventListener('keydown',e=>{if(!lb.classList.contains('is-open'))return;if(e.key==='Escape')close();if(e.key==='Enter'&&document.activeElement===view)toggleZoom()});
})();
