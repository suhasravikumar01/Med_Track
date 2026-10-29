/* Local storage helpers and first-run demonstration data. */
const Store = (() => {
  const KEYS = { medicines: 'medtrack.medicines.v1', records: 'medtrack.records.v1', prefs: 'medtrack.preferences.v1', seeded: 'medtrack.seeded.v1' };
  const read = (key, fallback) => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (error) { console.error('Could not read Med_Track data:', error); return fallback; }
  };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (error) { console.error('Could not save Med_Track data:', error); return false; } };
  const day = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  function seed() {
    if (localStorage.getItem(KEYS.seeded)) return;
    const medicines = [
      { id: 'demo-thyroid', person: '', condition: 'Thyroid', customCondition: '', name: 'Levothyroxine', category: 'Tablet', dosage: '50 mcg', frequency: 'Once daily', times: ['07:00'], startDate: day(-35), endDate: '', createdAt: new Date().toISOString() },
      { id: 'demo-vitamin', person: '', condition: 'Vitamin Deficiency', customCondition: '', name: 'Vitamin D3', category: 'Capsule', dosage: '1000 IU', frequency: 'Once daily', times: ['09:00'], startDate: day(-18), endDate: '', createdAt: new Date().toISOString() },
      { id: 'demo-diabetes', person: '', condition: 'Diabetes', customCondition: '', name: 'Metformin', category: 'Tablet', dosage: '500 mg', frequency: 'Twice daily', times: ['08:00','20:00'], startDate: day(-12), endDate: '', createdAt: new Date().toISOString() }
    ];
    write(KEYS.medicines, medicines); write(KEYS.records, []); write(KEYS.prefs, { demoData: true });
    localStorage.setItem(KEYS.seeded, 'true');
  }
  seed();
  return {
    getMedicines: () => read(KEYS.medicines, []),
    saveMedicines: value => write(KEYS.medicines, value),
    getRecords: () => read(KEYS.records, []),
    saveRecords: value => write(KEYS.records, value),
    getPreferences: () => read(KEYS.prefs, {}),
    savePreferences: value => write(KEYS.prefs, value),
    clearAll: () => { Object.values(KEYS).forEach(key => localStorage.removeItem(key)); },
    day
  };
})();

