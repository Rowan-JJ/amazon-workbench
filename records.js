import {materialize,rowKey} from './core.js';
export function planBatchDeletion(batches,ids){
 const selected=new Set(ids),removed=batches.filter(b=>selected.has(b.id)),remaining=batches.filter(b=>!selected.has(b.id));
 const impact=[...new Set(removed.map(b=>b.type))].map(type=>{
  const owners=new Map();for(const b of batches.filter(b=>b.type===type))for(const r of b.rows)owners.set(rowKey(type,r),b.id);
  const before=materialize(batches,type),after=materialize(remaining,type);
  const fallback=after.filter(r=>selected.has(owners.get(rowKey(type,r)))).length;
  return {type,before:before.length,after:after.length,fallback};
 });
 return {removed,remaining,impact,sourceRows:removed.reduce((n,b)=>n+b.rows.length,0)};
}
