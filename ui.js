import {sample,validate,solve,audit,time} from './solver.js';
const $=id=>document.getElementById(id);
let input=null,plan=null,reviewedInput=null,version=0,serial=100;
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function invalidate(){plan=null;reviewedInput=null;$('result').hidden=true;$('approve').checked=false;$('export').disabled=$('print').disabled=true;message('Inputs changed. Build a new roster before approval or export.');}
function field(label,value,type,onchange,attrs={}){const l=node('label',label),e=node('input');e.type=type;e.value=value;Object.assign(e,attrs);e.oninput=()=>{onchange(e.value);invalidate();};if(label==='Duty name')e.onchange=render;l.append(e);return l;}
function render(){
 $('editor').hidden=false;$('rest').value=input.restMinutes;$('shifts').replaceChildren();$('people').replaceChildren();
 input.shifts.forEach((s,i)=>{
  const card=node('div',undefined,'entry'),head=node('div',undefined,'entryhead');head.append(node('strong',`DUTY ${i+1}`));const remove=node('button','Remove');remove.setAttribute('aria-label',`Remove duty ${i+1}`);remove.onclick=()=>{input.shifts=input.shifts.filter(x=>x!==s);input.people.forEach(p=>p.available=p.available.filter(id=>id!==s.id));invalidate();render();};head.append(remove);card.append(head);
  const fields=node('div',undefined,'fields');fields.append(field('Duty name',s.name,'text',v=>s.name=v,{maxLength:80}),field('Required role',s.role,'text',v=>s.role=v,{maxLength:80}),field('Start',time(s.start),'time',v=>s.start=minutes(v)),field('End',time(s.end),'time',v=>s.end=minutes(v)),field('Places',s.count,'number',v=>s.count=Number(v),{min:1,max:8}));card.append(fields);$('shifts').append(card);
 });
 input.people.forEach((p,i)=>{
  const card=node('div',undefined,'entry'),head=node('div',undefined,'entryhead');head.append(node('strong',`VOLUNTEER ${i+1}`));const remove=node('button','Remove');remove.setAttribute('aria-label',`Remove volunteer ${i+1}`);remove.onclick=()=>{input.people=input.people.filter(x=>x!==p);invalidate();render();};head.append(remove);card.append(head);
  const fields=node('div',undefined,'fields');fields.append(field('Name / initials',p.name,'text',v=>p.name=v,{maxLength:80}),field('Roles (comma-separated)',p.roles.join(', '),'text',v=>p.roles=v.split(',').map(x=>x.trim()).filter(Boolean),{maxLength:160}),field('Maximum duties',p.maxShifts,'number',v=>p.maxShifts=Number(v),{min:0,max:24}),field('Maximum minutes',p.maxMinutes,'number',v=>p.maxMinutes=Number(v),{min:0,max:1440}));card.append(fields);
  const avail=node('fieldset',undefined,'availability');avail.append(node('legend','Available for (explicit consent required)'));
  input.shifts.forEach(s=>{const l=node('label'),c=node('input');c.type='checkbox';c.checked=p.available.includes(s.id);c.onchange=()=>{p.available=p.available.filter(id=>id!==s.id);if(c.checked)p.available.push(s.id);invalidate();};l.append(c,document.createTextNode(` ${s.name} · ${time(s.start)}–${time(s.end)}`));avail.append(l);});card.append(avail);$('people').append(card);
 });
}
function minutes(v){if(!/^\d\d:\d\d$/.test(v))return NaN;const [h,m]=v.split(':').map(Number);return h*60+m;}
function load(next){validate(next);input=structuredClone(next);invalidate();render();message('Plan loaded locally. Set real constraints, then build a roster.');}
function drawPlan(){
 $('result').hidden=false;const complete=plan.status==='complete';$('outcome').className=complete?'':'warn';
 const headline=complete?'All places covered.':plan.status==='infeasible'?'No complete roster fits these constraints.':'Search budget reached — feasibility is unresolved.';
 const details=complete?'Every assignment passed the availability, role, overlap, rest and workload checks.':plan.blockers.map(b=>`${b.shift}: ${b.eligible} eligible for ${b.needed} places`).join('; ');
 $('outcome').textContent=`${headline} ${plan.assignments.length} assigned, ${plan.unfilled.length} open. ${details||'No individual duty has an obvious eligibility shortage; conflicts may involve overlap, rest or combined workload.'} ${!complete?'Any visible assignments are an incomplete draft, not a maximum-coverage solution.':''}`;
 const table=node('table'),thead=node('thead'),tr=node('tr');['Duty','Time','Role','Place','Volunteer'].forEach(x=>tr.append(node('th',x)));thead.append(tr);table.append(thead);const body=node('tbody');
 for(const s of input.shifts)for(let place=1;place<=s.count;place++){const a=plan.assignments.find(x=>x.shiftId===s.id&&x.place===place),r=node('tr');const name=a?input.people.find(p=>p.id===a.personId).name:'OPEN';[s.name,`${time(s.start)}–${time(s.end)}`,s.role,place,name].forEach((x,i)=>r.append(node('td',String(x),!a&&i===4?'gap':undefined)));body.append(r);}table.append(body);$('schedule').replaceChildren(table);
 $('loads').replaceChildren();input.people.forEach(p=>{const mine=plan.assignments.filter(x=>x.personId===p.id),mins=mine.reduce((n,a)=>{const s=input.shifts.find(s=>s.id===a.shiftId);return n+s.end-s.start;},0);const card=node('div',p.name,'load');card.append(node('span',`${mine.length}/${p.maxShifts} duties · ${mins}/${p.maxMinutes} min`));$('loads').append(card);});
 $('limits').textContent=`${plan.visited.toLocaleString()} search states explored; cap ${plan.budget.toLocaleString()}. ${plan.notes} Infeasible means all complete-assignment branches were eliminated; this does not prove the partial draft covers the most places.`;
 $('approve').checked=false;$('export').disabled=$('print').disabled=true;
}
$('sample').onclick=()=>{version++;load(sample());};
$('new').onclick=()=>{version++;load({restMinutes:0,shifts:[{id:'s1',name:'New duty',role:'welcome',start:540,end:600,count:1}],people:[{id:'p1',name:'Volunteer A',roles:['welcome'],available:[],maxShifts:1,maxMinutes:60}]});};
$('addshift').onclick=()=>{input.shifts.push({id:'s'+serial++,name:'New duty',role:'welcome',start:600,end:660,count:1});invalidate();render();};
$('addperson').onclick=()=>{input.people.push({id:'p'+serial++,name:'New volunteer',roles:['welcome'],available:[],maxShifts:1,maxMinutes:120});invalidate();render();};
$('rest').oninput=()=>{input.restMinutes=Number($('rest').value);invalidate();};
$('solve').onclick=()=>{try{validate(input);plan=solve(input);reviewedInput=JSON.stringify(input);drawPlan();message('Roster checked. Inspect coverage, workload and limitations before approval.');}catch(e){invalidate();message(e.message,true);}};
$('approve').onchange=()=>{$('export').disabled=$('print').disabled=!($('approve').checked&&plan&&reviewedInput===JSON.stringify(input));};
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('saveinput').onclick=()=>{try{validate(input);download(input,'shiftweave-input.json');}catch(e){message(e.message,true);}};
$('export').onclick=()=>{if(!plan||!$('approve').checked||reviewedInput!==JSON.stringify(input))return;const check=audit(input,plan.assignments);if(!check.valid){invalidate();message('Independent roster audit failed.',true);return;}download({project:'ShiftWeave',input,plan,audit:check,warning:'This file contains volunteer names and availability. Store it appropriately. Confirm arrangements with participants; no fairness optimum claimed.'},'shiftweave-reviewed-roster.json');};
$('print').onclick=()=>{if(plan&&$('approve').checked&&reviewedInput===JSON.stringify(input))window.print();};
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;const v=++version;try{if(f.size>100000)throw Error('Use a JSON file smaller than100KB.');const text=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());if(v===version)load(JSON.parse(text));}catch(err){if(v===version)message('Import rejected: '+err.message,true);}e.target.value='';};
