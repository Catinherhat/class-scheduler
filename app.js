const sample = `CCE-002 | MW 11:00am-12:20pm | Kerry White | PODEM 0274 | 2026-12-08 | 11:30am-2:29pm | PODEM 0274
CCE-002 | MW 2:00pm-3:20pm | Kerry White | PODEM 0273 | 2026-12-09 | 3:00pm-5:59pm | PODEM 0273`;
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const dayMap = {M:0,T:1,W:2,R:3,F:4,S:5,U:6};
let classes = [], activeView = 'normal';
const input = document.querySelector('#schedule-input');

function parseTime(value) {
  const m = value.trim().match(/(\d{1,2}):(\d{2})\s*(am|pm)/i); if (!m) return null;
  let hour = +m[1] % 12; if (m[3].toLowerCase() === 'pm') hour += 12;
  return hour * 60 + +m[2];
}
function formatTime(mins) { const h = Math.floor(mins/60), m = mins%60, suffix=h>=12?'pm':'am', display=h%12||12; return `${display}:${String(m).padStart(2,'0')}${suffix}`; }
function parseMeeting(text) {
  const match = text.trim().match(/^([MTWRFSU]+)\s+(.+)$/i); if (!match) return null;
  const range = match[2].split(/\s*-\s*/); const start=parseTime(range[0]), end=parseTime(range[1]);
  if (start === null || end === null || range.length !== 2) return null;
  return {days:[...match[1].toUpperCase()].map(d=>dayMap[d]).filter(d=>d !== undefined), start, end};
}
function parseSchedule() {
  const parsed=[]; const errors=[];
  input.value.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return; const p=line.split('|').map(x=>x.trim()); const meeting=parseMeeting(p[1]||'');
    const finalStart=parseTime((p[5]||'').split(/\s*-\s*/)[0]||''), finalEnd=parseTime((p[5]||'').split(/\s*-\s*/)[1]||'');
    if (p.length < 4 || !meeting) { errors.push(i+1); return; }
    parsed.push({id:`${p[0]}-${i}-${Date.now()}`, code:p[0], meeting, teacher:p[2]||'Teacher not listed', room:p[3]||'Room not listed', finalDate:p[4]||'', finalStart, finalEnd, finalRoom:p[6]||p[3]||'Room not listed', enrolled:false});
  });
  classes=parsed; document.querySelector('#import-message').textContent = errors.length ? `Loaded ${parsed.length} section(s). Could not read line ${errors.join(', ')}.` : `Loaded ${parsed.length} section(s). Choose the sections you want.`;
  render();
}
function renderCourseList() {
  const list=document.querySelector('#course-list'); const groups=Object.groupBy(classes, c=>c.code); list.innerHTML='';
  if (!classes.length) { list.innerHTML='<div class="empty-state">Your formatted classes will appear here.</div>'; return; }
  Object.entries(groups).forEach(([code, items])=> { const el=document.querySelector('#course-template').content.firstElementChild.cloneNode(true); el.querySelector('.course-code').textContent=code; el.querySelector('.section-total').textContent=`${items.length} section${items.length===1?'':'s'}`;
    el.querySelector('.course-toggle').addEventListener('click',()=>{el.classList.toggle('collapsed'); el.querySelector('.course-toggle').setAttribute('aria-expanded',!el.classList.contains('collapsed'));});
    const container=el.querySelector('.sections'); items.forEach(c=>{const card=document.createElement('div');card.className=`section-card ${c.enrolled?'enrolled':''}`; const meeting=`${c.meeting.days.map(d=>days[d].slice(0,3)).join('')} ${formatTime(c.meeting.start)}–${formatTime(c.meeting.end)}`;
      card.innerHTML=`<div class="section-time">${meeting}</div><div class="section-info">${c.teacher}<br>${c.room}${c.finalDate?`<br><strong>Final:</strong> ${c.finalDate} · ${formatTime(c.finalStart)}–${formatTime(c.finalEnd)}`:''}</div><button class="enroll-button ${c.enrolled?'enrolled':''}">${c.enrolled?'Unenroll':'Enroll'}</button>`;
      card.querySelector('button').onclick=()=>{c.enrolled=!c.enrolled;render();};container.append(card); }); list.append(el); });
  document.querySelector('#course-count').textContent=`${Object.keys(groups).length} course${Object.keys(groups).length===1?'':'s'}`;
}
function renderCalendar() {
  const calendar=document.querySelector('#calendar'); calendar.innerHTML='<div class="corner"></div>'; days.forEach((d,i)=>{const h=document.createElement('div');h.className='day-name';h.style.gridColumn=i+2;h.textContent=d;calendar.append(h);});
  const timeCol=document.createElement('div');timeCol.className='time-column'; for(let h=8;h<=20;h++){const t=document.createElement('span');t.className='time-label';t.style.top=`${(h-8)*60}px`;t.textContent=formatTime(h*60).replace(':00','');timeCol.append(t);} calendar.append(timeCol);
  const area=document.createElement('div');area.className='grid-area'; for(let i=0;i<7;i++){const col=document.createElement('div');col.className='day-column';col.style.left=`${i*100/7}%`;area.append(col);}
  classes.filter(c=>c.enrolled).forEach(c=>{if(activeView==='normal') c.meeting.days.forEach(day=>addEvent(area,c,day,c.meeting.start,c.meeting.end,false)); else if(c.finalDate && c.finalStart !== null && c.finalEnd !== null){const date=new Date(`${c.finalDate}T12:00:00`);addEvent(area,c,date.getDay()===0?6:date.getDay()-1,c.finalStart,c.finalEnd,true);}}); calendar.append(area);
  const n=classes.filter(c=>c.enrolled).length;document.querySelector('#enrollment-count').textContent=`${n} enrolled`; document.querySelector('#calendar-title').textContent=activeView==='normal'?'Normal week':'Finals week';document.querySelector('#calendar-caption').textContent=activeView==='normal'?'Enrolled sections are shown in blue.':'Your enrolled final exams are shown in gold.';
}
function addEvent(area,c,day,start,end,final) { const visibleStart=Math.max(start,480), visibleEnd=Math.min(end,1200); if(visibleEnd<=visibleStart)return; const event=document.createElement('article');event.className=`class-event${final?' final':''}`;event.style.left=`calc(${day*100/7}% + 3px)`;event.style.width=`calc(${100/7}% - 6px)`;event.style.top=`${visibleStart-480}px`;event.style.height=`${Math.max(42,visibleEnd-visibleStart-3)}px`; const room=final?c.finalRoom:c.room;event.innerHTML=`<span class="event-tag">${final?'FINAL':'ENROLLED'}</span><div class="event-time">${formatTime(start)} - ${formatTime(end)}</div><div class="event-code">${c.code}</div><div class="event-detail">${c.teacher}<br>${room}</div>`;area.append(event); }
function render(){renderCourseList();renderCalendar();}
document.querySelector('#parse-button').onclick=parseSchedule;document.querySelector('#load-sample').onclick=()=>{input.value=sample;parseSchedule();};document.querySelectorAll('.view-button').forEach(b=>b.onclick=()=>{activeView=b.dataset.view;document.querySelectorAll('.view-button').forEach(x=>x.classList.toggle('active',x===b));renderCalendar();});
input.value=sample;parseSchedule();
