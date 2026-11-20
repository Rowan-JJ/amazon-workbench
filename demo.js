import {prepare} from './core.js';
import {blankPlan,blankKeyword,planKey,todayCN} from './promotion.js';

const offset=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const round=n=>Math.round(n*100)/100;
const styles=[
 {spu:'DEMO-DRESS-01',name:'塑形吊带连衣裙',owner:'林悦（演示）',tags:'连衣裙,新品',phase:'launch',price:59.99,ctr:.0045,cvr:.055,cpc:.85,clicks:20,budget:110,tacos:22,benchmark:210,words:['tummy control dress','shapewear slip dress','bodycon midi dress']},
 {spu:'DEMO-BODY-02',name:'无痕塑形连体衣',owner:'陈妍（演示）',tags:'连体衣,重点推广',phase:'growth',price:45.99,ctr:.011,cvr:.085,cpc:1.05,clicks:32,budget:90,tacos:12,benchmark:420,words:['shapewear bodysuit','tummy control bodysuit','seamless bodysuit']},
 {spu:'DEMO-DRESS-03',name:'长袖修身长裙',owner:'林悦（演示）',tags:'连衣裙,常青款',phase:'stable',price:69.99,ctr:.017,cvr:.17,cpc:.65,clicks:30,budget:130,tacos:15,benchmark:126,words:['long sleeve shapewear dress','square neck maxi dress','sculpting long dress']},
 {spu:'DEMO-LEG-04',name:'高腰塑形打底裤',owner:'周宁（演示）',tags:'打底裤,促销',phase:'promotion',price:39.99,ctr:.013,cvr:.14,cpc:.75,clicks:28,budget:95,tacos:20,benchmark:196,words:['tummy control leggings','high waisted leggings','sculpting leggings']},
 {spu:'DEMO-TOP-05',name:'收腹塑形背心',owner:'陈妍（演示）',tags:'塑形上衣,出清',phase:'clearance',price:24.99,ctr:.009,cvr:.05,cpc:.8,clicks:22,budget:35,tacos:10,benchmark:140,words:['shapewear tank top','tummy control camisole','shaping top for women']},
 {spu:'DEMO-DRESS-06',name:'褶皱裹身连衣裙',owner:'周宁（演示）',tags:'连衣裙,待补货',phase:'paused',price:54.99,ctr:.012,cvr:.11,cpc:.9,clicks:24,budget:0,tacos:16,benchmark:175,words:['ruched wrap dress','shaping wrap dress','v neck bodycon dress']}
];
const parent=i=>'D1'+String(i+1).padStart(8,'0');
const child=(i,j)=>'D2'+String(i*10+j+1).padStart(8,'0');
const sku=(s,j)=>s.spu+'-'+['BLACK-S','BLACK-M','BLACK-L','BLACK-XL','COCOA-M','COCOA-L'][j];
const campaign=(s,j)=>s.spu+' / '+['SP-核心词1','SP-核心词2','SP-核心词3','SB-品牌拓展','SBV-视频触达','SD-再营销'][j];
function batch(type,rows,label,id,stamp){const start=rows[0]['日期'],end=rows.at(-1)['日期'];const result=prepare(`演示-${label}（${start}~${end}）.xlsx`,{headers:[...new Set(rows.flatMap(r=>Object.keys(r)))],rows},'demo-'+id,stamp+'T08:00:00Z');if(result.type!==type)throw Error('演示报表类型不一致');return result;}

