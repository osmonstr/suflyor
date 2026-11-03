// speech engine for the prompter: Vosk (Apache-2.0, github.com/ccoreilly/vosk-browser) running on the device
importScripts('vosk-wasm.js');
let V=null,model=null,rec=null,addr=0,size=0;
const CACHE='suflyor-asr-v1';
async function fetchParts(parts,total){
  const cache=await caches.open(CACHE).catch(()=>null);let done=0;const out=[];
  for(const url of parts){
    let r=cache?await cache.match(url):null;
    if(!r){const net=await fetch(url);if(!net.ok)throw new Error('http '+net.status);
      const reader=net.body.getReader(),bits=[];
      for(;;){const {done:d,value}=await reader.read();if(d)break;bits.push(value);done+=value.length;postMessage({t:'progress',done,total})}
      const blob=new Blob(bits);r=new Response(blob,{headers:{'content-length':String(blob.size)}});
      if(cache)try{await cache.put(url,r.clone())}catch(e){}
    }else{done+=+r.headers.get('content-length')||0;postMessage({t:'progress',done,total,cached:true})}
    out.push(await r.blob())}
  return new Blob(out)}
async function untar(stream,root){
  const r=stream.getReader();let chunk=new Uint8Array(0),off=0,eof=false;
  async function need(n){while(chunk.length-off<n&&!eof){const {done,value}=await r.read();if(done){eof=true;break}
    const m=new Uint8Array(chunk.length-off+value.length);m.set(chunk.subarray(off));m.set(value,chunk.length-off);chunk=m;off=0}return chunk.length-off>=n}
  const dec=new TextDecoder();const str=(a,b)=>{const s=dec.decode(chunk.subarray(off+a,off+a+b));const i=s.indexOf('\0');return i<0?s:s.slice(0,i)};
  for(;;){if(!await need(512))break;if(chunk[off]===0)break;
    const name=str(0,100),n=parseInt(str(124,12).trim(),8)||0,type=String.fromCharCode(chunk[off+156]);off+=512;
    const pad=(512-n%512)%512,path=root+'/'+name.replace(/^\.\//,'').replace(/\/$/,'');
    if(type==='5'){try{V.FS.mkdirTree(path)}catch(e){}}
    else if(type==='0'||type==='\0'){const dir=path.slice(0,path.lastIndexOf('/'));try{V.FS.mkdirTree(dir)}catch(e){}
      const f=V.FS.open(path,'w');let left=n;
      while(left>0){if(chunk.length-off===0)await need(1);const take=Math.min(left,chunk.length-off);if(!take)throw new Error('tar');
        V.FS.write(f,chunk,off,take);off+=take;left-=take}
      V.FS.close(f)}
    if(pad&&await need(pad))off+=pad}}
function freeRec(){if(addr){V._free(addr);addr=0;size=0}if(rec){try{rec.delete()}catch(e){}rec=null}}
onmessage=async e=>{const m=e.data;try{
  if(m.t==='load'){const t0=performance.now();
    const blob=await fetchParts(m.parts,m.total);postMessage({t:'phase',phase:'unpack'});
    V=await LoadVosk();V.SetLogLevel(m.log??-1);
    await untar(blob.stream().pipeThrough(new DecompressionStream('gzip')),'/model');
    postMessage({t:'phase',phase:'init'});
    model=new V.Model('/model');postMessage({t:'ready',ms:Math.round(performance.now()-t0),heap:V.HEAPU8.length});return}
  if(m.t==='rec'){freeRec();rec=m.grammar?new V.Recognizer(model,m.rate,m.grammar):new V.Recognizer(model,m.rate);postMessage({t:'rec'});return}
  if(m.t==='pcm'){if(!rec)return;const d=m.d,b=d.length*4;if(b!==size){if(addr)V._free(addr);addr=V._malloc(b);size=b}
    const h=V.HEAPF32,o=addr/4;for(let i=0;i<d.length;i++)h[o+i]=d[i]*32768;const t0=performance.now();
    if(rec.AcceptWaveform(addr,d.length))postMessage({t:'final',text:JSON.parse(rec.Result()).text||'',at:m.at,cost:performance.now()-t0});
    else postMessage({t:'partial',text:JSON.parse(rec.PartialResult()).partial||'',at:m.at,cost:performance.now()-t0});return}
  if(m.t==='end'){if(rec)postMessage({t:'final',text:JSON.parse(rec.FinalResult()).text||''});return}
  if(m.t==='stop'){freeRec();return}
}catch(err){postMessage({t:'error',error:String(err&&err.message||err)})}};
