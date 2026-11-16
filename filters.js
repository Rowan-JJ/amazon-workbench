import {materialize} from './core.js';
const text=v=>String(v??'').trim();
export function listingTags(row){const raw=Object.entries(row).find(([k])=>k.toLowerCase()==='listing标签')?.[1];return [...new Set(text(raw).split(/[,，;；\n、]+/).map(text).filter(Boolean))];}
export const activeFilter=f=>Boolean(f.owner||f.spu||f.tag);
export function buildCatalog(batches,date){
 const parents=materialize(batches,'parent',date),children=materialize(batches,'child',date),map=new Map();
 // Use metadata from the selected date only. Do not silently apply future owners/tags.
 for(const r of parents)map.set(text(r['父ASIN']),{parent:text(r['父ASIN']),spu:text(r.SPU),owner:text(r['负责人']),tags:listingTags(r)});
 for(const r of children){const key=text(r['父ASIN']);if(!map.has(key))map.set(key,{parent:key,spu:text(r.SPU),owner:text(r['负责人']),tags:listingTags(r)});else {const m=map.get(key);if(!m.spu)m.spu=text(r.SPU);if(!m.owner)m.owner=text(r['负责人']);}}
 return [...map.values()];
}
export function resolvedFilters(f,catalog){return {...f,spuExact:f.spuExact??catalog.some(p=>p.spu.toLowerCase()===text(f.spu).toLowerCase())};}
export function matchesProduct(p,f){const spu=text(f.spu).toLowerCase();return (!f.owner||p.owner===f.owner)&&(!spu||(f.spuExact?p.spu.toLowerCase()===spu:p.spu.toLowerCase().includes(spu)))&&(!f.tag||p.tags.includes(f.tag));}
function token(haystack,needle){if(!needle)return false;const safe=needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('(^|[^A-Za-z0-9])'+safe+'(?=$|[^A-Za-z0-9])','i').test(haystack);}
export function adLink(row,catalog){
 const directParent=text(row['父ASIN']),directSpu=text(row.SPU);
 const direct=catalog.filter(p=>directParent?p.parent===directParent:directSpu&&p.spu===directSpu);
 if(directParent||directSpu)return {products:direct,method:'source'};
 const names=[row['广告组合'],row['广告活动']].map(text).join(' ');
 return {products:catalog.filter(p=>token(names,p.spu)||token(names,p.parent)),method:'name'};
}
export function filterRows(all,type,catalog,f){if(!activeFilter(f))return all;f=resolvedFilters(f,catalog);const allowed=new Set(catalog.filter(p=>matchesProduct(p,f)).map(p=>p.parent));if(type==='parent'||type==='child')return all.filter(r=>allowed.has(text(r['父ASIN'])));
 return all.filter(r=>{const link=adLink(r,catalog);return link.products.length>0&&link.products.every(p=>allowed.has(p.parent));});
}
export function adCoverage(all,catalog,f){f=resolvedFilters(f,catalog);const selected=new Set(catalog.filter(p=>matchesProduct(p,f)).map(p=>p.parent));return all.reduce((out,r)=>{const link=adLink(r,catalog);if(!link.products.length)out.unlinked++;else if(link.products.some(p=>selected.has(p.parent))&&!link.products.every(p=>selected.has(p.parent)))out.mixed++;else if(link.products.every(p=>selected.has(p.parent))&&link.method==='name')out.byName++;return out;},{unlinked:0,mixed:0,byName:0});}
