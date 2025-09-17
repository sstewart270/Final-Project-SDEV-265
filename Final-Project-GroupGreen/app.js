// Simple prototype store using localStorage
const KEY = "reservations:v1";

const Store = {
  all() {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  },
  save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  },
  byDate(dateStr) {
    return this.all().filter(r => r.date === dateStr)
      .sort((a,b) => a.start.localeCompare(b.start));
  }
};

// Time slot config (10:00 → 22:00 in 30-min steps)
const OPEN_MINUTES = 10 * 60;   // 10:00
const CLOSE_MINUTES = 22 * 60;  // 22:00

function minutesToHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`; // 24h "HH:MM"
}
function format12(hhmm) {
  let [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  h = ((h + 11) % 12) + 1;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}
function populateTimes(selectEl) {
  selectEl.innerHTML = "";
  for (let t = OPEN_MINUTES; t <= CLOSE_MINUTES; t += 30) {
    const value = minutesToHHMM(t);
    const opt = document.createElement("option");
    opt.value = value;                 // stored "HH:MM"
    opt.textContent = format12(value); // shown "h:mm AM/PM"
    selectEl.appendChild(opt);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // Grab elements AFTER DOM is ready
  const datePicker = document.getElementById("datePicker");
  const listEl = document.getElementById("list");
  const form = document.getElementById("resForm");
  const formMsg = document.getElementById("formMsg");
  const formTitle = document.getElementById("formTitle");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const newBtn = document.getElementById("newBtn");
  const startSelect = document.getElementById("start");

  // Init date & time dropdown
  const today = new Date().toISOString().slice(0,10);
  datePicker.value = today;
  form.date.value = today;
  populateTimes(startSelect);
  if (startSelect.options.length) startSelect.value = startSelect.options[0].value;

  function render() {
    const day = datePicker.value;
    const items = Store.byDate(day);
    listEl.innerHTML = "";
    if (items.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No reservations yet.";
      li.className = "item";
      listEl.appendChild(li);
      return;
    }
    for (const r of items) {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <div>
          <strong>${format12(r.start)}</strong> • ${r.name}
          <span class="badge">(Party ${r.partySize || 1})</span>
        </div>
        <div>
          <button data-id="${r.id}" class="edit">Edit</button>
          <button data-id="${r.id}" class="danger delete">Delete</button>
        </div>
      `;
      listEl.appendChild(li);
    }
  }

  function uuid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2); }
  function clearForm() {
    form.reset();
    form.resId.value = "";
    form.date.value = datePicker.value;
    if (startSelect.options.length) startSelect.value = startSelect.options[0].value;
    formTitle.textContent = "Add Reservation";
    formMsg.textContent = "";
  }

  datePicker.addEventListener("change", () => {
    form.date.value = datePicker.value;
    render();
  });

  newBtn.addEventListener("click", clearForm);
  cancelEditBtn.addEventListener("click", clearForm);

  listEl.addEventListener("click", (e) => {
    if (e.target.matches(".delete")) {
      const id = e.target.dataset.id;
      const all = Store.all().filter(r => r.id !== id);
      Store.save(all);
      render();
    }
    if (e.target.matches(".edit")) {
      const id = e.target.dataset.id;
      const r = Store.all().find(x => x.id === id);
      if (!r) return;
      formTitle.textContent = "Edit Reservation";
      form.resId.value = r.id;
      form.name.value = r.name;
      form.phone.value = r.phone || "";
      form.email.value = r.email || "";
      form.partySize.value = r.partySize || 1;
      form.date.value = r.date;

      // Ensure dropdown holds the time (should already be in range)
      const has = [...startSelect.options].some(o => o.value === r.start);
      if (!has) startSelect.add(new Option(format12(r.start), r.start), 0);
      startSelect.value = r.start;

      form.notes.value = r.notes || "";
      formMsg.textContent = "";
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const res = {
      id: form.resId.value || uuid(),
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      partySize: Number(form.partySize.value || 1),
      date: form.date.value,
      start: startSelect.value,
      notes: form.notes.value.trim()
    };

    if (!res.name || !res.date || !res.start) {
      formMsg.textContent = "Please fill required fields.";
      return;
    }

    const all = Store.all();
    const idx = all.findIndex(r => r.id === res.id);
    if (idx >= 0) all[idx] = res; else all.push(res);
    Store.save(all);
    formMsg.textContent = "Saved.";
    render();
  });

  // Seed sample once
  if (!Store.all().length) {
    Store.save([
      { id: uuid(), name: "Sample Customer", phone: "555-555-5555", email: "sample@email.com", partySize: 2, date: today, start: "18:00", notes: "" }
    ]);
  }
  render();
});


