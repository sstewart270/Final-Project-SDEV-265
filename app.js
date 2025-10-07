// ===============================
// Restaurant Reservation System (OOP version)
// ===============================

// ---- Model ----
class Reservation {
  constructor({ id, name, phone="", email="", partySize=1, date, start, notes="" }) {
    this.id = id;
    this.name = name;
    this.phone = phone;
    this.email = email;
    this.partySize = Number(partySize || 1);
    this.date = date;
    this.start = start;   // "HH:MM" 24h
    this.notes = notes;
  }
}

// ---- Store (localStorage) ----
class ReservationStore {
  constructor(key = "reservations:v1") { this.key = key; }
  all() {
    return JSON.parse(localStorage.getItem(this.key) || "[]").map(r => new Reservation(r));
  }
  save(list) {
    localStorage.setItem(this.key, JSON.stringify(list));
  }
  byDate(dateStr) {
    return this.all()
      .filter(r => r.date === dateStr)
      .sort((a,b) => a.start.localeCompare(b.start));
  }
}

// ---- UI Controller ----
class AppUI {
  constructor(store, options = {}) {
    this.store = store;
    this.MAX_TABLES = options.maxTables ?? 20;   // capacity denominator
    this.OPEN_MINUTES = options.openMinutes ?? (10 * 60);
    this.CLOSE_MINUTES = options.closeMinutes ?? (22 * 60);

    // DOM references
    this.pageTitle = null;
    this.tabs = null;
    this.views = null;

    this.datePicker = null;
    this.listEl = null;
    this.form = null;
    this.formMsg = null;
    this.formTitle = null;
    this.cancelEditBtn = null;
    this.newBtn = null;
    this.startSelect = null;
    this.searchInput = null;
    this.exportBtn = null;
    this.exportBtn2 = null;
    this.printBtn = null;

    this.searchTerm = "";
    this.today = new Date().toISOString().slice(0,10);
  }

