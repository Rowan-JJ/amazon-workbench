import {materialize,completeSum,num,ratio,normalizeDate} from './core.js';
import {latestParents,latestInventory} from './views.js';

export const PHASES={launch:'新品测试',growth:'关键词爬坡',stable:'稳定盈利',promotion:'促销承接',clearance:'清货',paused:'暂停推广'};
export const PLACEMENTS={top:'搜索结果顶部',search:'其他搜索位置',product:'商品详情页'};
export const PHASE_ADVICE={launch:'先用小额测试验证相关性、CTR和转化承接，样本不足时保持测试预算。',growth:'集中验证少量核心词的订单与自然排名，逐步放量并同步检查库存。',stable:'以利润和排名稳定为主，小步调整预算，避免一次性撤掉核心词。',promotion:'单独核对促销期与常态转化，促销结束后重新评估预算和排名承接。',clearance:'优先核对清货库存与可承受投入，避免为追排名增加超出清货收益的费用。',paused:'当前阶段暂停扩量，保留历史诊断，恢复投放前重新核对库存和表现。'};
export const PROMOTION_SOURCES=[
 {title:'Amazon：BSR与自然搜索排名的区别',url:'https://sell.amazon.com/blog/amazon-best-sellers-rank'},
 {title:'Amazon：搜索排名优化',url:'https://sell.amazon.com/blog/amazon-seo'},
 {title:'SIF：反查流量词及曝光占比定义',url:'https://blog.sif.com/article/bl37ebc3d60b1649b2a64fbf4d14eae39f/%E5%9B%BE%E6%96%87%E6%95%99%E7%A8%8B%EF%BC%9A%E5%8F%8D%E6%9F%A5%E6%B5%81%E9%87%8F%E8%AF%8D'},
 {title:'Amazon Ads：顶部广告展示份额定义',url:'https://advertising.amazon.com/resources/whats-new/top-of-search-impression-share-metric'},
 {title:'Amazon Ads：日预算是月内日均预算',url:'https://advertising.amazon.com/help/GTGPQGUXNCTHE2DS'}
];
export const todayCN=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const planKey=spu=>'spu:'+encodeURIComponent(spu.trim());
const day=d=>Date.parse(d+'T00:00:00Z'),offset=(d,n)=>new Date(day(d)+n*86400000).toISOString().slice(0,10);
const days=(a,b)=>Math.round((day(b)-day(a))/86400000)+1;
const norm=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();
const defined=v=>v!==null&&v!==undefined&&v!=='';
export function blankKeyword(){return {keyword:'',trafficPct:null,rankMin:1,rankMax:null,placement:'top',budget:null,adCoveragePct:100,mode:'report',rankSource:'',rankContext:'',observations:[],manual:{start:'',end:'',impressions:null,clicks:null,spend:null,orders:null,sales:null,source:'',confirmed:false}};}
export function blankPlan(spu=''){return {spu,phase:'launch',targetAsin:'',targetMSKUs:[],dailyBudget:null,budgetWarnPct:90,tacosThreshold:null,ctrThreshold:.6,keywordSharePct:50,windowDays:14,attributionDays:7,minClicks:30,minOrders:3,minDays:3,freshDays:3,holdDays:3,benchmarkStart:'',benchmarkEnd:'',category:'',benchmarkSource:'',competitors:Array.from({length:10},()=>({asin:'',orders:null})),sifAsin:'',sifDate:'',sifSource:'',campaigns:[],campaignExclusive:false,searchComplete:false,directOrdersConfirmed:false,keywords:[blankKeyword()],updatedAt:''};}
export function validatePlan(input,today=todayCN()){
 const p={...blankPlan(),...input};const errors=[];
 if(!String(p.spu||'').trim())errors.push('请填写SPU');p.spu=String(p.spu||'').trim();
 if(!PHASES[p.phase])errors.push('推广阶段无效');p.targetAsin=String(p.targetAsin||'').trim().toUpperCase();
 const asin=(v,label)=>{if(v&&!/^[A-Z0-9]{10}$/.test(v))errors.push(label+'须为10位字母或数字');};asin(p.targetAsin,'目标ASIN');
 const number=(obj,key,label,min,max,integer=false)=>{let v=obj[key];if(!defined(v)){obj[key]=null;return;}v=Number(v);if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))errors.push(`${label}需在${min}～${max}之间${integer?'，且为整数':''}`);obj[key]=v;};
 for(const [k,l,min,max,int] of [['dailyBudget','SPU计划日预算',0,1000000],['budgetWarnPct','预算使用提醒比例',1,100],['tacosThreshold','TACoS阈值',.01,100],['ctrThreshold','CTR门槛',.001,100],['keywordSharePct','关键词订单占比假设',.01,100],['windowDays','观察窗口',1,90,true],['attributionDays','归因等待天数',0,30,true],['minClicks','最少点击数',1,1000000,true],['minOrders','最少订单数',1,1000000,true],['minDays','最少完整天数',1,90,true],['freshDays','数据有效天数',0,90,true],['holdDays','排名验证天数',1,30,true]])number(p,k,l,min,max,int);
 for(const k of ['budgetWarnPct','ctrThreshold','keywordSharePct','windowDays','attributionDays','minClicks','minOrders','minDays','freshDays','holdDays'])if(p[k]===null)errors.push(k+'不可留空');
 if(p.minDays>p.windowDays)errors.push('最少完整数据天数不能超过观察窗口');
 const date=(v,label)=>{if(!v)return '';try{const d=normalizeDate(v);if(d>today)errors.push(label+'不能晚于今天');return d;}catch{errors.push(label+'日期无效');return '';}};
 const period=(obj,a,b,label)=>{obj[a]=date(obj[a],label+'开始');obj[b]=date(obj[b],label+'结束');if(obj[a]&&obj[b]&&obj[a]>obj[b])errors.push(label+'开始日期晚于结束日期');};period(p,'benchmarkStart','benchmarkEnd','竞品统计期');p.sifDate=date(p.sifDate,'SIF采集');p.sifAsin=String(p.sifAsin||'').trim().toUpperCase();asin(p.sifAsin,'SIF参考ASIN');
 for(const k of ['category','benchmarkSource','sifSource'])p[k]=String(p[k]||'').trim().slice(0,500);
 for(const k of ['targetMSKUs','campaigns']){if(!Array.isArray(p[k])){errors.push(k+'格式无效');p[k]=[];}p[k]=[...new Set(p[k].map(v=>String(v).trim()).filter(Boolean))];}
 for(const k of ['campaignExclusive','searchComplete','directOrdersConfirmed'])p[k]=p[k]===true;
 if(!Array.isArray(p.competitors)||p.competitors.length!==10){errors.push('需保留10个竞品录入位置');p.competitors=blankPlan().competitors;}
 p.competitors=p.competitors.map((r,i)=>{r=r||{};const x={asin:String(r.asin||'').trim().toUpperCase(),orders:r.orders};asin(x.asin,`竞品${i+1} ASIN`);number(x,'orders',`竞品${i+1}订单量`,0,100000000);return x;});
 const competitorIds=p.competitors.map(r=>r.asin).filter(Boolean);if(new Set(competitorIds).size!==competitorIds.length)errors.push('竞品ASIN不能重复');
 if(!Array.isArray(p.keywords)||!p.keywords.length||p.keywords.length>50){errors.push('请保留1～50个核心关键词');p.keywords=[];}
 p.keywords=p.keywords.map((r,i)=>{r=r||{};const k={...blankKeyword(),...r,manual:{...blankKeyword().manual,...r.manual}};k.keyword=String(k.keyword||'').trim().replace(/\s+/g,' ').slice(0,250);if(!PLACEMENTS[k.placement])errors.push(`关键词${i+1}广告位无效`);if(!['report','manual'].includes(k.mode))errors.push('关键词数据来源无效');
  for(const [key,label,min,max,int] of [['trafficPct','C流量占比',0,100],['rankMin','目标排名起点',1,10000,true],['rankMax','目标排名终点',1,10000,true],['budget','关键词日预算',0,1000000],['adCoveragePct','广告承担比例',.01,100]])number(k,key,`关键词${i+1} ${label}`,min,max,int);
  if(k.rankMin!==null&&k.rankMax!==null&&k.rankMin>k.rankMax)errors.push(`关键词${i+1}排名范围顺序错误`);
  if(!k.keyword&&(k.budget!==null||k.trafficPct!==null))errors.push(`关键词${i+1}请填写词名后再配置预算或C占比`);
  period(k.manual,'start','end',`关键词${i+1}表现统计期`);for(const key of ['impressions','clicks','orders'])number(k.manual,key,`关键词${i+1} ${key}`,0,100000000,true);for(const key of ['spend','sales'])number(k.manual,key,`关键词${i+1} ${key}`,0,100000000);
  if(k.manual.impressions!==null&&k.manual.clicks!==null&&k.manual.clicks>k.manual.impressions)errors.push(`关键词${i+1}点击不能超过展示`);
  k.manual.source=String(k.manual.source||'').trim().slice(0,500);k.manual.confirmed=k.manual.confirmed===true;k.rankSource=String(k.rankSource||'').trim().slice(0,500);k.rankContext=String(k.rankContext||'').trim().slice(0,500);
  if(!Array.isArray(k.observations)){errors.push('排名观测格式无效');k.observations=[];}k.observations=k.observations.slice(0,365).map(o=>{o=o||{};const x={date:date(o.date,'排名观测'),rank:o.rank};number(x,'rank','自然排名',1,10000,true);if(!x.date||x.rank===null)errors.push('每条排名观测都需日期和名次');return x;});if(new Set(k.observations.map(o=>o.date)).size!==k.observations.length)errors.push(`关键词${i+1}同一天仅保留一条排名观测`);return k;});
 const names=p.keywords.map(k=>norm(k.keyword)).filter(Boolean);if(new Set(names).size!==names.length)errors.push('同一个核心关键词不能重复录入');if(p.keywords.reduce((s,k)=>s+(k.trafficPct||0),0)>100.000001)errors.push('同一SIF来源下所选关键词C占比之和不能超过100%');
 if(p.dailyBudget!==null&&p.keywords.reduce((s,k)=>s+(k.budget||0),0)>p.dailyBudget+.001)errors.push('关键词分配日预算总和不能超过SPU计划日预算');
 return {plan:p,errors:[...new Set(errors)]};
}
export function validatePlanStore(value,today=todayCN()){
 if(value===undefined)return {};
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('推广参数备份格式无效');
 const result={};for(const [key,input] of Object.entries(value)){if(!input||typeof input!=='object')throw Error('推广计划格式无效');const {plan,errors}=validatePlan(input,today);if(errors.length)throw Error('推广计划：'+errors.join('；'));if(key!==planKey(plan.spu))throw Error('推广计划SPU标识不一致');result[key]=plan;}return result;
}
export function competitorModel(p){const valid=p.competitors.filter(r=>r.asin&&num(r.orders)!==null);if(valid.length!==10||new Set(valid.map(r=>r.asin)).size!==10||!p.benchmarkStart||!p.benchmarkEnd||!p.category||!p.benchmarkSource)return null;const periodDays=days(p.benchmarkStart,p.benchmarkEnd);if(periodDays<1)return null;const A=valid.reduce((s,r)=>s+r.orders,0)/10;return {A,periodDays,dailyA:A/periodDays,dailyB:A/periodDays*p.keywordSharePct/100};}
export function rankEvidence(k,p,today){const rs=[...k.observations].filter(o=>o.date<=today&&num(o.rank)!==null).sort((a,b)=>b.date.localeCompare(a.date));const latest=rs[0];if(!latest||!k.rankSource||!k.rankContext||!k.rankMin||!k.rankMax)return {status:'缺少排名观测',met:false,latest:null,streak:0};if(days(latest.date,today)-1>p.freshDays)return {status:'排名观测已过期',met:false,latest,streak:0};let streak=0;for(let i=0;i<rs.length;i++){if(rs[i].date!==offset(latest.date,-i)||rs[i].rank>k.rankMax)break;streak++;}return {status:latest.rank>k.rankMax?'尚未进入目标':streak>=p.holdDays?(latest.rank<k.rankMin?'持续优于目标范围':'持续进入目标范围'):'本次进入，待验证稳定',met:latest.rank<=k.rankMax,stable:streak>=p.holdDays,latest,streak};}
function windowFor(p,today){const end=offset(today,-p.attributionDays);return {start:offset(end,1-p.windowDays),end};}
export function promotionSnapshot(state){return {parents:latestParents(state.batches),stocks:latestInventory(state.batches),ads:materialize(state.batches,'ads'),search:materialize(state.batches,'search')};}
export function keywordStats(state,p,k,today=todayCN(),snapshot=null){
 const gaps=[],w=windowFor(p,today);let s={impressions:null,clicks:null,spend:null,orders:null,sales:null,observedDays:0,start:null,end:null,placementKnown:false,source:k.mode==='manual'?'手动核对表现':'SP搜索词报表'};
 if(k.mode==='manual'){
  const m=k.manual;s={...s,...Object.fromEntries(['impressions','clicks','spend','orders','sales','start','end'].map(key=>[key,m[key]])),observedDays:m.start&&m.end?days(m.start,m.end):0,placementKnown:true};
  if(!m.source||!m.confirmed)gaps.push('补充数据来源并确认：关键词、目标ASIN及广告位口径一致');
  if(!m.start||!m.end)gaps.push('填写完整的关键词表现统计期');else if(m.end>w.end)gaps.push('关键词表现仍在归因等待期，更新成熟数据后再评估');else if(m.start<w.start)gaps.push('手动表现统计期需位于设置的成熟观察窗口内');
 }else{
  const camps=new Set(p.campaigns);if(!camps.size)gaps.push('绑定需要评估的SP广告活动');if(!p.campaignExclusive)gaps.push('确认关联活动只推广该目标ASIN；混投需使用手动核对数据');if(!p.searchComplete)gaps.push('确认关键词曝光覆盖完整，未过滤零点击流量');
  const conflict=Object.values(state.promotionPlans||{}).some(other=>other.spu!==p.spu&&other.campaigns?.some(c=>camps.has(c)));if(conflict)gaps.push('同一活动被其他SPU绑定，请先拆分归属');
  const search=(snapshot?.search||materialize(state.batches,'search')).filter(r=>camps.has(r['广告活动'])&&/^SP[- ]/i.test(String(r['广告类型']))&&norm(r['用户搜索词'])===norm(k.keyword)&&r._date>=w.start&&r._date<=w.end);
  const ads=(snapshot?.ads||materialize(state.batches,'ads')).filter(r=>camps.has(r['广告活动'])&&String(r['类型']).toUpperCase()==='SP'&&r._date>=w.start&&r._date<=w.end);
  const dates=[...new Set([...search,...ads].map(r=>r._date))].sort();
  if(search.length){const hasAsin=search.some(r=>r.ASIN||r['目标ASIN']);if(hasAsin&&search.some(r=>(r['目标ASIN']||r.ASIN)!==p.targetAsin))gaps.push('搜索词报表出现其他ASIN，不能合并评估该目标ASIN');s={...s,impressions:completeSum(search,'曝光量'),clicks:completeSum(search,'点击'),spend:completeSum(search,'花费'),orders:p.directOrdersConfirmed?completeSum(search,'广告订单'):null,sales:p.directOrdersConfirmed?completeSum(search,'广告销售额'):null,observedDays:dates.length,start:dates[0],end:dates.at(-1)};}
  if(!p.directOrdersConfirmed)gaps.push('确认广告订单仅归因于目标ASIN，否则无法用总归因订单推算该ASIN转化率');
  if(!search.length)gaps.push('成熟观察窗口内没有匹配的SP搜索词记录');
  gaps.push('搜索词数据未区分目标广告位；补充该位置的核对表现后才能验证位置预算');
 }
 for(const key of ['impressions','clicks','spend','orders'])if(num(s[key])===null||s[key]<0)gaps.push('缺少或无效的'+({impressions:'展示量',clicks:'点击量',spend:'花费',orders:'目标ASIN广告订单'}[key]));
 if(s.clicks>0&&s.spend===0)gaps.push('有点击但花费为0，请复核费用是否完整回传');
 if(s.clicks>s.impressions&&s.impressions!==null)gaps.push('点击数大于展示量，请核对统计口径');if(s.orders>s.clicks&&s.clicks!==null)gaps.push('订单/点击超过100%，请复核归因口径');
 if((s.clicks??0)<p.minClicks)gaps.push(`点击样本不足${p.minClicks}次`);if((s.orders??0)<p.minOrders)gaps.push(`订单样本不足${p.minOrders}单`);if(s.observedDays<p.minDays)gaps.push(`完整数据少于${p.minDays}天`);if(s.end&&days(s.end,w.end)-1>p.freshDays)gaps.push('最新成熟广告表现已滞后，仅可作历史参考');
 return {...s,ctr:ratio(s.clicks,s.impressions),cpc:ratio(s.spend,s.clicks),cvr:ratio(s.orders,s.clicks),dailyOrders:s.observedDays>0&&s.orders!==null?s.orders/s.observedDays:null,window:w,gaps:[...new Set(gaps)]};
}
export function evaluateKeyword(state,p,k,today,model,snapshot=null){const stats=keywordStats(state,p,k,today,snapshot),rank=rankEvidence(k,p,today),gaps=[...stats.gaps];const mapped=p.targetAsin.length===10;if(!mapped)gaps.push('填写目标可售ASIN');if(!k.keyword)gaps.push('填写核心关键词');if(!k.rankMin||!k.rankMax)gaps.push('设置目标自然排名区间');if(!model)gaps.push('补齐同类目前10个竞品及同周期订单量');if(k.trafficPct===null)gaps.push('填写关键词SIF流量占比C');if(!p.sifAsin||!p.sifDate||!p.sifSource)gaps.push('填写SIF参考ASIN、采集日期与来源');if(k.adCoveragePct===null)gaps.push('填写广告承担比例');
 const gate=stats.ctr===null?'缺少CTR':stats.ctr>p.ctrThreshold/100?'通过':'未通过';if(gate!=='通过')gaps.push(`CTR须高于${p.ctrThreshold}%，当前${gate==='缺少CTR'?'缺少数据':'未通过SOP门槛'}`);
 const baseReady=gate==='通过'&&model&&k.trafficPct!==null&&p.sifAsin&&p.sifDate&&p.sifSource&&k.adCoveragePct!==null;
 const targetDaily=baseReady?model.dailyB*k.trafficPct/100:null,targetAdOrders=targetDaily===null?null:targetDaily*k.adCoveragePct/100;
 const numericReady=targetAdOrders!==null&&stats.cvr>0&&stats.cvr<=1&&stats.cpc>0&&stats.clicks>=p.minClicks&&stats.orders>=p.minOrders;
 const requiredClicks=numericReady?Math.ceil(targetAdOrders/stats.cvr):null,requiredBudget=requiredClicks===null?null:requiredClicks*stats.cpc,requiredImpressions=requiredClicks!==null&&stats.ctr>0?Math.ceil(requiredClicks/stats.ctr):null;
 const allocationGap=requiredBudget!==null&&k.budget!==null?Math.max(0,requiredBudget-k.budget):null;
 const dailyOrderGap=targetAdOrders!==null&&stats.dailyOrders!==null?Math.max(0,targetAdOrders-stats.dailyOrders):null;const fitCvr=k.budget>0&&stats.cpc>0&&targetAdOrders!==null?targetAdOrders*stats.cpc/k.budget:null;
 const ready=gaps.length===0;let conclusion=gate==='未通过'?'CTR未过门槛，先优化点击吸引力':!ready?'数据或口径待补齐':k.budget===null?'填写关键词预算后比较':allocationGap>0?'计划预算不足以覆盖模型目标':'计划预算可覆盖模型目标';
 const advice=[];if(gate==='未通过')advice.push('先检查关键词相关性、主图、标题、价格与变体可售情况，保留小额测试，暂缓大规模扩量。');if(stats.orders===0&&stats.clicks>0)advice.push('已有点击但尚无目标ASIN订单：检查尺码、页面承接、配送和价格，不用零转化率外推预算。');if(ready&&allocationGap>0)advice.push('先核对SPU的TACoS可用空间与库存，再考虑补足关键词预算、提高转化或缩小阶段目标。');if(ready&&dailyOrderGap>0)advice.push('当前日均广告订单低于SOP计划目标，先检查预算是否实际消耗、曝光获取与转化承接；达到模型订单也需另行验证自然排名。');if(ready&&fitCvr>1)advice.push('当前预算即使按100%订单/点击估算仍不足，需要重新调整阶段订单目标、CPC或预算。');if(!rank.met)advice.push('继续记录同一环境下的关键词自然排名，用实际排名验证SOP假设；不能用广告订单或IS替代自然排名。');if(rank.met&&!rank.stable)advice.push(`本次排名已进入或优于目标，继续观察至连续${p.holdDays}天，避免立即大幅撤量。`);if(rank.stable)advice.push('排名已连续达到设定要求，可小步测试利润优化，同时监控订单、排名和库存。');
 return {keyword:k,stats,rank,gate,gaps:[...new Set(gaps)],targetDaily,targetAdOrders,requiredClicks,requiredBudget,requiredImpressions,allocationGap,dailyOrderGap,fitCvr,ready,conclusion,advice};}
