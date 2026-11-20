const hasFilter=f=>Boolean(f.owner||f.spu||f.tag);
export const alertTaskKey=(date,id,filters={})=>date+':'+id+(hasFilter(filters)?':'+JSON.stringify(filters):'');
export const alertAnchor=key=>'alert-'+encodeURIComponent(key);
export function pendingAlerts(items,tasks,date,filters){return new Set(items.filter(i=>!tasks[alertTaskKey(date,i.id,filters)]).map(i=>alertTaskKey(date,i.id,filters))).size;}

// Return positions are tab-local and separate for the real and demo workspaces.
export class AlertReturnStore{
 constructor(session){this.session=session;this.memory=new Map();}
 get(mode){if(this.memory.has(mode))return this.memory.get(mode);let value;try{value=JSON.parse(this.session?.getItem('popilush-alert-return-'+mode)||'null');}catch{}if(!value||typeof value.key!=='string'||typeof value.date!=='string'||!Number.isFinite(value.scrollY)||!Number.isFinite(value.offset)||!value.filters||typeof value.filters!=='object'||!['owner','spu','tag'].every(k=>typeof value.filters[k]==='string'))value=null;this.memory.set(mode,value);return value;}
 set(mode,value){const safe={key:String(value.key),date:String(value.date),filters:{owner:value.filters.owner||'',spu:value.filters.spu||'',tag:value.filters.tag||''},scrollY:Math.max(0,value.scrollY),offset:value.offset};this.memory.set(mode,safe);try{this.session?.setItem('popilush-alert-return-'+mode,JSON.stringify(safe));}catch{}return safe;}
 clear(mode){this.memory.delete(mode);try{this.session?.removeItem('popilush-alert-return-'+mode);}catch{}}
}

export function paintAlertHub({count,returning}){
 const button=document.getElementById('alert-fab'),badge=document.getElementById('alert-fab-count'),label=returning?`返回上次预警与待办位置，原范围${count}项未处理`:`预警与待办，当前范围${count}项未处理`;
 button.disabled=false;button.classList.toggle('has-pending',count>0);button.classList.toggle('is-return',returning);button.dataset.count=String(count);button.setAttribute('aria-label',label);badge.hidden=count===0;badge.textContent=count>99?'99+':String(count);document.getElementById('alert-fab-tooltip').textContent=returning?'回到刚才的待办位置':count?`${count}项未处理 · 预警与待办`:'预警与待办 · 暂无待处理项';
 const live=document.getElementById('alert-fab-status');if(live.textContent!==label)live.textContent=label;
}

export function restoreAlertPosition(context){
 const card=context.key?document.getElementById(alertAnchor(context.key)):null;
 if(card){
  const header=document.querySelector('header'),scope=document.querySelector('.scope-panel'),stickyBottom=Math.max(header&&getComputedStyle(header).position==='sticky'?header.getBoundingClientRect().bottom:0,scope&&getComputedStyle(scope).position==='sticky'?scope.getBoundingClientRect().bottom:0),top=Math.min(Math.max(context.offset,stickyBottom+18),Math.max(stickyBottom+18,innerHeight-160));
  window.scrollTo({top:Math.max(0,scrollY+card.getBoundingClientRect().top-top),behavior:'instant'});card.focus({preventScroll:true});card.classList.remove('alert-return-highlight');void card.offsetWidth;card.classList.add('alert-return-highlight');return true;
 }
 window.scrollTo({top:Math.max(0,context.scrollY||0),behavior:'instant'});return false;
}
