/* Medicine rules, dose generation, and intake actions. */
const MedicineLogic = (() => {
  const toDate = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); };
  const dayString = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const validOn = (medicine, date) => { const day = dayString(date); return day >= medicine.startDate && (!medicine.endDate || day <= medicine.endDate); };
  const doseId = (medicine, day, time) => `${medicine.id}|${day}|${time}`;
  function dosesFor(day, medicines = Store.getMedicines(), records = Store.getRecords()) {
    const date = toDate(day), byId = new Map(records.map(record => [record.id, record]));
    return medicines.filter(m => validOn(m,date)).flatMap(m => (m.times || []).map(time => {
      const id = doseId(m,day,time);
      return { id, medicine: m, date: day, time, record: byId.get(id) || null };
    })).sort((a,b) => a.time.localeCompare(b.time) || a.medicine.name.localeCompare(b.medicine.name));
  }
  function setStatus(dose, status) {
    const records = Store.getRecords(), current = records.find(record => record.id === dose.id);
    if (current) return { ok: false, message: `This dose is already marked ${current.status.toLowerCase()}.` };
    records.push({ id: dose.id, medicineId: dose.medicine.id, medicineName: dose.medicine.name, date: dose.date, scheduledTime: dose.time, status, recordedAt: new Date().toISOString() });
    if (!Store.saveRecords(records)) return { ok: false, message: 'Could not save this update. Check available browser storage.' };
    return { ok: true };
  }
  return { dosesFor, setStatus, doseId, validOn };
})();

