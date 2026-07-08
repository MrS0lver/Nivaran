(function(){
  // ---------- Sample seed data ----------
  const DEPTS = {
    Sanitation: "Sanitation & Waste Dept.",
    Roads: "Public Works Dept.",
    Water: "Water Board",
    Electricity: "Power Utility",
    Billing: "Revenue & Billing Office",
    Other: "General Grievance Cell"
  };
  const SLA_HOURS = { Sanitation:72, Roads:120, Water:48, Electricity:24, Billing:96, Other:96 };

  let seq = 103; // last used sample number
  function nextId(){ seq += 1; return "CMP-2026-" + String(seq).padStart(6,"0"); }

  function hoursFromNow(h){ return new Date(Date.now() + h*3600*1000); }
  function hoursAgo(h){ return new Date(Date.now() - h*3600*1000); }
  function fmt(d){ return d.toLocaleDateString(undefined,{ day:'2-digit', month:'short', year:'numeric'}); }

  function makeHistory(status, filedAt){
    const hist = [{ label:"Submitted", date: filedAt }];
    if (["In Progress","Resolved","Escalated"].includes(status)) hist.push({ label:"Auto-routed", date: new Date(filedAt.getTime()+30*60000) });
    if (["In Progress","Resolved","Escalated"].includes(status)) hist.push({ label:"In Progress", date: new Date(filedAt.getTime()+6*3600000) });
    if (status === "Resolved") hist.push({ label:"Resolved", date: new Date(filedAt.getTime()+40*3600000) });
    if (status === "Escalated") hist.push({ label:"Escalated", date: new Date(filedAt.getTime()+80*3600000) });
    return hist;
  }

  function buildComplaint(id, category, status, filedHoursAgo, desc, location){
    const filedAt = hoursAgo(filedHoursAgo);
    const slaH = SLA_HOURS[category];
    const deadline = new Date(filedAt.getTime() + slaH*3600000);
    return {
      id, category, department: DEPTS[category], status,
      filedAt, deadline, description: desc, location, anonymous:false,
      history: makeHistory(status, filedAt)
    };
  }

  let complaints = [
    buildComplaint("CMP-2026-000101","Sanitation","Resolved", 220, "Garbage not collected for over a week near the market lane.", "Sector 12 Market Road"),
    buildComplaint("CMP-2026-000102","Roads","In Progress", 90, "Large pothole causing traffic near the flyover entrance.", "Ring Road Flyover"),
    buildComplaint("CMP-2026-000103","Water","Escalated", 130, "No water supply for three days in the residential block.", "Block D, Lakeview Colony"),
    buildComplaint("CMP-2026-000104","Electricity","Open", 10, "Frequent power cuts in the evening, transformer may be faulty.", "Green Park Extension"),
    buildComplaint("CMP-2026-000105","Billing","In Progress", 40, "Water bill shows double the usual amount this month.", "N/A"),
    buildComplaint("CMP-2026-000106","Sanitation","Open", 4, "Overflowing public bin attracting pests near the school.", "Near Municipal School No. 4"),
    buildComplaint("CMP-2026-000107","Roads","Resolved", 260, "Broken streetlight left the lane unlit for weeks.", "Old Town Lane 3"),
    buildComplaint("CMP-2026-000108","Other","Open", 20, "Staff at the ward office were unresponsive to a request.", "Ward Office 9")
  ];

  // ---------- View switching ----------
  const tabs = document.querySelectorAll(".tab-btn");
  const views = document.querySelectorAll(".view");
  tabs.forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));

  function switchView(name){
    tabs.forEach(b => { const on = b.dataset.view===name; b.classList.toggle("active",on); b.setAttribute("aria-selected", on); });
    views.forEach(v => v.classList.toggle("active", v.id === "view-"+name));
    if (name === "dashboard") renderDashboard();
  }

  // ---------- Submission form ----------
  const form = document.getElementById("complaint-form");
  const descEl = document.getElementById("description");
  const charCount = document.getElementById("char-count");
  descEl.addEventListener("input", () => charCount.textContent = descEl.value.length);

  document.querySelectorAll('input[name="idmode"]').forEach(r => r.addEventListener("change", () => {
    const anon = document.querySelector('input[name="idmode"]:checked').value === "anon";
    document.getElementById("named-fields").style.display = anon ? "none" : "block";
  }));

  const mediaInput = document.getElementById("media");
  mediaInput.addEventListener("change", () => {
    const list = document.getElementById("file-list");
    list.innerHTML = "";
    Array.from(mediaInput.files).forEach(f => {
      const d = document.createElement("div");
      d.textContent = "📎 " + f.name;
      list.appendChild(d);
    });
  });

  function setInvalid(fieldId, invalid){
    document.getElementById(fieldId).classList.toggle("invalid", invalid);
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    const category = document.getElementById("category").value;
    const desc = descEl.value.trim();
    const anon = document.querySelector('input[name="idmode"]:checked').value === "anon";
    const name = document.getElementById("fullname").value.trim();
    const contact = document.getElementById("contact").value.trim();

    let valid = true;
    setInvalid("f-category", !category); if(!category) valid=false;
    setInvalid("f-desc", desc.length < 20); if(desc.length<20) valid=false;
    if (!anon){
      setInvalid("f-name", name.length===0); if(!name) valid=false;
      setInvalid("f-contact", contact.length===0); if(!contact) valid=false;
    } else {
      setInvalid("f-name", false); setInvalid("f-contact", false);
    }
    if(!valid) return;

    const id = nextId();
    const location = document.getElementById("location").value.trim() || "N/A";
    const rec = buildComplaint(id, category, "Open", 0, desc, location);
    rec.anonymous = anon;
    complaints.unshift(rec);

    document.getElementById("new-tracking-id").textContent = id;
    document.getElementById("confirmation-card").style.display = "block";
    document.getElementById("confirmation-card").scrollIntoView({behavior:"smooth", block:"center"});
    form.reset();
    charCount.textContent = "0";
    document.getElementById("file-list").innerHTML = "";
    document.getElementById("named-fields").style.display = "block";

    window.__lastId = id;
  });

  document.getElementById("btn-file-another").addEventListener("click", () => {
    document.getElementById("confirmation-card").style.display = "none";
  });
  document.getElementById("btn-track-new").addEventListener("click", () => {
    switchView("track");
    document.getElementById("track-input").value = window.__lastId || "";
    lookupTracking();
  });

  // ---------- Tracking ----------
  const STEP_ORDER = ["Submitted","Auto-routed","In Progress","Resolved"];

  function badgeClass(status){
    return { Open:"badge-open", "In Progress":"badge-progress", Resolved:"badge-resolved", Escalated:"badge-escalated" }[status] || "badge-open";
  }

  function renderRail(complaint){
    const rail = document.getElementById("tr-rail");
    rail.innerHTML = "";
    const steps = complaint.status === "Escalated"
      ? ["Submitted","Auto-routed","In Progress","Escalated"]
      : STEP_ORDER;
    const doneLabels = complaint.history.map(h=>h.label);
    steps.forEach((label, i) => {
      const histEntry = complaint.history.find(h=>h.label===label);
      const done = !!histEntry;
      const isCurrent = label === (complaint.status === "Escalated" ? "Escalated" : (complaint.status === "Resolved" ? "Resolved" : (complaint.status==="In Progress"?"In Progress":"Submitted")));
      const div = document.createElement("div");
      div.className = "rail-step " + (done ? (label===complaint.status || (label==="Resolved"&&complaint.status==="Resolved") || (label==="Escalated"&&complaint.status==="Escalated") ? "current":"done") : "");
      div.innerHTML = `<div class="connector"></div><div class="node">${done?"✓":i+1}</div><div class="label">${label}</div><div class="date">${histEntry?fmt(histEntry.date):"—"}</div>`;
      rail.appendChild(div);
    });
  }

  function lookupTracking(){
    const q = document.getElementById("track-input").value.trim().toUpperCase();
    const found = complaints.find(c => c.id.toUpperCase() === q);
    if (!found){
      document.getElementById("track-empty").style.display = "block";
      document.getElementById("track-empty").innerHTML = q
        ? `No case found for <strong>${q}</strong>. Check the tracking number and try again.`
        : `Enter a tracking number above to view its status. Try <strong>CMP-2026-000104</strong> from the sample case list.`;
      document.getElementById("track-result").style.display = "none";
      return;
    }
    document.getElementById("track-empty").style.display = "none";
    document.getElementById("track-result").style.display = "block";
    document.getElementById("tr-id").textContent = found.id;
    document.getElementById("tr-category").textContent = found.category + " Complaint";
    const badge = document.getElementById("tr-badge");
    badge.className = "badge " + badgeClass(found.status);
    badge.textContent = found.status;
    document.getElementById("tr-dept").textContent = found.department;
    document.getElementById("tr-filed").textContent = fmt(found.filedAt);
    const breached = found.status !== "Resolved" && Date.now() > found.deadline.getTime();
    document.getElementById("tr-sla").textContent = fmt(found.deadline) + (breached ? "  (breached)" : "");
    document.getElementById("tr-sla").style.color = breached ? "var(--rust)" : "var(--ink)";
    document.getElementById("tr-desc").textContent = found.description;
    renderRail(found);
  }
  document.getElementById("track-btn").addEventListener("click", lookupTracking);
  document.getElementById("track-input").addEventListener("keydown", e => { if(e.key==="Enter") lookupTracking(); });

  // ---------- Dashboard ----------
  const deptFilter = document.getElementById("filter-dept");
  Object.values(DEPTS).forEach(d => {
    const o = document.createElement("option"); o.value=d; o.textContent=d; deptFilter.appendChild(o);
  });

  function slaTag(c){
    if (c.status === "Resolved") return `<span class="sla-tag ok">Met</span>`;
    const now = Date.now();
    const remainMs = c.deadline.getTime() - now;
    if (remainMs < 0) return `<span class="sla-tag breach">Breached</span>`;
    const remainH = remainMs/3600000;
    if (remainH < 24) return `<span class="sla-tag warn">${Math.round(remainH)}h left</span>`;
    return `<span class="sla-tag ok">${Math.round(remainH/24)}d left</span>`;
  }

  function statusColor(status){
    return { Open:"#B9770E", "In Progress":"#1F2E52", Resolved:"#0F6E63", Escalated:"#A23B32" }[status];
  }
  function statusBg(status){
    return { Open:"var(--amber-bg)", "In Progress":"#E3EAF6", Resolved:"var(--green-bg)", Escalated:"var(--rust-bg)" }[status];
  }

  function renderStats(list){
    const open = list.filter(c=>c.status==="Open").length;
    const inprog = list.filter(c=>c.status==="In Progress").length;
    const resolved = list.filter(c=>c.status==="Resolved").length;
    const breached = list.filter(c=>c.status!=="Resolved" && Date.now()>c.deadline.getTime()).length;
    const row = document.getElementById("stat-row");
    row.innerHTML = `
      <div class="stat-card"><div class="num">${open}</div><div class="lbl">Open cases</div></div>
      <div class="stat-card"><div class="num">${inprog}</div><div class="lbl">In progress</div></div>
      <div class="stat-card"><div class="num">${resolved}</div><div class="lbl">Resolved</div></div>
      <div class="stat-card warn"><div class="num">${breached}</div><div class="lbl">SLA breached</div></div>
    `;
  }

  function renderDashboard(){
    const deptV = deptFilter.value;
    const statusV = document.getElementById("filter-status").value;
    const searchV = document.getElementById("filter-search").value.trim().toLowerCase();

    let list = complaints.filter(c => {
      if (deptV && c.department !== deptV) return false;
      if (statusV && c.status !== statusV) return false;
      if (searchV && !(c.id.toLowerCase().includes(searchV) || c.description.toLowerCase().includes(searchV))) return false;
      return true;
    });

    renderStats(complaints);
    document.getElementById("results-count").textContent = list.length + " of " + complaints.length + " cases";

    const body = document.getElementById("dash-body");
    body.innerHTML = "";
    list.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="mono">${c.id}</td>
        <td>${c.category}</td>
        <td>${c.department}</td>
        <td>${fmt(c.filedAt)}</td>
        <td>${slaTag(c)}</td>
        <td>
          <select class="status-select" data-id="${c.id}" style="background:${statusBg(c.status)}; color:${statusColor(c.status)}">
            ${["Open","In Progress","Resolved","Escalated"].map(s=>`<option value="${s}" ${s===c.status?"selected":""}>${s}</option>`).join("")}
          </select>
        </td>`;
      body.appendChild(tr);
    });

    body.querySelectorAll(".status-select").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const rec = complaints.find(c => c.id === e.target.dataset.id);
        rec.status = e.target.value;
        rec.history = makeHistory(rec.status, rec.filedAt);
        renderDashboard();
      });
    });
  }

  [deptFilter, document.getElementById("filter-status")].forEach(el => el.addEventListener("change", renderDashboard));
  document.getElementById("filter-search").addEventListener("input", renderDashboard);

  renderDashboard();
})();