// Entirely fictional, relative dates keep every demo useful when opened later.
export function createDemoState(today=todayCN()){
 const dates=Array.from({length:35},(_,i)=>offset(today,i-34)),parents=[],ads=[],search=[],children=[],plans={};
 for(let d=0;d<dates.length;d++)for(let i=0;i<styles.length;i++){
  const s=styles[i],date=dates[d],pulse=1+.17*Math.sin(d*.53+i)+(d/34)*.18,promo=s.phase==='promotion'?(d>=28?.35:.12):s.phase==='clearance'?.4:.06;
  const dayAds=[],daySearch=[];
  for(let j=0;j<6;j++){
   const stopped=s.phase==='paused'&&d>=32,clicks=stopped?0:Math.round(s.clicks*pulse*(j<3?1-j*.15:.32)),cpc=s.cpc*(j<3?1:.85),spend=round(clicks*cpc),impressions=clicks?Math.round(clicks/(s.ctr*(j<3?1:.75))):0,orders=stopped?0:Math.floor(clicks*s.cvr*(j<3?1:.7)),sales=round(orders*s.price*(1-promo));
   const type=['SP','SP','SP','SB','SBV','SD'][j],name=campaign(s,j),budget=s.budget===0?0:j<3?(s.budget<60?[15,10,5]:[25,20,15])[j]:(Math.max(0,s.budget-(s.budget<60?30:60))/3);
   const common={'日期':date,SPU:s.spu,'父ASIN':parent(i),'广告活动':name,'广告组合':s.spu+' / '+s.owner,'类型':type,'预算()':round(budget),'预算类型':'每日','曝光量':impressions,'点击':clicks,'花费':spend,'广告订单':orders,'广告销量':orders,'广告销售额':sales};
   dayAds.push(common);
   const extraClicks=j<3?Math.floor(clicks*.15):0,coreClicks=clicks-extraClicks,extraSpend=round(extraClicks*cpc),word=j<3?s.words[j]:['brand shaping dress','comfortable shapewear','sculpting outfit'][j-3];
   const makeSearch=(term,c,imp,cost,o,sale)=>({'日期':date,SPU:s.spu,'父ASIN':parent(i),'目标ASIN':child(i,0),'广告活动':name,'广告组合':common['广告组合'],'广告组':'演示广告组 '+(j+1),'广告类型':type==='SP'?'SP-Manual':type,'源投放':word,'源匹配方式':j<3?'精准':'广泛','用户搜索词':term,'曝光量':imp,'点击':c,'花费':cost,'广告订单':o,'广告销量':o,'广告销售额':sale,'竞价':round(cpc*1.2)});
   daySearch.push(makeSearch(word,coreClicks,impressions-Math.round(impressions*.15)*(j<3?1:0),round(spend-extraSpend),orders,sales));
   if(j<3)daySearch.push(makeSearch(word+' cheap',extraClicks,Math.round(impressions*.15),extraSpend,0,0));
  }
  ads.push(...dayAds);search.push(...daySearch);
  const spend=round(dayAds.reduce((a,r)=>a+r['花费'],0)),adOrders=dayAds.reduce((a,r)=>a+r['广告订单'],0),adSales=round(dayAds.reduce((a,r)=>a+r['广告销售额'],0)),organic=s.phase==='paused'&&d>=32?3:Math.round((s.phase==='stable'?38:s.phase==='growth'?13:19)*pulse),orders=adOrders+organic,units=orders+Math.floor(orders*.06),sales=round(orders*s.price*(1-promo)),promoUnits=Math.round(units*promo),refunds=Math.max(1,Math.round(units*(s.phase==='clearance'?.13:.045))),returns=Math.max(1,refunds-1),sessions=Math.round(orders/(s.phase==='stable'?.16:.095));
  parents.push({'日期':date,'父ASIN':parent(i),SPU:s.spu,'负责人':s.owner,'Listing标签':s.tags,'品名':s.name,'标题':'演示 · '+s.name,'售价(总价)':s.price,'销量':units,'订单量':orders,'销售额':sales,'净销售额':round(sales-refunds*s.price),'销售均价':round(sales/units),'订单毛利润':round(s.phase==='clearance'?-sales*.07:sales*.33-spend),'结算毛利润':round(sales*.29-spend),'退款量':refunds,'退款金额':round(refunds*s.price),'退货量':returns,'促销销量':promoUnits,'促销销售额':round(sales*promo),'促销折扣':round(orders*s.price*promo),'广告花费':spend,'广告销售额':adSales,'广告订单量':adOrders,'广告销量':adOrders,'展示':dayAds.reduce((a,r)=>a+r['曝光量'],0),'点击':dayAds.reduce((a,r)=>a+r['点击'],0),'SP广告费':round(dayAds.filter(r=>r['类型']==='SP').reduce((a,r)=>a+r['花费'],0)),'SB广告费':dayAds[3]['花费'],'SBV广告费':dayAds[4]['花费'],'SD广告费':dayAds[5]['花费'],'Sessions-Total':sessions,'PV-Total':Math.round(sessions*1.48),'Buybox赢得率':.99,'评分':4.3+(i%3)*.1,'评论数':185+i*147+d*2});
 }
 for(let i=0;i<styles.length;i++){
  const s=styles[i],recent=parents.filter(r=>r.SPU===s.spu),total=n=>recent.slice(-n).reduce((a,r)=>a+r['销量'],0),weights=[.2,.25,.22,.13,.12,.08];
  for(let j=0;j<6;j++){
   const seven=i===4&&j===5?0:Math.round(total(7)*weights[j]),thirty=i===4&&j===5?0:Math.round(total(30)*weights[j]);
   let stock=Math.round(seven/7*(j<2?36:24));if(i===1&&j===1)stock=0;if(i===3&&j<2)stock=Math.round(seven/7*5);if(i===4&&j===5)stock=180;if(i===5)stock=0;
   children.push({'日期':today,'父ASIN':parent(i),ASIN:child(i,j),MSKU:sku(s,j),SPU:s.spu,'负责人':s.owner,'Listing标签':s.tags,'7天销量':seven,'14天销量':Math.round(total(14)*weights[j]),'30天销量':thirty,'FBA-可售':stock,'FBM可售':i===5?20:0,'FBA-待调仓':6+j,'FBA-预留':8+j,'FBA-调仓中':12,'FBA-待发货':18,'FBA-入库中':36,'FBA实际在途':60});
  }
  const p=blankPlan(s.spu);Object.assign(p,{phase:s.phase,targetAsin:child(i,0),targetMSKUs:[sku(s,0)],dailyBudget:s.budget,tacosThreshold:s.tacos,category:'演示女装细分类目 · '+s.name,benchmarkStart:offset(today,-13),benchmarkEnd:offset(today,-7),benchmarkSource:'虚拟竞品订单估算（仅演示）',sifAsin:'D900000001',sifDate:offset(today,-1),sifSource:'虚拟SIF自然流量示例',campaigns:[0,1,2].map(j=>campaign(s,j)),campaignExclusive:true,searchComplete:true,directOrdersConfirmed:true,updatedAt:today+'T08:00:00Z'});
  p.competitors=Array.from({length:10},(_,n)=>({asin:'D9'+String(n+1).padStart(8,'0'),orders:s.benchmark+(n-4)*7}));
  p.keywords=s.words.map((word,j)=>{
   const k=blankKeyword(),start=offset(today,-13),end=offset(today,-7),r=search.filter(r=>r['广告活动']===campaign(s,j)&&r['用户搜索词']===word&&r['日期']>=start&&r['日期']<=end),sum=key=>round(r.reduce((a,row)=>a+row[key],0));
   const ranks=Array.from({length:7},(_,n)=>({date:offset(today,n-6),rank:i===2?20-n:i===3?(n<5?35-n*2:18-(n-5)*2):i===5?26-n:Math.max(21,78-i*6-n*3-j)}));
   Object.assign(k,{keyword:word,trafficPct:[40,30,20][j],rankMin:1,rankMax:i===4?30:20,placement:['top','search','product'][j],budget:s.budget===0?0:s.budget<60?[15,10,5][j]:[25,20,15][j],mode:i===1&&j===2?'report':'manual',rankSource:'演示自然排名观测',rankContext:'美国站 · 虚拟固定配送地区 · 桌面端',observations:ranks,manual:{start,end,impressions:sum('曝光量'),clicks:sum('点击'),spend:sum('花费'),orders:sum('广告订单'),sales:sum('广告销售额'),source:'虚拟目标ASIN / 关键词 / 广告位核对报表（仅演示）',confirmed:true}});return k;
  });plans[planKey(s.spu)]=p;
 }
 const split=offset(today,-7),older=rows=>rows.filter(r=>r['日期']<=split),recent=rows=>rows.filter(r=>r['日期']>=offset(today,-13));
 const batches=[batch('parent',older(parents),'产品表现父ASIN','parent-history',split),batch('parent',recent(parents),'产品表现父ASIN','parent-latest',today),batch('child',children.map(r=>({...r,'日期':split,'FBA-可售':r['FBA-可售']+25})),'产品表现MSKU','child-history',split),batch('child',children,'产品表现MSKU','child-latest',today),batch('ads',older(ads),'广告活动','ads-history',split),batch('ads',recent(ads),'广告活动','ads-latest',today),batch('search',older(search),'搜索词','search-history',split),batch('search',recent(search),'搜索词','search-latest',today)];
 return {version:1,batches,promotionPlans:plans,tasks:{[today+':zero']:true},settings:{stockDays:21,targetAcos:35}};
}
