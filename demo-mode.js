export const DEMO_DATA_KEY='demo-v1',DEMO_SESSION_KEY='popilush-demo-session';

// The original data is never replaced. The active tab writes to a separate key.
export class DemoModeStore{
 constructor({read,write,session,create}){this.read=read;this.write=write;this.session=session;this.create=create;this.active=false;this.context=null;this.queue=Promise.resolve();}
 remember(){try{this.session?.setItem(DEMO_SESSION_KEY,JSON.stringify({active:true,context:this.context}));}catch{}}
 async load(fallback){let descriptor;try{descriptor=JSON.parse(this.session?.getItem(DEMO_SESSION_KEY)||'null');}catch{}if(descriptor?.active===true){this.active=true;this.context=descriptor.context||{};const data=await this.read(DEMO_DATA_KEY);if(data)return data;const demo=this.create();await this.write(DEMO_DATA_KEY,demo);return demo;}return await this.read('main')||fallback;}
 save(next){const key=this.active?DEMO_DATA_KEY:'main',operation=this.queue.catch(()=>{}).then(()=>this.write(key,next));this.queue=operation;return operation;}
 async enter(context){await this.queue.catch(()=>{});const data=this.create();await this.write(DEMO_DATA_KEY,data);this.context=context;this.active=true;this.remember();return data;}
 async exit(fallback){await this.queue.catch(()=>{});const data=await this.read('main')||fallback;this.active=false;try{this.session?.removeItem(DEMO_SESSION_KEY);}catch{}return data;}
}
