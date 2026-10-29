/* Page navigation, rendering, and user interactions. */
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const content = $('#pageContent'), titles = { dashboard:'Dashboard', medicines:'My medicines', add:'Add medicine', schedule:'Medicine schedule', history:'Medication history' };
  let toastTimer;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const today = () => Store.day();
  const formatDate = (value, options = { weekday:'long', month:'long', day:'numeric' }) => { if (!value) return '—'; const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString(undefined,options); };
  const conditionName = m => m.condition === 'Other' ? (m.customCondition || 'Other') : m.condition;
  const showToast = message => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600); };
  const pageHeading = (title, subtitle, action = '') => `<div class="page-heading"><div><p class="eyebrow">MED_TRACK</p><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
  const empty = (title, copy, button = '') => `<div class="empty-state"><div class="empty-icon">♡</div><strong>${title}</strong><p>${copy}</p>${button}</div>`;
  const doseStatus = dose => dose.record ? dose.record.status : (dose.date === today() && dose.time <= new Date().toTimeString().slice(0,5) ? 'Due' : 'Upcoming');
  const pill = status => `<span class="status-pill status-${status.toLowerCase()}">${status}</span>`;
  const actionButtons = dose => dose.record ? pill(dose.record.status) : `<button class="button button-soft button-small" data-dose="${escapeHtml(dose.id)}" data-status="Taken">✓ Taken</button><button class="button button-plain button-small" data-dose="${escapeHtml(dose.id)}" data-status="Skipped">Skip</button>`;
  const doseRow = dose => `<div class="dose-row"><span class="dose-time">${escapeHtml(dose.time)}</span><span class="dose-marker"></span><div class="dose-info"><strong>${escapeHtml(dose.medicine.name)}</strong><span>${escapeHtml(dose.medicine.dosage)} · ${escapeHtml(dose.medicine.person || conditionName(dose.medicine))}</span></div><div class="dose-actions">${dose.record ? pill(dose.record.status) : actionButtons(dose)}</div></div>`;
  function renderDashboard() {
    const medicines = Store.getMedicines(), doses = MedicineLogic.dosesFor(today()), taken = doses.filter(d => d.record?.status === 'Taken').length, remaining = doses.length - taken;
    const next = doses.find(d => !d.record && d.time >= new Date().toTimeString().slice(0,5)) || doses.find(d => !d.record);
    const conditions = [...new Set(medicines.map(conditionName))];
    const upcoming = doses.filter(d => !d.record).slice(0,4);
    content.innerHTML = pageHeading('Good day, take care 🌿', 'Here’s your medicine plan for today.', `<a class="button button-primary" href="#add">＋ Add medicine</a>`)+
      `<section class="stats-grid" aria-label="Today's medicine statistics"><article class="stat-card"><div class="stat-top">Total medicines<span class="stat-icon">▤</span></div><div class="stat-value">${medicines.length}</div><div class="stat-note">in your medicine cabinet</div></article><article class="stat-card"><div class="stat-top">Scheduled today<span class="stat-icon blue">◷</span></div><div class="stat-value">${doses.length}</div><div class="stat-note">planned doses</div></article><article class="stat-card"><div class="stat-top">Taken today<span class="stat-icon">✓</span></div><div class="stat-value">${taken}</div><div class="stat-note">${doses.length ? `${Math.round(taken/doses.length*100)}% of today's plan` : 'ready when you are'}</div></article><article class="stat-card"><div class="stat-top">Remaining<span class="stat-icon amber">○</span></div><div class="stat-value">${remaining}</div><div class="stat-note">${remaining ? 'doses left today' : 'you’re all caught up'}</div></article></section>
      <div class="dashboard-grid"><section class="panel"><div class="panel-header"><div><h2>Today’s schedule</h2><div class="date-sub">${formatDate(today())}</div></div><button class="text-link" data-go="schedule">View schedule →</button></div>${doses.length ? `<div class="dose-list">${doses.map(doseRow).join('')}</div>` : empty('No medicines scheduled today','Add a medicine and its schedule will appear here.')}</section>
      <section><div class="quick-card"><div class="quick-kicker">YOUR NEXT REMINDER</div><h3>${next ? escapeHtml(next.medicine.name) : 'All clear for now'}</h3><p>${next ? `${escapeHtml(next.time)} · ${escapeHtml(next.medicine.dosage)} · ${escapeHtml(conditionName(next.medicine))}` : 'You have no upcoming doses today.'}</p><div class="quick-progress"><div class="progress-label"><span>Daily progress</span><strong>${taken} of ${doses.length}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${doses.length ? taken/doses.length*100 : 0}%"></div></div></div></div><div class="panel"><div class="panel-header"><h2>Health categories</h2><button class="text-link" data-go="medicines">All medicines →</button></div>${conditions.length ? `<div class="condition-list">${conditions.map((c,i)=>`<div class="condition-row"><span class="condition-left"><span class="condition-dot" style="background:${['#70b995','#79a8c9','#d9ae60','#ac91c8'][i%4]}"></span>${escapeHtml(c)}</span><span class="count-badge">${medicines.filter(m=>conditionName(m)===c).length}</span></div>`).join('')}</div>` : `<p class="date-sub">Categories will appear as you add medicines.</p>`}</div></section></div>
      <div class="section-row"><h2>Upcoming doses</h2><button class="text-link" data-go="schedule">Open schedule →</button></div><section class="panel">${upcoming.length ? `<div class="dose-list">${upcoming.map(doseRow).join('')}</div>` : empty('Nothing else on your schedule','You have no upcoming doses left today.')}</section>`;
  }
  const medicineCard = m => `<article class="medicine-card"><div class="medicine-card-top"><span class="medicine-symbol">✚</span><span class="count-badge">${escapeHtml(conditionName(m))}</span></div><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.person ? `For ${m.person}` : m.category)} · ${escapeHtml(m.dosage)}</p><div class="medicine-meta"><span class="tag">${escapeHtml(m.frequency)}</span><span class="tag">${(m.times||[]).map(escapeHtml).join(' · ')}</span></div><div class="card-actions"><button class="button button-plain button-small" data-edit="${escapeHtml(m.id)}">Edit</button><button class="button button-danger button-small" data-delete="${escapeHtml(m.id)}">Delete</button></div></article>`;
  function renderMedicines() {
    const medicines = Store.getMedicines();
    content.innerHTML = pageHeading('My medicines','Keep your medicine details organized and easy to find.',`<a class="button button-primary" href="#add">＋ Add medicine</a>`)+
      (medicines.length ? `<div class="section-row" style="margin-top:0"><h2>${medicines.length} ${medicines.length===1?'medicine':'medicines'}</h2><button class="text-link" data-clear-demo>Clear sample data</button></div><div class="medicine-grid">${medicines.map(medicineCard).join('')}</div>` : empty('Your medicine list is empty','Add your first medicine to create a clear daily plan.',`<a class="button button-primary" href="#add">＋ Add a medicine</a>`));
  }
  function renderSchedule() {
    const day = $('#scheduleDate')?.value || today(), doses = MedicineLogic.dosesFor(day);
    content.innerHTML = pageHeading('Medicine schedule','See every planned dose and keep track as you go.')+`<section class="panel"><div class="schedule-toolbar"><label class="sr-only" for="scheduleDate">Choose schedule date</label><input id="scheduleDate" type="date" value="${day}" max="9999-12-31"><button class="button button-soft button-small" data-date-today>Today</button><strong class="schedule-date-title">${formatDate(day,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</strong></div>${doses.length ? `<div class="schedule-list">${doses.map(d=>`<article class="schedule-item"><div class="item-time">${escapeHtml(d.time)}</div><div><div class="item-name">${escapeHtml(d.medicine.name)}</div><div class="item-meta">${escapeHtml(d.medicine.dosage)} · ${escapeHtml(conditionName(d.medicine))}${d.medicine.person?` · ${escapeHtml(d.medicine.person)}`:''}</div></div><div class="item-actions">${d.record ? pill(d.record.status) : actionButtons(d)}</div></article>`).join('')}</div>` : empty('No doses for this date','There are no medicines scheduled for the selected day.')}</section>`;
  }
  function renderHistory() {
    const selected = $('#historyDate')?.value || today(), records = Store.getRecords().filter(r=>r.date===selected).sort((a,b)=>a.scheduledTime.localeCompare(b.scheduledTime));
    content.innerHTML = pageHeading('Medication history','Review what was taken or skipped on a selected day.')+`<section class="panel"><div class="history-toolbar"><label for="historyDate" class="field-label">View date</label><input id="historyDate" type="date" value="${selected}"><button class="button button-soft button-small" data-history-today>Today</button><span class="schedule-date-title">${formatDate(selected,{month:'long',day:'numeric',year:'numeric'})}</span></div>${records.length ? `<div class="history-list"><table class="history-table"><thead><tr><th>Medicine</th><th>Scheduled time</th><th>Status</th><th>Date recorded</th></tr></thead><tbody>${records.map(r=>`<tr><td><strong>${escapeHtml(r.medicineName)}</strong></td><td>${escapeHtml(r.scheduledTime)}</td><td>${pill(r.status)}</td><td>${formatDate(r.date,{month:'short',day:'numeric',year:'numeric'})}</td></tr>`).join('')}</tbody></table></div>` : empty('No history for this date','Taken and skipped doses will show here after you update your schedule.')}</section>`;
  }
  const frequencies = ['Once daily','Twice daily','Three times daily','Custom'];
  const defaultTimes = { 'Once daily':['08:00'], 'Twice daily':['08:00','20:00'], 'Three times daily':['08:00','14:00','20:00'], Custom:['08:00'] };
  function renderForm(id = '') {
    const m = id ? Store.getMedicines().find(item=>item.id===id) : null;
    if (id && !m) { showToast('That medicine could not be found.'); location.hash='#medicines'; return; }
    const chosenFrequency = m?.frequency || 'Once daily', times = m?.times || defaultTimes[chosenFrequency];
    content.innerHTML = pageHeading(m?'Edit medicine':'Add a medicine',m?'Update the details and schedule for this medicine.':'Add the details that help you keep your daily plan clear.')+
      `<div class="form-layout"><section class="form-card"><h2>Medicine details</h2><p class="form-intro">Fields marked with * are required.</p><form id="medicineForm" novalidate><input type="hidden" name="id" value="${escapeHtml(m?.id||'')}"><div class="form-grid">
      <div class="field"><label for="person">Person’s name <span style="font-weight:400;color:#9aa8a2">(optional)</span></label><input id="person" name="person" maxlength="60" placeholder="e.g. Alex" value="${escapeHtml(m?.person||'')}"></div>
      <div class="field"><label for="condition">Health condition *</label><select id="condition" name="condition" required>${['Thyroid','Diabetes','Blood Pressure','Heart Conditions','Vitamin Deficiency','Other'].map(c=>`<option ${m?.condition===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field full" id="customConditionWrap" style="display:${m?.condition==='Other'?'flex':'none'}"><label for="customCondition">Your health condition *</label><input id="customCondition" name="customCondition" maxlength="50" placeholder="Enter a health condition" value="${escapeHtml(m?.customCondition||'')}"></div>
      <div class="field"><label for="name">Medicine name *</label><input id="name" name="name" required maxlength="80" placeholder="e.g. Levothyroxine" value="${escapeHtml(m?.name||'')}"></div>
      <div class="field"><label for="category">Medicine category *</label><select id="category" name="category" required>${['Tablet','Capsule','Syrup','Injection','Other'].map(c=>`<option ${m?.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label for="dosage">Dosage information *</label><input id="dosage" name="dosage" required maxlength="50" placeholder="e.g. 1 tablet · 50 mg" value="${escapeHtml(m?.dosage||'')}"></div>
      <div class="field"><label for="frequency">Frequency *</label><select id="frequency" name="frequency">${frequencies.map(c=>`<option ${chosenFrequency===c?'selected':''}>${c}</option>`).join('')}</select></div>
      <div class="field full"><label>Medicine timings *</label><div class="time-fields" id="timeFields">${times.map((time,i)=>`<label class="field"><span class="sr-only">Dose ${i+1} time</span><input type="time" name="times" required value="${escapeHtml(time)}" aria-label="Dose ${i+1} time"></label>`).join('')}</div><small>Set one time for each scheduled dose. Use your clinician’s instructions.</small></div>
      <div class="field"><label for="startDate">Starting date *</label><input id="startDate" name="startDate" type="date" required value="${escapeHtml(m?.startDate||today())}"></div>
      <div class="field"><label for="endDate">End date <span style="font-weight:400;color:#9aa8a2">(optional)</span></label><input id="endDate" name="endDate" type="date" value="${escapeHtml(m?.endDate||'')}"></div>
      </div><div class="form-actions"><button type="button" class="button button-plain" data-go="medicines">Cancel</button><button type="submit" class="button button-primary">${m?'Save changes':'Save medicine'}</button></div></form>${m?`<div class="danger-zone"><button class="button button-danger button-small" data-delete="${escapeHtml(m.id)}">Delete this medicine</button></div>`:''}</section>
      <aside class="form-aside"><div class="tip-card"><span class="tip-icon">✦</span><h3>A helpful reminder</h3><p>Use the name and dosage shown on your medicine packaging or care plan. Follow the directions given by your healthcare professional.</p></div><div class="panel"><div class="panel-header"><h2>Keep it simple</h2></div><ul class="note-list"><li>Choose a clear medicine name.</li><li>Set each dose time carefully.</li><li>You can edit these details later.</li></ul></div></aside></div>`;
    $('#condition').addEventListener('change',e=>{ $('#customConditionWrap').style.display=e.target.value==='Other'?'flex':'none'; $('#customCondition').required=e.target.value==='Other'; });
    $('#customCondition').required=m?.condition==='Other';
    $('#frequency').addEventListener('change',e=>{const amount=e.target.value==='Once daily'?1:e.target.value==='Twice daily'?2:e.target.value==='Three times daily'?3:Math.max(1,$$('input[name="times"]', $('#timeFields')).length);const old=$$('input[name="times"]',$('#timeFields')).map(input=>input.value);$('#timeFields').innerHTML=Array.from({length:amount},(_,i)=>`<label class="field"><span class="sr-only">Dose ${i+1} time</span><input type="time" name="times" required value="${escapeHtml(old[i]||defaultTimes[e.target.value][i]||'08:00')}" aria-label="Dose ${i+1} time"></label>`).join('');});
    $('#medicineForm').addEventListener('submit',saveMedicine);
  }
  function saveMedicine(event) {
    event.preventDefault(); const form=event.currentTarget, data=new FormData(form), frequency=data.get('frequency'), times=data.getAll('times').filter(Boolean).sort();
    const condition=data.get('condition'), customCondition=(data.get('customCondition')||'').trim();
    if (!form.reportValidity()) { showToast('Please complete the required fields.'); return; }
    if (condition==='Other'&&!customCondition) { $('#customCondition').focus(); showToast('Please enter your health condition.'); return; }
    if (!times.length || new Set(times).size!==times.length) { showToast('Add at least one unique dose time.'); return; }
    const expected=frequency==='Once daily'?1:frequency==='Twice daily'?2:frequency==='Three times daily'?3:null;
    if(expected&&times.length!==expected){showToast(`Choose ${expected} dose time${expected===1?'':'s'} for this frequency.`);return;}
    const startDate=data.get('startDate'), endDate=data.get('endDate'); if(endDate&&endDate<startDate){$('#endDate').focus();showToast('End date must be on or after the starting date.');return;}
    const medicines=Store.getMedicines(), id=data.get('id')||`med-${crypto.randomUUID()}`;
    const medicine={id,person:(data.get('person')||'').trim(),condition,customCondition:condition==='Other'?customCondition:'',name:(data.get('name')||'').trim(),category:data.get('category'),dosage:(data.get('dosage')||'').trim(),frequency,times,startDate,endDate,createdAt:medicines.find(m=>m.id===id)?.createdAt||new Date().toISOString()};
    if(!medicine.person||medicine.name&&medicine.dosage){const index=medicines.findIndex(m=>m.id===id);if(index<0)medicines.push(medicine);else medicines[index]=medicine;}
    if(!Store.saveMedicines(medicines)){showToast('Could not save medicine. Check browser storage.');return;}
    location.hash='#medicines'; showToast(data.get('id')?'Medicine updated.':'Medicine added.');
  }
  function removeMedicine(id) {
    const medicines=Store.getMedicines(), medicine=medicines.find(m=>m.id===id); if(!medicine)return;
    if(!confirm(`Delete ${medicine.name}? Its scheduled history will be kept.`))return;
    if(!Store.saveMedicines(medicines.filter(m=>m.id!==id))){showToast('Could not delete this medicine.');return;}
    showToast(`${medicine.name} deleted.`);location.hash='#medicines';
  }
  function render() {
    const page=(location.hash.slice(1).split('?')[0]||'dashboard').toLowerCase(); const allowed=Object.hasOwn(titles,page)?page:'dashboard';
    $$('.nav-link').forEach(link=>link.classList.toggle('active',link.dataset.page===allowed)); $('#pageTitle').textContent=titles[allowed]; $('#sidebar').classList.remove('open');
    if(allowed==='dashboard')renderDashboard();else if(allowed==='medicines')renderMedicines();else if(allowed==='add')renderForm(new URLSearchParams(location.hash.split('?')[1]||'').get('edit')||'');else if(allowed==='schedule')renderSchedule();else renderHistory();
  }
  content.addEventListener('click',event=>{
    const go=event.target.closest('[data-go]'); if(go){location.hash=`#${go.dataset.go}`;return;}
    const edit=event.target.closest('[data-edit]');if(edit){location.hash=`#add?edit=${encodeURIComponent(edit.dataset.edit)}`;return;}
    const del=event.target.closest('[data-delete]');if(del){removeMedicine(del.dataset.delete);return;}
    const clearDemo=event.target.closest('[data-clear-demo]');if(clearDemo){
      const demoIds=new Set(['demo-thyroid','demo-vitamin','demo-diabetes']), medicines=Store.getMedicines();
      if(!medicines.some(m=>demoIds.has(m.id))){showToast('No sample medicines to clear.');return;}
      if(!confirm('Remove the demonstration medicines and their dose records? Your own medicines will stay.'))return;
      if(!Store.saveMedicines(medicines.filter(m=>!demoIds.has(m.id)))||!Store.saveRecords(Store.getRecords().filter(r=>!demoIds.has(r.medicineId)))){showToast('Could not clear sample data.');return;}
      Store.savePreferences({...Store.getPreferences(),demoData:false});showToast('Sample data cleared.');renderMedicines();return;
    }
    const dateToday=event.target.closest('[data-date-today]');if(dateToday){$('#scheduleDate').value=today();renderSchedule();return;}
    const historyToday=event.target.closest('[data-history-today]');if(historyToday){$('#historyDate').value=today();renderHistory();return;}
    const doseButton=event.target.closest('[data-dose]');if(doseButton){const [medicineId,date,time]=doseButton.dataset.dose.split('|'),medicine=Store.getMedicines().find(m=>m.id===medicineId);if(!medicine){showToast('This medicine is no longer available.');return;}const result=MedicineLogic.setStatus({id:doseButton.dataset.dose,medicine,date,time},doseButton.dataset.status);showToast(result.ok?`Dose marked ${doseButton.dataset.status.toLowerCase()}.`:result.message);render();}
  });
  content.addEventListener('change',event=>{if(event.target.id==='scheduleDate')renderSchedule();if(event.target.id==='historyDate')renderHistory();});
  $$('.nav-link').forEach(link=>link.addEventListener('click',()=>$('#sidebar').classList.remove('open')));
  $('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  window.addEventListener('hashchange',render); window.addEventListener('storage',render);
  $('#todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}); if(!location.hash)location.hash='#dashboard'; else render();
})();