  // --- helpers ---
  minutesToHHMM(mins) {
    const h = String(Math.floor(mins / 60)).padStart(2,"0");
    const m = String(mins % 60).padStart(2,"0");
    return `${h}:${m}`;
  }
  format12(hhmm) {
    let [h, m] = hhmm.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    h = ((h + 11) % 12) + 1;
    return `${h}:${String(m).padStart(2,"0")} ${ampm}`;
  }
  populateTimes(selectEl) {
    selectEl.innerHTML = "";
    for (let t = this.OPEN_MINUTES; t <= this.CLOSE_MINUTES; t += 30) {
      const v = this.minutesToHHMM(t);
      selectEl.appendChild(new Option(this.format12(v), v));
    }
  }
  uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  }
  clearForm() {
    this.form.reset();
    this.form.resId.value = "";
    this.form.date.value = this.datePicker.value;
    if (this.startSelect.options.length) this.startSelect.value = this.startSelect.options[0].value;
    this.formTitle.textContent = "Add Reservation";
    this.formMsg.textContent = "";
  }

  // --- rendering ---
  render() {
    const day = this.datePicker.value;
    let items = this.store.byDate(day);

    if (this.searchTerm) {
      items = items.filter(r => (r.name || "").toLowerCase().includes(this.searchTerm));
    }

    this.listEl.innerHTML = "";
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "No reservations yet.";
      li.className = "item";
      this.listEl.appendChild(li);
      return;
    }

    items.sort((a,b) => a.start.localeCompare(b.start));

    items.forEach((r, i) => {
      const li = document.createElement("li");
      li.className = "item";
      const reservationNumber = i + 1;

      li.innerHTML = `
        <div>
          <strong>${this.format12(r.start)}</strong> • ${r.name}
          <span class="badge">(Party ${r.partySize || 1} • Reservation ${reservationNumber}/${this.MAX_TABLES})</span>
        </div>
        <div>
          <button data-id="${r.id}" class="edit">Edit</button>
          <button data-id="${r.id}" class="danger delete">Delete</button>
        </div>
      `;
      this.listEl.appendChild(li);
    });
  }

  // --- navigation ---
  showView(id) {
    this.views.forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    this.tabs.forEach(btn => btn.classList.toggle("active", btn.dataset.view === id));
    const map = { reservationsView: "Reservations", reportsView: "Reports", aboutView: "About", helpView: "Help" };
    this.pageTitle.textContent = map[id] || "Reservations";
    if (id === "reservationsView") this.render();
  }

  // --- CSV export ---
  exportCSV() {
    const day = this.datePicker.value;
    const items = this.store.byDate(day);
    if (!items.length) {
      alert("No reservations to export.");
      return;
    }
    const header = ["name","phone","email","partySize","date","start","notes"];
    const escape = (s="") => `"${String(s).replace(/"/g,'""')}"`;
    const lines = items.map(r => header.map(k => escape(r[k])).join(","));
    const csv = header.join(",") + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reservations_${day}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- event bindings ---
  bindEvents() {
    // Date change
    this.datePicker.addEventListener("change", () => {
      this.form.date.value = this.datePicker.value;
      this.render();
    });

    // New / Cancel
    this.newBtn.addEventListener("click", () => this.clearForm());
    this.cancelEditBtn.addEventListener("click", () => this.clearForm());

    // Edit / Delete
    this.listEl.addEventListener("click", e => {
      if (e.target.matches(".delete")) {
        const id = e.target.dataset.id;
        const all = this.store.all().filter(r => r.id !== id);
        this.store.save(all);
        this.render();
      }

      if (e.target.matches(".edit")) {
        const id = e.target.dataset.id;
        const r = this.store.all().find(x => x.id === id);
        if (!r) return;

        this.formTitle.textContent = "Edit Reservation";
        this.form.resId.value = r.id;
        this.form.name.value = r.name;
        this.form.phone.value = r.phone || "";
        this.form.email.value = r.email || "";
        this.form.partySize.value = r.partySize || 1;
        this.form.date.value = r.date;

        const has = [...this.startSelect.options].some(o => o.value === r.start);
        if (!has) this.startSelect.add(new Option(this.format12(r.start), r.start), 0);
        this.startSelect.value = r.start;

        this.form.notes.value = r.notes || "";
        this.formMsg.textContent = "";
      }
    });

    // Save (create/update)
    this.form.addEventListener("submit", e => {
      e.preventDefault();
      const res = new Reservation({
        id: this.form.resId.value || this.uuid(),
        name: this.form.name.value.trim(),
        phone: this.form.phone.value.trim(),
        email: this.form.email.value.trim(),
        partySize: Number(this.form.partySize.value || 1),
        date: this.form.date.value,
        start: this.startSelect.value,
        notes: this.form.notes.value.trim()
      });

      if (!res.name || !res.date || !res.start) {
        this.formMsg.textContent = "Please fill required fields.";
        return;
      }

      // capacity check per time slot
      const all = this.store.all();
      const countAtSlot = all.filter(r => r.date === res.date && r.start === res.start && r.id !== res.id).length;
      if (countAtSlot >= this.MAX_TABLES) {
        this.formMsg.textContent = `That time slot is full (max ${this.MAX_TABLES} reservations). Choose another time.`;
        return;
      }

      const idx = all.findIndex(r => r.id === res.id);
      if (idx >= 0) all[idx] = res; else all.push(res);
      this.store.save(all);

      this.formMsg.textContent = "Saved.";
      this.render();
    });

    // Search
    this.searchInput.addEventListener("input", () => {
      this.searchTerm = this.searchInput.value.trim().toLowerCase();
      this.render();
    });

    // Export (header + reports view)
    this.exportBtn.addEventListener("click", () => this.exportCSV());
    if (this.exportBtn2) this.exportBtn2.addEventListener("click", () => this.exportBtn.click());

    // Print (reports)
    if (this.printBtn) this.printBtn.addEventListener("click", () => window.print());

    // Tabs
    this.tabs.forEach(btn => {
      btn.addEventListener("click", () => this.showView(btn.dataset.view));
    });
  }

  // --- init ---
  init() {
    // cache DOM
    this.pageTitle     = document.getElementById("pageTitle");
    this.tabs          = document.querySelectorAll(".tab");
    this.views         = ["reservationsView","reportsView","aboutView","helpView"].map(id => document.getElementById(id));

    this.datePicker    = document.getElementById("datePicker");
    this.listEl        = document.getElementById("list");
    this.form          = document.getElementById("resForm");
    this.formMsg       = document.getElementById("formMsg");
    this.formTitle     = document.getElementById("formTitle");
    this.cancelEditBtn = document.getElementById("cancelEditBtn");
    this.newBtn        = document.getElementById("newBtn");
    this.startSelect   = document.getElementById("start");
    this.searchInput   = document.getElementById("searchInput");
    this.exportBtn     = document.getElementById("exportBtn");
    this.exportBtn2    = document.getElementById("exportBtn2");
    this.printBtn      = document.getElementById("printBtn");

    // defaults
    this.datePicker.value = this.today;
    this.form.date.value  = this.today;
    this.populateTimes(this.startSelect);
    if (this.startSelect.options.length) this.startSelect.value = this.startSelect.options[0].value;

    // seed sample if empty
    if (!this.store.all().length) {
      this.store.save([
        new Reservation({
          id: this.uuid(),
          name: "Sample Customer",
          phone: "555-555-5555",
          email: "sample@email.com",
          partySize: 2,
          date: this.today,
          start: "18:00",
          notes: ""
        })
      ]);
    }

    // bind + first render + default view
    this.bindEvents();
    this.showView("reservationsView");
  }
}

// ---- Boot ----
window.addEventListener("DOMContentLoaded", () => {
  const store = new ReservationStore();
  const app = new AppUI(store, { maxTables: 20 });
  app.init();
});


