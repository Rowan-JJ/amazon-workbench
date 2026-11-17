export const TYPES={parent:'父体产品表现',child:'MSKU库存与销量',ads:'广告活动表现',search:'搜索词表现'};
export const num=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
export const sum=(rows,k)=>rows.reduce((s,r)=>s+(num(r[k])??0),0);
export const completeSum=(rows,k)=>rows.length&&rows.every(r=>num(r[k])!==null)?sum(rows,k):null;
export const ratio=(a,b)=>a!==null&&b!==null&&b>0?a/b:null;
export function detect(headers){if(headers.includes('用户搜索词'))return 'search';if(headers.includes('MSKU')&&headers.includes('FBA-可售'))return 'child';if(headers.includes('父ASIN')&&headers.includes('销售额'))return 'parent';if(headers.includes('广告活动')&&headers.includes('预算()'))return 'ads';throw Error('未识别的报表类型，请使用领星原始导出表头');}
export function filenameDate(name){const full=name.match(/(20\d{2}-\d{2}-\d{2})[~～](20\d{2}-\d{2}-\d{2})/);if(full)return {start:full[1],end:full[2],source:'文件名'};return null;}
export function normalizeDate(value){
 if(value===null||value===undefined||value==='')return null;
 let s=String(value).trim();
 if(typeof value==='number'&&Number.isFinite(value)&&value>=20000&&value<80000)s=new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000).toISOString().slice(0,10);
 const m=s.match(/^(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})日?$/);if(!m)throw Error('日期格式无效，请使用YYYY-MM-DD或Excel日期');
 const result=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;const d=new Date(result+'T00:00:00Z');
 if(Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==result)throw Error('日期不存在：'+s);return result;
}
export function prepare(name,parsed,hash,now=new Date().toISOString()){
 const type=detect(parsed.headers), period=filenameDate(name);const warnings=[];let rows=parsed.rows;
 const required={parent:['父ASIN','销量','销售额','订单量','广告花费','广告销售额'],child:['MSKU','父ASIN','FBA-可售'],ads:['广告活动','日期','花费','广告销售额','点击'],search:['用户搜索词','日期','广告活动','广告组','花费','点击','广告订单']}[type];for(const k of required)if(!parsed.headers.includes(k))throw Error('缺少必要字段：'+k);
 if(period){normalizeDate(period.start);normalizeDate(period.end);if(period.start>period.end)throw Error('文件名开始日期晚于结束日期');}
 const mmdd=name.match(/-(\d{4})-(\d{4})-每日明细/);
 rows=rows.map((r,i)=>{let date;try{date=normalizeDate(r['日期']);if(!date&&period&&(period.start===period.end||type==='child'))date=period.end;if(!date)throw Error('缺少日期；多日文件必须保留逐日日期列');if(period&&(date<period.start||date>period.end))throw Error('行日期超出文件名日期范围');if(mmdd){const md=date.slice(5).replace('-','');if(mmdd[1]>mmdd[2]?!(md>=mmdd[1]||md<=mmdd[2]):md<mmdd[1]||md>mmdd[2])throw Error('行日期与文件名日期范围冲突');}for(const key of type==='parent'?['父ASIN']:type==='child'?['父ASIN','MSKU']:['广告活动'])if(!String(r[key]??'').trim())throw Error('缺少业务标识：'+key);}catch(e){throw Error('第'+(i+2)+'行：'+e.message)}return {...r,...(r['日期']!==undefined?{'日期':date}:{}),_date:date,_source:name};});
 if(!rows.length)throw Error('没有数据行');if(!period&&!mmdd)throw Error('文件名缺少可识别日期，请保留领星原始文件名');if(mmdd)warnings.push('文件名省略年份：年份取表内日期，月日已与文件名核对。');
 if(type==='parent'&&rows.some(r=>num(r['销量'])>0&&num(r['Sessions-Total'])===0))warnings.push('有销量但Sessions为0：转化率与流量诊断暂不可用。');
 if(type==='child'){warnings.push('逐日库存分别保存，按所选日期读取，不跨日期累加库存。');if(rows.some(r=>num(r['7天销量'])===null))warnings.push('部分或全部记录缺少MSKU近7天销量：不计算相应覆盖天数、缺货销售预警；库存变化不能直接当作销量。');else warnings.push('7/14/30天销量保留源报表滚动值，不还原为每日销量。');}if(type==='search'&&rows.some(r=>num(r['广告销量'])===null))warnings.push('广告销量存在缺失，完整销量汇总将显示不可用。');
 const keys=rows.map(r=>rowKey(type,r));if(new Set(keys).size!==keys.length)throw Error('同一文件存在重复业务键，需先核对数据粒度。');return {id:hash,name,type,rows,dates:[...new Set(rows.map(r=>r._date))].sort(),warnings,importedAt:now,headers:parsed.headers};
}
export function rowKey(type,r){return JSON.stringify([r._date,...({parent:['父ASIN'],child:['父ASIN','MSKU'],ads:['广告活动'],search:['广告类型','广告活动','广告组','源投放','源匹配方式','用户搜索词']}[type]).map(k=>r[k]??'')]);}
export function materialize(batches,type,date){const map=new Map();for(const b of batches.filter(b=>b.type===type))for(const r of b.rows)if(!date||r._date===date)map.set(rowKey(type,r),r);return [...map.values()];}
export function coverage(r){return ratio(num(r['FBA-可售']),ratio(num(r['7天销量']),7));}
export function inventoryStatus(r,days=21){if(num(r['FBA-可售'])===null||num(r['7天销量'])===null)return '数据不足';if(r['FBA-可售']===0&&r['7天销量']>0)return 'FBA缺货待查';const c=coverage(r);if(c!==null&&c<days)return '覆盖偏低';if(num(r['30天销量'])===0&&r['FBA-可售']>0)return '近30天未售';return '常规观察';}
