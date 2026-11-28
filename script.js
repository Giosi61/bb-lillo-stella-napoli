(() => {
  'use strict';
  const form = document.querySelector('#booking-form');
  const checkin = document.querySelector('#checkin');
  const checkout = document.querySelector('#checkout');
  const room = document.querySelector('#room');
  const guests = document.querySelector('#guests');
  const payment = document.querySelector('#payment');
  const transfer = document.querySelector('#airport-transfer');
  const send = document.querySelector('#send-request');
  const error = document.querySelector('#booking-error');
  const status = document.querySelector('#booking-status');
  const t = (key, values) => window.siteI18n.t(key, values);
  const rooms = {matrimoniale:{name:'Camera Rossa Matrimoniale n. 3',price:40,max:3},singola:{name:'Camera uso misto Matrimoniale Single n. 2',price:30,max:3},balcone:{name:'Camera Matrimoniale armadio rosso e balcone n. 1',price:35,max:3}};
  const paymentNames = {full:'Carta o bonifico · prezzo pieno',cash:"Contanti all'ingresso · sconto 15%",deposit:'Acconto 20% e saldo in contanti · sconto 20%'};
  const dateString = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const nextDay = s => {const d = new Date(`${s}T12:00:00`);d.setDate(d.getDate()+1);return dateString(d);};
  const euros = n => new Intl.NumberFormat(window.siteI18n.locale,{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
  const fmtDate = s => new Date(`${s}T12:00:00`).toLocaleDateString(window.siteI18n.locale,{day:'2-digit',month:'short',year:'numeric'});
  const text = (id,value) => {document.getElementById(id).textContent=value;};
  // --- Festività nazionali italiane ---
  // Pasqua si calcola da sola per ogni anno, Pasquetta = Pasqua + 1 giorno
  function easterSunday(year){
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return dateString(new Date(year, month - 1, day));
  }
  function isNationalHoliday(ds){
    if(!ds) return false;
    const d = new Date(`${ds}T12:00:00`);
    const y = d.getFullYear();
    const fixed = [`${y}-01-01`,`${y}-01-06`,`${y}-04-25`,`${y}-05-01`,`${y}-06-02`,`${y}-08-15`,`${y}-11-01`,`${y}-12-08`,`${y}-12-25`,`${y}-12-26`];
    if(fixed.includes(ds)) return true;
    const easter = easterSunday(y);
    const easterMonday = nextDay(easter);
    return ds === easter || ds === easterMonday;
  }
  function countHolidayNights(checkinVal, nights){
    if(!checkinVal || !nights) return 0;
    let count = 0;
    for(let i = 0; i < nights; i++){
      const night = new Date(`${checkinVal}T12:00:00`);
      night.setDate(night.getDate() + i);
      const nightStr = dateString(night);
      const nextStr = dateString(new Date(night.getTime() + 86400000));
      // notte della festività OPPURE notte prima della festività
      if(isNationalHoliday(nightStr) || isNationalHoliday(nextStr)) count++;
    }
    return count;
  }
  let requestOpened = false;
  function update() {
    const today = dateString(new Date());
    checkin.min = today;
    checkout.min = nextDay(checkin.value && checkin.value >= today ? checkin.value : today);
    const r = rooms[room.value];
    Array.from(room.options).forEach(option => {const entry=rooms[option.value];option.textContent=`${t(entry.name)} — ${euros(entry.price)} ${t('/ notte')}`;});
    Array.from(guests.options).forEach(option => {option.disabled=Number(option.value)>r.max;});
    if (Number(guests.value)>r.max) guests.value='1';
    const count = Number(guests.value);
    const nights = checkin.value && checkout.value ? Math.round((Date.parse(checkout.value)-Date.parse(checkin.value))/86400000) : 0;
    const invalid = Boolean((checkin.value && checkin.value<today)||(checkout.value && checkout.value<checkout.min));
    const valid = nights>0 && !invalid;
    const n = valid ? nights : 0;
    // All monetary calculations use cents; city tax is itemized and never discounted.
    const roomCents=n*r.price*100, extraCents=count===3?n*2000:0, taxCents=n*count*500;
    const transferCents = (transfer && transfer.value === 'transfer') ? 1000 : 0;
    const holidayNights = valid ? countHolidayNights(checkin.value, n) : 0;
    const holidayCents = holidayNights * 500;
    const rate=payment.value==='cash'?.15:payment.value==='deposit'?.20:0;
    const discountCents=Math.round((roomCents+extraCents)*rate);
    const stayCents=roomCents+extraCents-discountCents;
    const totalCents=stayCents+taxCents+transferCents+holidayCents;
    const depositCents=payment.value==='deposit'?Math.round(stayCents*.20):0;
    document.getElementById('extra-guest-row').hidden=!valid||count!==3;
    document.getElementById('discount-row').hidden=!valid||rate===0;
    const holidayRow = document.getElementById('holiday-row');
    if (holidayRow) holidayRow.hidden = !valid || holidayCents === 0;
    const transferRow = document.getElementById('transfer-row');
    if (transferRow) transferRow.hidden = !valid || transferCents === 0;
    text('extra-guest-count',valid?`(${n} × ${euros(20)})`:'');
    text('extra-guest-total',euros(extraCents/100));
    text('summary-room',t(r.name));
    text('stay-description',valid?t('Soggiorno: {n} · Ospiti: {g}',{n,g:count}):t('Seleziona le date per il preventivo'));
    text('night-count',valid?`(${n} × ${euros(r.price)})`:'');
    text('room-total',euros(roomCents/100));text('tax-total',euros(taxCents/100));
    if (document.getElementById('holiday-count')) text('holiday-count',valid && holidayNights ? `(${holidayNights} × ${euros(5)})` : '');
    if (document.getElementById('holiday-total')) text('holiday-total',euros(holidayCents/100));
    if (document.getElementById('transfer-total')) text('transfer-total',euros(transferCents/100));
    text('discount-total',`−${euros(discountCents/100)}`);text('grand-total',euros(totalCents/100));
    text('deposit-summary',valid&&payment.value==='deposit'?t("Acconto indicativo: {deposit}. Saldo all'arrivo: {balance}, tassa inclusa.",{deposit:euros(depositCents/100),balance:euros((totalCents-depositCents)/100)}):'');
    error.hidden=!invalid;
    error.textContent=invalid?t('Le date non sono valide. Il check-in non può essere nel passato e il check-out deve essere dopo il check-in.'):'';
    checkin.setCustomValidity(checkin.value?'':t('Seleziona entrambe le date per continuare.'));
    checkout.setCustomValidity(checkout.value?'':t('Seleziona entrambe le date per continuare.'));
    send.disabled=!valid;
    if(requestOpened) text('booking-status',t('Richiesta aperta su WhatsApp. Invia il messaggio e attendi la conferma della struttura.'));
    return {r,count,nights,roomCents,extraCents,taxCents,transferCents,holidayCents,holidayNights,discountCents,totalCents,depositCents,valid};
  }
  function resetRequest() {requestOpened=false;status.textContent='';update();}
  checkin.addEventListener('change',()=>{if(checkin.value&&(!checkout.value||checkout.value<=checkin.value))checkout.value=nextDay(checkin.value);update();});
  form.addEventListener('input',resetRequest);
  form.addEventListener('change',resetRequest);
  document.querySelectorAll('.choose-room').forEach(link=>link.addEventListener('click',()=>{room.value=link.dataset.room;resetRequest();}));
  window.addEventListener('languagechange',()=>{requestOpened=false;status.textContent='';update();});
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const b=update();
    if(!b.valid||!form.reportValidity())return;
    const lines=[t('Ciao! Vorrei richiedere disponibilità al B&B Lillo - Stella.'),`${t('Camera')}: ${t(b.r.name)}`,`${t('Check-in')}: ${fmtDate(checkin.value)} · 11:00`,`${t('Check-in')}: ${fmtDate(checkin.value)} · dalle 12:00 alle 19:00`,`${t('Check-out')}: ${fmtDate(checkout.value)} · entro le 10:30`,t('Soggiorno: {n} · Ospiti: {g}',{n:b.nights,g:b.count}),`${t('Camera')}: ${euros(b.roomCents/100)}`];
    if(b.extraCents)lines.push(`${t('Supplemento terzo ospite')}: ${euros(b.extraCents/100)}`);
    if(b.discountCents)lines.push(`${t('Sconto')}: −${euros(b.discountCents/100)}`);
    if(b.holidayCents)lines.push(`${t('Supplemento festività')}: ${euros(b.holidayCents/100)} (${b.holidayNights} × ${euros(5)})`);
    lines.push(`${t('Tassa di soggiorno')}: ${euros(b.taxCents/100)}`);
    if(b.transferCents)lines.push(`${t('Trasferimento aeroporto')}: ${euros(b.transferCents/100)}`);
    lines.push(`${t('Totale')}: ${euros(b.totalCents/100)}`,`${t('Modalità di pagamento')}: ${t(paymentNames[payment.value])}`);
    if(payment.value==='deposit')lines.push(t("Acconto indicativo: {deposit}. Saldo all'arrivo: {balance}, tassa inclusa.",{deposit:euros(b.depositCents/100),balance:euros((b.totalCents-b.depositCents)/100)}));
    lines.push(t('Gli sconti si applicano al soggiorno e al supplemento terzo ospite; la tassa di soggiorno resta separata. L\'acconto indicativo è il 20% del soggiorno scontato. Modalità di versamento e importi da confermare con la struttura.'),'',t('È disponibile? Potete confermare il preventivo e le condizioni di cancellazione e pagamento? Grazie!'));
    const href=`https://wa.me/393396663166?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(href,'_blank','noopener,noreferrer');
    requestOpened=true;update();
    const link=document.createElement('a');link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=t('Apri WhatsApp');
    status.append(document.createTextNode(' '+t('Se WhatsApp non si apre, usa questo link.')+' '),link);
  });
  update();
})();
