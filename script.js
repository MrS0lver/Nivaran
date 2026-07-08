  // ---------- Navigation ----------
  const tabs = document.querySelectorAll('.tab-btn');
  const pages = document.querySelectorAll('.page');
  function goTo(name){
    pages.forEach(p => p.classList.toggle('active', p.id === name));
    tabs.forEach(t => t.classList.toggle('active', t.dataset.page === name));
    document.querySelector('nav.tabs').classList.remove('open');
    window.scrollTo({top:0, behavior:'smooth'});
  }
  tabs.forEach(t => t.addEventListener('click', () => goTo(t.dataset.page)));

  // ---------- In-memory complaint store (seeded) ----------
  let complaints = [
    {id:'CMP-7K3XQ2', cat:'Water Supply', dept:'Municipal Corp.', status:'progress', date:'08 Jul 2026'},
    {id:'CMP-4B9NP1', cat:'Electricity', dept:'Electricity Bd.', status:'resolved', date:'04 Jul 2026'},
    {id:'CMP-2X7VD8', cat:'Road & Infrastructure', dept:'PWD', status:'new', date:'09 Jul 2026'},
    {id:'CMP-9Q1LM4', cat:'Sanitation & Waste', dept:'Municipal Corp.', status:'resolved', date:'01 Jul 2026'},
    {id:'CMP-5R8KT0', cat:'Public Safety', dept:'Police Dept.', status:'progress', date:'07 Jul 2026'},
  ];
  const deptMap = {
    'Water Supply':'Municipal Corp.', 'Electricity':'Electricity Bd.', 'Road & Infrastructure':'PWD',
    'Sanitation & Waste':'Municipal Corp.', 'Public Safety':'Police Dept.', 'Billing / Payments':'Accounts Dept.', 'Other':'General Desk'
  };
  const statusStepMap = {new:2, progress:3, resolved:4};

  function renderTable(){
    const body = document.getElementById('recentTableBody');
    body.innerHTML = '';
    complaints.slice(0,6).reverse().forEach(c => {
      const pillClass = c.status === 'resolved' ? 'resolved' : (c.status === 'progress' ? 'progress' : 'new');
      const pillText = c.status === 'resolved' ? 'Resolved' : (c.status === 'progress' ? 'In Progress' : 'New');
      body.insertAdjacentHTML('beforeend', `
        <tr>
          <td class="mono">${c.id}</td>
          <td>${c.cat}</td>
          <td><span class="pill ${pillClass}">${pillText}</span></td>
          <td>${c.date}</td>
        </tr>`);
    });
  }
  renderTable();

  // ---------- Submit complaint ----------
  function genId(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let s = 'CMP-';
    for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
    return s;
  }
  function submitComplaint(e){
    e.preventDefault();
    const cat = document.getElementById('fcat').value;
    const id = genId();
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
    const dept = deptMap[cat] || 'General Desk';

    complaints.push({id, cat, dept, status:'new', date: dateStr.replace(/ /g,' ')});
    renderTable();

    document.getElementById('newTicketId').textContent = id;
    document.getElementById('newTicketCat').textContent = cat;
    document.getElementById('newTicketDate').textContent = dateStr;
    document.getElementById('newTicketDept').textContent = dept;
    document.getElementById('resultTicket').classList.add('show');
    document.getElementById('complaintForm').reset();
    document.getElementById('resultTicket').scrollIntoView({behavior:'smooth', block:'center'});
    return false;
  }

  // ---------- Track complaint ----------
  function trackComplaint(){
    const val = document.getElementById('trackInput').value.trim().toUpperCase();
    const found = complaints.find(c => c.id === val);
    const timeline = document.getElementById('timeline');
    const notFound = document.getElementById('notFound');
    if(!found){
      timeline.style.display = 'none';
      notFound.classList.add('show');
      return;
    }
    notFound.classList.remove('show');
    timeline.style.display = 'block';
    const activeStep = statusStepMap[found.status];
    document.querySelectorAll('.tl-item').forEach(item => {
      const step = parseInt(item.dataset.step);
      item.classList.remove('done','active','pending');
      if(step < activeStep) item.classList.add('done');
      else if(step === activeStep) item.classList.add('active');
      else item.classList.add('pending');
    });
  }

  // ---------- Auth tabs (UI only) ----------
  function switchAuth(which){
    const isLogin = which === 'login';
    document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
    document.getElementById('registerForm').style.display = isLogin ? 'none' : 'block';
    document.getElementById('loginTabBtn').style.background = isLogin ? 'var(--indigo)' : 'transparent';
    document.getElementById('loginTabBtn').style.color = isLogin ? '#fff' : 'var(--indigo)';
    document.getElementById('registerTabBtn').style.background = isLogin ? 'transparent' : 'var(--indigo)';
    document.getElementById('registerTabBtn').style.color = isLogin ? 'var(--indigo)' : '#fff';
  }
  function doLogin(e){
    e.preventDefault();
    const msg = document.getElementById('loginMsg');
    msg.style.display = 'block';
    msg.textContent = 'Logged in successfully — redirecting to your dashboard… (demo only, no backend)';
    setTimeout(() => goTo('dashboard'), 900);
    return false;
  }
  function doRegister(e){
    e.preventDefault();
    const msg = document.getElementById('registerMsg');
    msg.style.display = 'block';
    msg.textContent = 'Account created. You can now log in.';
    setTimeout(() => switchAuth('login'), 1000);
    return false;
  }