export function evaluatePlan(state,p,today=todayCN(),snapshot=null){
 const source=snapshot||promotionSnapshot(state);const parents=source.parents.filter(r=>String(r.SPU||'')===p.spu),latestDate=parents.map(r=>r._date).sort().at(-1)||null,aligned=parents.filter(r=>r._date===latestDate),scopeComplete=parents.length>0&&aligned.length===parents.length;
 const revenue=scopeComplete?completeSum(aligned,'销售额'):null,spend=scopeComplete?completeSum(aligned,'广告花费'):null,tacos=ratio(spend,revenue),cap=revenue!==null&&p.tacosThreshold!==null?revenue*p.tacosThreshold/100:null;
 const model=competitorModel(p),keywords=p.keywords.filter(k=>k.keyword).map(k=>evaluateKeyword(state,p,k,today,model,source));const allocated=p.keywords.reduce((s,k)=>s+(k.budget||0),0),nonCore=p.dailyBudget===null||p.keywords.some(k=>k.keyword&&k.budget===null)?null:Math.max(0,p.dailyBudget-allocated);
 const complete=keywords.length>0&&keywords.every(k=>k.ready&&k.requiredBudget!==null),coreNeeded=complete?keywords.reduce((s,k)=>s+k.requiredBudget,0):null,totalNeeded=coreNeeded!==null&&nonCore!==null?coreNeeded+nonCore:null;
 const warnings=[];const warn=(code,title,detail)=>warnings.push({code,title,detail});if(scopeComplete&&(revenue===null||spend===null))warn('sales-fields','销售额或广告花费缺失','无法计算当前TACoS和参考投入空间，请更新完整父体报表。');if(revenue===0&&spend>0)warn('zero-sales','有广告花费但销售额为0','TACoS无法计算，先排查转化和销售回传，再决定预算。');if(p.keywords.some(k=>k.keyword&&k.budget===null))warn('keyword-budget','核心词预算尚未分配完整','请逐词分配日预算，再评估剩余预算与总需求。');if(spend!==null&&p.dailyBudget!==null&&((p.dailyBudget===0&&spend>0)||(p.dailyBudget>0&&spend/p.dailyBudget>=p.budgetWarnPct/100)))warn('budget-use',spend>p.dailyBudget?'最新日广告花费超过计划预算':'最新日广告花费接近计划预算',`源数据日期${latestDate}，广告花费已达到所设日预算提醒条件。请核对实际消耗与投放节奏，不作为今天实时余额。`);if(p.dailyBudget===null)warn('budget','尚未设置SPU计划日预算','填写计划日预算后可比较总投入需求。');if(!scopeComplete)warn('parent','销售数据不完整','同一SPU的父体最新日期不一致或没有销售数据，暂不合并TACoS。');if(latestDate&&days(latestDate,today)-1>p.freshDays)warn('stale','销售数据需更新',`最新销售日期${latestDate}，不是实时数据。`);if(p.tacosThreshold===null)warn('threshold','未设TACoS警告阈值','先在推广参数中填写每款阈值。');if(tacos!==null&&p.tacosThreshold!==null&&tacos>p.tacosThreshold/100)warn('tacos','TACoS超过警告阈值',`最新实际TACoS超过${p.tacosThreshold}%。优先排查低效词、转化和费用，不直接统一砍预算。`);
 if(cap!==null&&p.dailyBudget!==null&&p.dailyBudget>cap)warn('planned-cap','计划日预算超过TACoS参考空间','参考空间按最新日销售额计算，并非平台硬性限额；扩量前验证销售承接。');if(cap!==null&&totalNeeded!==null&&totalNeeded>cap)warn('required-cap','模型所需预算超过TACoS参考空间','当前销售水平可能无法同时承担SOP目标与非核心词预留；先优化转化或分阶段推广。');
 const stocks=source.stocks.filter(r=>p.targetMSKUs.includes(r.MSKU)),matched=new Set(stocks.map(r=>r.MSKU));if(!p.targetMSKUs.length||matched.size!==p.targetMSKUs.length)warn('stock-map','目标ASIN库存尚未完整核对','请绑定目标ASIN对应的MSKU；整款库存不能代替该子ASIN库存。');else if(stocks.some(r=>num(r['FBA-可售'])===null))warn('stock-missing','目标库存数值不完整','请更新完整MSKU库存快照。');else if(stocks.some(r=>r._date&&days(r._date,today)-1>p.freshDays))warn('stock-stale','目标库存快照需更新','库存快照已滞后，增加预算前核对最新可售库存。');else if(completeSum(stocks,'FBA-可售')===0)warn('stock-zero','目标MSKU的FBA可售为0','先核对FBM承接和补货，再决定是否加投。');
 if(!p.targetAsin)warn('asin','缺少目标ASIN','填写实际推广的可售子ASIN。');if(!keywords.length)warn('keywords','尚未设置核心关键词','填写关键词、SIF占比和目标自然排名区间。');if(p.phase==='paused')warn('paused','该款已暂停推广','保留诊断供复盘，不建议扩量。');
 const campaignBudgets=p.campaigns.map(name=>{const all=source.ads.filter(r=>r['广告活动']===name).sort((a,b)=>b._date.localeCompare(a._date));return all[0];}).filter(Boolean);const campaignDaily=campaignBudgets.length===p.campaigns.length&&p.campaigns.length>0&&campaignBudgets.every(r=>/^(每日|daily)$/i.test(String(r['预算类型']))&&num(r['预算()'])!==null)?campaignBudgets.reduce((s,r)=>s+r['预算()'],0):null;
 return {plan:p,phaseAdvice:PHASE_ADVICE[p.phase],today,latestDate,scopeComplete,revenue,spend,tacos,cap,model,keywords,allocated,nonCore,coreNeeded,totalNeeded,complete,campaignDaily,warnings};
}
