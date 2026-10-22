export function validate(input) {
 if (!input || !Array.isArray(input.people) || !Array.isArray(input.shifts)) throw Error('Expected people and shifts arrays.');
 if (!input.people.length || input.people.length > 16 || !input.shifts.length || input.shifts.length > 12) throw Error('Use 1–16 volunteers and 1–12 shifts.');
 const unique = (items, label) => { if (new Set(items.map(x=>x.id)).size !== items.length) throw Error(`Duplicate ${label} IDs.`); };
 unique(input.people,'volunteer'); unique(input.shifts,'shift');
 const txt = v => typeof v==='string' && v.trim().length>0 && v.length<=80;
 let slots=0;
 for(const s of input.shifts) {
  if(!txt(s.id)||!txt(s.name)||!txt(s.role)||!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<0||s.end>1440||s.start>=s.end||!Number.isInteger(s.count)||s.count<1||s.count>8) throw Error('Each shift needs a name, role, valid same-day times and 1–8 places.');
  slots+=s.count;
 }
 if(slots>24) throw Error('Use at most 24 total places.');
 for(const p of input.people) {
  if(!txt(p.id)||!txt(p.name)||!Array.isArray(p.roles)||!p.roles.length||p.roles.some(x=>!txt(x))||!Array.isArray(p.available)||p.available.some(id=>!input.shifts.some(s=>s.id===id))||!Number.isInteger(p.maxShifts)||p.maxShifts<0||p.maxShifts>24||!Number.isInteger(p.maxMinutes)||p.maxMinutes<0||p.maxMinutes>1440) throw Error('Each volunteer needs a name, roles, valid availability and nonnegative integer limits.');
 }
 if(!Number.isInteger(input.restMinutes)||input.restMinutes<0||input.restMinutes>180) throw Error('Rest gap must be 0–180 minutes.');
 return input;
}
const role = s => s.trim().toLowerCase();
export const time = minute => `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
function can(p, s, assigned, input) {
 if(!p.roles.some(r=>role(r)===role(s.role)) || !p.available.includes(s.id)) return false;
 const mine=assigned.filter(a=>a.personId===p.id).map(a=>input.shifts.find(s=>s.id===a.shiftId));
 if(mine.length>=p.maxShifts||mine.reduce((n,x)=>n+x.end-x.start,0)+s.end-s.start>p.maxMinutes) return false;
 return mine.every(x=>x.id!==s.id && (s.start>=x.end+input.restMinutes || x.start>=s.end+input.restMinutes));
}
export function audit(input, assignments) {
 const errors=[], ids=new Set();
 for(const a of assignments) {
  const s=input.shifts.find(x=>x.id===a.shiftId),p=input.people.find(x=>x.id===a.personId);
  const key=a.shiftId+':'+a.place;
  if(!s||!p||!Number.isInteger(a.place)||a.place<1||a.place>s.count){errors.push('Unknown volunteer, shift or place.');continue;}
  if(ids.has(key)) errors.push('A place has multiple assignments.'); ids.add(key);
  const prior=assignments.filter(x=>x!==a&&x.personId===a.personId&&input.shifts.some(s=>s.id===x.shiftId));
  if(!can(p,s,prior,input))errors.push(`${p.name}: availability, role, time or workload violation.`);
 }
 const missing=[]; for(const s of input.shifts)for(let place=1;place<=s.count;place++)if(!ids.has(s.id+':'+place)) missing.push({shiftId:s.id,place});
 return { valid:errors.length===0, complete:errors.length===0&&!missing.length, errors, missing };
}
export function solve(input, budget=50000) {
 validate(input); if(!Number.isInteger(budget)||budget<1)throw Error('Search budget must be a positive integer.');
 const slots=input.shifts.flatMap(s=>Array.from({length:s.count},(_,i)=>({shiftId:s.id,place:i+1})));
 let visited=0,exhausted=false,best=[],answer=null;
 function search(todo,assigned) {
  if(assigned.length>best.length)best=assigned.map(x=>({...x}));
  if(!todo.length){answer=assigned.map(x=>({...x}));return true;}
  if(visited>=budget){exhausted=true;return false;} visited++;
  const options=todo.map(slot=>({slot,people:input.people.filter(p=>can(p,input.shifts.find(s=>s.id===slot.shiftId),assigned,input))}));
  options.sort((a,b)=>a.people.length-b.people.length||a.slot.shiftId.localeCompare(b.slot.shiftId)||a.slot.place-b.slot.place);
  const {slot,people}=options[0];
  const flexibility=p=>todo.filter(t=>{const s=input.shifts.find(s=>s.id===t.shiftId);return p.available.includes(s.id)&&p.roles.some(r=>role(r)===role(s.role));}).length;
  people.sort((a,b)=>assigned.filter(x=>x.personId===a.id).length-assigned.filter(x=>x.personId===b.id).length||flexibility(a)-flexibility(b)||a.id.localeCompare(b.id));
  const remaining=todo.filter(s=>s!==slot);
  for(const p of people){if(search(remaining,[...assigned,{...slot,personId:p.id}]))return true;if(exhausted)return false;}
  return false;
 }
 search(slots,[]);
 const assignments=answer||best, checked=audit(input,assignments);
 if(!checked.valid)throw Error('Internal validation failed; no roster may be exported.');
 const blockers=input.shifts.map(s=>({shift:s.name,eligible:input.people.filter(p=>can(p,s,[],input)).length,needed:s.count})).filter(x=>x.eligible<x.needed);
 return {schema:'shiftweave.plan.v1',status:answer?'complete':exhausted?'search_limit':'infeasible',assignments,visited,budget,unfilled:checked.missing,blockers,notes:'First feasible roster, not an optimal fairness solution. An incomplete draft is not a maximum-coverage guarantee. Same-day times only; no calendar, legal or fatigue guidance.'};
}
export const sample = () => ({restMinutes:15, shifts:[{id:'s1',name:'Welcome desk',role:'welcome',start:540,end:600,count:2},{id:'s2',name:'Stage setup',role:'tech',start:570,end:660,count:1},{id:'s3',name:'Welcome wrap-up',role:'welcome',start:630,end:690,count:1}],people:[{id:'p1',name:'Asha',roles:['welcome'],available:['s1','s3'],maxShifts:2,maxMinutes:150},{id:'p2',name:'Kabir',roles:['welcome','tech'],available:['s1','s2','s3'],maxShifts:2,maxMinutes:150},{id:'p3',name:'Leena',roles:['tech'],available:['s2'],maxShifts:1,maxMinutes:90},{id:'p4',name:'Rohan',roles:['welcome'],available:['s1'],maxShifts:1,maxMinutes:60}]});
