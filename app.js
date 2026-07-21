const sample = `SE-101A | (TR) 2:00pm–3:20pm | MOS 0114 | (W) 1:00pm–1:50pm | MOS 0113 | Machel Morrison | 2026-12-10 | 3:00pm–5:59pm | MOS 0114
CCE-002 | (MW) 11:00am–12:20pm | PODEM 0274 | (F) 10:00am–10:50am | PODEM 0275 | Kerry White | 2026-12-08 | 11:30am–2:29pm | PODEM 0274
CCE-002 | (MW) 2:00pm–3:20pm | PODEM 0273 | (F) 1:00pm–1:50pm | PODEM 0276 | Kerry White | 2026-12-09 | 3:00pm–5:59pm | PODEM 0273`;
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const dayMap = {M:0,T:1,W:2,R:3,F:4,S:5,U:6};
let classes = [], activeView = 'normal';
const input = document.querySelector('#schedule-input');

function parseTime(value) { const m=value.trim().match(/(\d{1,2}):(\d{2})\s*(am|pm)/i); if(!m)return null; let h=+m[1]%12; if(m[3].toLowerCase()==='pm')h+=12; return h*60 + +m[2]; }
function formatTime(mins) { if(mins===null)return 'Time not listed'; const h=Math.floor(mins/60),m=mins%60,s=h>=12?'pm':'am'; return `${h%12||12}:${String(m).padStart(2,'0')}${s}`; }
function parseMeeting(text) { const cleaned=text.trim().replace(/^\(([^)]+)\)/,'$1').replace(/–/g,'-'); const match=cleaned.match(/^([MTWRFSU]+)\s+(.+)$/i); if(!match)return null; const range=match[2].split(/\s*-\s*/),start=parseTime(range[0]),end=parseTime(range[1]); if(start===null||end===null||range.length!==2)return null; return {days:[...match[1].toUpperCase()].map(d=>dayMap[d]).filter(d=>d!==undefined),start,end}; }
function parseSchedule() {
  const parsed=[],errors=[];
  input.value.split(/\r?\n/).forEach((line,i)=>{
    if(!line.trim())return;
    const p=line.split('|').map(x=>x.trim());
    const lecture=parseMeeting(p[1]||''), discussion=parseMeeting(p[3]||'');
    if(p.length!==9 || !lecture || !discussion){errors.push(i+1);return;}
    const finalRange=(p[7]||'').split(/\s*[-–]\s*/);
    const finalStart=parseTime(finalRange[0]||''), finalEnd=parseTime(finalRange[1]||'');
    parsed.push({
      id:`${p[0]}-${i}-${Date.now()}`,
      code:p[0],
      meetings:[
        {...lecture,label:'Lecture',room:p[2]||'Room not listed'},
        {...discussion,label:'Discussion',room:p[4]||'Room not listed'}
      ],
      teacher:p[5]||'Teacher not listed',
      finalDate:p[6]||'', finalStart, finalEnd,
      finalRoom:p[8]||'Room not listed', enrolled:false
    });
  });
  classes=parsed; document.querySelector('#import-message').textContent=errors.length?`Loaded ${parsed.length} section(s). Check line ${errors.join(', ')}: use all 9 columns in the shown order.`:`Loaded ${parsed.length} section(s). Choose the sections you want.`; render();
}
function renderCourseList() {
  const list=document.querySelector('#course-list'),groups=Object.groupBy(classes,c=>c.code); list.innerHTML='';
  if(!classes.length){list.innerHTML='<div class="empty-state">Your formatted classes will appear here.</div>';return;}
  Object.entries(groups).forEach(([code,items])=>{const el=document.querySelector('#course-template').content.firstElementChild.cloneNode(true);el.querySelector('.course-code').textContent=code;el.querySelector('.section-total').textContent=`${items.length} section${items.length===1?'':'s'}`;
    el.querySelector('.course-toggle').onclick=()=>{el.classList.toggle('collapsed');el.querySelector('.course-toggle').setAttribute('aria-expanded',!el.classList.contains('collapsed'));};
    const container=el.querySelector('.sections');items.forEach(c=>{const card=document.createElement('div');card.className=`section-card ${c.enrolled?'enrolled':''}`;const meetingText=c.meetings.map(m=>`<strong>${m.label}:</strong> ${m.days.map(d=>days[d].slice(0,3)).join('')} ${formatTime(m.start)}–${formatTime(m.end)}<br>${m.room}`).join('<br>');
      card.innerHTML=`<div class="section-time">${c.teacher}</div><div class="section-info">${meetingText}${c.finalDate?`<br><strong>Final:</strong> ${c.finalDate} · ${formatTime(c.finalStart)}–${formatTime(c.finalEnd)}<br>${c.finalRoom}`:''}</div><button class="enroll-button ${c.enrolled?'enrolled':''}">${c.enrolled?'Unenroll':'Enroll'}</button>`;card.querySelector('button').onclick=()=>{c.enrolled=!c.enrolled;render();};container.append(card);});list.append(el);});
  document.querySelector('#course-count').textContent=`${Object.keys(groups).length} course${Object.keys(groups).length===1?'':'s'}`;
}
function getFinalDates() { const finals=classes.filter(c=>c.enrolled&&c.finalDate).map(c=>new Date(`${c.finalDate}T12:00:00`)); const seed=finals.length?new Date(Math.min(...finals)):new Date(); const start=new Date(seed); start.setDate(seed.getDate()-((seed.getDay()+1)%7)); return Array.from({length:8},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;}); }
function formatDate(date) { return `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`; }
function renderCalendar() {
  const finalDates=activeView==='finals'?getFinalDates():null, calendar=document.querySelector('#calendar'),calendarDays=finalDates||days;calendar.style.gridTemplateColumns=`52px repeat(${calendarDays.length}, minmax(105px,1fr))`;calendar.innerHTML='<div class="corner"></div>';calendarDays.forEach((d,i)=>{const h=document.createElement('div');h.className='day-name';h.style.gridColumn=i+2;h.innerHTML=finalDates?`${days[(d.getDay()+6)%7].slice(0,3)}<br><span class="date-label">${formatDate(d)}</span>`:d;calendar.append(h);});
  const timeCol=document.createElement('div');timeCol.className='time-column';for(let h=8;h<=20;h++){const t=document.createElement('span');t.className='time-label';t.style.top=`${(h-8)*60}px`;t.textContent=formatTime(h*60).replace(':00','');timeCol.append(t);}calendar.append(timeCol);
  const area=document.createElement('div');area.className='grid-area';area.style.gridColumn=`2 / ${calendarDays.length+2}`;for(let i=0;i<calendarDays.length;i++){const col=document.createElement('div');col.className='day-column';col.style.left=`${i*100/calendarDays.length}%`;col.style.width=`${100/calendarDays.length}%`;area.append(col);}
  classes.filter(c=>c.enrolled).forEach(c=>{if(activeView==='normal')c.meetings.forEach(m=>m.days.forEach(day=>addEvent(area,c,day,m.start,m.end,false,m,7)));else if(c.finalDate&&c.finalStart!==null&&c.finalEnd!==null){const date=new Date(`${c.finalDate}T12:00:00`),day=finalDates.findIndex(d=>d.toDateString()===date.toDateString());if(day>=0)addEvent(area,c,day,c.finalStart,c.finalEnd,true,null,finalDates.length);}});calendar.append(area);
  const n=classes.filter(c=>c.enrolled).length;document.querySelector('#enrollment-count').textContent=`${n} enrolled`;document.querySelector('#calendar-title').textContent=activeView==='normal'?'Normal week':'Finals week';document.querySelector('#calendar-caption').textContent=activeView==='normal'?'Enrolled lectures and discussions are shown in blue.':'Your enrolled final exams are shown in gold.';
}
function addEvent(area,c,day,start,end,final,meeting,columnCount) { const visibleStart=Math.max(start,480),visibleEnd=Math.min(end,1200);if(visibleEnd<=visibleStart)return;const event=document.createElement('article');event.className=`class-event${final?' final':''}`;event.style.left=`calc(${day*100/columnCount}% + 3px)`;event.style.width=`calc(${100/columnCount}% - 6px)`;event.style.top=`${visibleStart-480}px`;event.style.height=`${Math.max(42,visibleEnd-visibleStart-3)}px`;const room=final?c.finalRoom:meeting.room,tag=final?'FINAL':meeting.label.toUpperCase();event.innerHTML=`<span class="event-tag">${tag}</span><div class="event-time">${formatTime(start)} - ${formatTime(end)}</div><div class="event-code">${c.code}</div><div class="event-detail">${c.teacher}<br>${room}</div>`;area.append(event); }
function render(){renderCourseList();renderCalendar();}
document.querySelector('#parse-button').onclick=parseSchedule;document.querySelector('#load-sample').onclick=()=>{input.value=sample;parseSchedule();};document.querySelectorAll('.view-button').forEach(b=>b.onclick=()=>{activeView=b.dataset.view;document.querySelectorAll('.view-button').forEach(x=>x.classList.toggle('active',x===b));renderCalendar();});input.value=sample;parseSchedule();
