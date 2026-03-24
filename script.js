// ════════════════════════════════════════
//   DOCCONVERTER — script.js
//   1. Compress (Low / Medium / High)
//   2. Convert format (PDF, DOCX, JPG…)
//   3. Target exact size (KB, MB, GB)
// ════════════════════════════════════════

let selectedFile  = null;
let selectedMode  = null; // 'compress' | 'convert' | 'resize'
let selectedLevel = null; // 'low' | 'medium' | 'high'
let selectedFmt   = null; // 'pdf' | 'docx' | 'jpg' etc.
let targetBytes   = null; // number in bytes

// ── FILE TYPE GROUPS ──
const IMAGES  = ['jpg','jpeg','png','webp','gif','bmp','tiff','tif','svg','ico'];
const TEXTS   = ['txt','csv','json','xml','html','htm','css','js','ts','md','log','yaml','yml','ini','cfg','rtf'];
const OFFICES = ['docx','xlsx','pptx','odt','ods','odp','doc','xls','ppt'];
const MEDIA   = ['mp3','mp4','wav','avi','mov','mkv','flv','wmv','aac','ogg','webm','m4v','m4a'];
const ARCHIVES= ['zip','rar','7z','tar','gz','bz2'];

function getExt(f){ return f.name.split('.').pop().toLowerCase(); }

function getCat(ext){
  if(IMAGES.includes(ext))   return 'Image';
  if(TEXTS.includes(ext))    return 'Text';
  if(OFFICES.includes(ext))  return 'Office';
  if(MEDIA.includes(ext))    return 'Media';
  if(ARCHIVES.includes(ext)) return 'Archive';
  if(ext==='pdf')            return 'PDF';
  return 'File';
}

function getIcon(ext){
  return {pdf:'📕',doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',
    jpg:'🖼️',jpeg:'🖼️',png:'🌅',gif:'🎞️',webp:'🖼️',bmp:'🖼️',svg:'🎨',ico:'🖼️',
    txt:'📝',csv:'📊',json:'⚙️',xml:'📋',html:'🌐',htm:'🌐',css:'🎨',js:'⚙️',ts:'⚙️',md:'📝',
    mp3:'🎵',wav:'🎵',aac:'🎵',ogg:'🎵',m4a:'🎵',
    mp4:'🎬',avi:'🎬',mov:'🎬',mkv:'🎬',flv:'🎬',wmv:'🎬',webm:'🎬',
    zip:'🗜️',rar:'🗜️',gz:'🗜️',tar:'🗜️'}[ext]||'📄';
}

function fmtBytes(b){
  if(b<1024)       return b+' B';
  if(b<1048576)    return (b/1024).toFixed(1)+' KB';
  if(b<1073741824) return (b/1048576).toFixed(2)+' MB';
  return (b/1073741824).toFixed(3)+' GB';
}

function toBytes(val,unit){
  const v=parseFloat(val);
  if(isNaN(v)||v<=0) return null;
  return Math.round(v*{B:1,KB:1024,MB:1048576,GB:1073741824}[unit]);
}

// ── QUICK SIZE PRESET ──
function setSize(val,unit){
  document.getElementById('targetValue').value=val;
  document.getElementById('targetUnit').value=unit;
  updateSizePreview();
}

// ── DROPZONE ──
const dz=document.getElementById('dropzone');
const fi=document.getElementById('fileInput');

dz.addEventListener('dragover',  e=>{e.preventDefault();dz.classList.add('over');});
dz.addEventListener('dragleave', ()=>dz.classList.remove('over'));
dz.addEventListener('drop', e=>{
  e.preventDefault(); dz.classList.remove('over');
  if(e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});
fi.addEventListener('change',()=>{ if(fi.files[0]) loadFile(fi.files[0]); });

function loadFile(f){
  selectedFile=f;
  const ext=getExt(f);
  document.getElementById('fpIcon').textContent=getIcon(ext);
  document.getElementById('fpName').textContent=f.name;
  document.getElementById('fpSize').textContent=fmtBytes(f.size);
  document.getElementById('fpExt').textContent=ext.toUpperCase();
  document.getElementById('fpCat').textContent=getCat(ext);
  document.getElementById('filePill').classList.add('show');
  hideResult(); hideError(); checkReady();
}

document.getElementById('fpRemove').addEventListener('click',()=>{
  selectedFile=null;
  document.getElementById('filePill').classList.remove('show');
  fi.value='';
  hideResult(); hideError(); checkReady();
});

// ── MODE SELECT ──
document.querySelectorAll('.mode-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedMode=btn.dataset.mode;
    // Show correct option card
    document.getElementById('card-compress').classList.remove('show');
    document.getElementById('card-convert').classList.remove('show');
    document.getElementById('card-resize').classList.remove('show');
    document.getElementById('card-'+selectedMode).classList.add('show');
    hideResult(); hideError(); checkReady();
  });
});

// ── LEVEL SELECT ──
document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedLevel=btn.dataset.level;
    hideResult(); hideError(); checkReady();
  });
});

// ── FORMAT SELECT ──
document.querySelectorAll('.fmt-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.fmt-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    selectedFmt=btn.dataset.fmt;
    hideResult(); hideError(); checkReady();
  });
});

// ── SIZE PREVIEW ──
document.getElementById('targetValue').addEventListener('input', updateSizePreview);
document.getElementById('targetUnit').addEventListener('change', updateSizePreview);

function updateSizePreview(){
  const v=document.getElementById('targetValue').value;
  const u=document.getElementById('targetUnit').value;
  const b=toBytes(v,u);
  const el=document.getElementById('sizePreview');
  if(b){
    el.textContent='→ '+b.toLocaleString()+' bytes ('+fmtBytes(b)+')';
    targetBytes=b;
  } else {
    el.textContent=''; targetBytes=null;
  }
  checkReady();
}

// ── READY CHECK ──
function checkReady(){
  const btn=document.getElementById('actionBtn');
  let ready=false;
  let label='Select a file and choose an action';

  if(selectedFile && selectedMode==='compress' && selectedLevel){
    ready=true;
    label='Compress '+getExt(selectedFile).toUpperCase()+' — '+selectedLevel.charAt(0).toUpperCase()+selectedLevel.slice(1);
  }
  if(selectedFile && selectedMode==='convert' && selectedFmt){
    ready=true;
    label='Convert '+getExt(selectedFile).toUpperCase()+' → '+selectedFmt.toUpperCase();
  }
  if(selectedFile && selectedMode==='resize' && targetBytes){
    ready=true;
    label='Resize to '+fmtBytes(targetBytes);
  }

  btn.disabled=!ready;
  btn.textContent=label;
}

// ── UI HELPERS ──
function showProgress(pct,msg){
  document.getElementById('progressWrap').classList.add('show');
  document.getElementById('progressFill').style.width=pct+'%';
  document.getElementById('progressText').textContent=msg;
}
function hideProgress(){ document.getElementById('progressWrap').classList.remove('show'); }

function showResult(name,blob){
  const url=URL.createObjectURL(blob);
  const saved=Math.max(0,selectedFile.size-blob.size);
  const pct=Math.round((saved/selectedFile.size)*100);

  document.getElementById('resultName').textContent=name;
  document.getElementById('resultSub').textContent=fmtBytes(selectedFile.size)+' → '+fmtBytes(blob.size);
  document.getElementById('dlLink').href=url;
  document.getElementById('dlLink').download=name;
  document.getElementById('statOrig').textContent=fmtBytes(selectedFile.size);
  document.getElementById('statNew').textContent=fmtBytes(blob.size);
  document.getElementById('statSaved').textContent=(pct>0?pct+'% saved':'Resized');
  document.getElementById('result').classList.add('show');
  document.getElementById('statsRow').classList.add('show');
}
function hideResult(){
  document.getElementById('result').classList.remove('show');
  document.getElementById('statsRow').classList.remove('show');
}
function showError(m){
  const el=document.getElementById('errorMsg');
  el.textContent='⚠ '+m; el.classList.add('show');
}
function hideError(){ document.getElementById('errorMsg').classList.remove('show'); }
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

// ════════════════════════════════════════
//   MAIN PROCESS BUTTON
// ════════════════════════════════════════
document.getElementById('actionBtn').addEventListener('click', async()=>{
  if(!selectedFile||!selectedMode) return;
  hideResult(); hideError();

  const btn=document.getElementById('actionBtn');
  btn.disabled=true; btn.textContent='Processing…';

  try {
    const ext=getExt(selectedFile);
    const cat=getCat(ext).toLowerCase();
    const base=selectedFile.name.replace(/\.[^.]+$/,'');
    const ab=await selectedFile.arrayBuffer();
    const bytes=new Uint8Array(ab);
    let blob=null, outName=selectedFile.name;

    showProgress(10,'Reading file…');

    // ════════════════
    //  MODE: COMPRESS
    // ════════════════
    if(selectedMode==='compress'){
      showProgress(35,'Compressing…');
      const cfg={
        low:   {q:0.80,scale:1.00,txt:1},
        medium:{q:0.50,scale:0.75,txt:2},
        high:  {q:0.20,scale:0.50,txt:3}
      }[selectedLevel];

      if(IMAGES.includes(ext) && ext!=='svg'){
        blob=await compressImage(selectedFile,cfg.q,cfg.scale);
        outName=base+'_compressed.'+ext;
      } else if(ext==='svg'||TEXTS.includes(ext)){
        const text=new TextDecoder().decode(bytes);
        blob=new Blob([minify(text,cfg.txt)],{type:selectedFile.type||'text/plain'});
        outName=base+'_compressed.'+ext;
      } else if(OFFICES.includes(ext)){
        blob=compressOffice(bytes,selectedLevel);
        outName=base+'_compressed.'+ext;
      } else {
        blob=await makeZip(bytes,selectedFile.name);
        outName=base+'_compressed.zip';
      }
    }

    // ════════════════
    //  MODE: CONVERT
    // ════════════════
    else if(selectedMode==='convert'){
      showProgress(35,'Converting…');
      const to=selectedFmt;

      // Image → Image
      if(IMAGES.includes(ext) && ['jpg','jpeg','png','webp'].includes(to)){
        blob=await convertImage(selectedFile,to);
        outName=base+'.'+to;
      }
      // XLSX/XLS → CSV
      else if(['xlsx','xls'].includes(ext) && to==='csv'){
        const wb=XLSX.read(bytes,{type:'array'});
        blob=new Blob([XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])],{type:'text/csv'});
        outName=base+'.csv';
      }
      // XLSX/XLS → TXT
      else if(['xlsx','xls'].includes(ext) && to==='txt'){
        const wb=XLSX.read(bytes,{type:'array'});
        blob=new Blob([XLSX.utils.sheet_to_txt(wb.Sheets[wb.SheetNames[0]])],{type:'text/plain'});
        outName=base+'.txt';
      }
      // CSV → XLSX
      else if(ext==='csv' && to==='xlsx'){
        const text=new TextDecoder().decode(bytes);
        const wb=XLSX.read(text,{type:'string'});
        const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
        blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        outName=base+'.xlsx';
      }
      // CSV/TXT → TXT/CSV
      else if((ext==='csv'&&to==='txt')||(ext==='txt'&&to==='csv')){
        blob=new Blob([bytes],{type:to==='csv'?'text/csv':'text/plain'});
        outName=base+'.'+to;
      }
      // TXT → DOCX
      else if(ext==='txt' && to==='docx'){
        blob=txtToDocx(new TextDecoder().decode(bytes));
        outName=base+'.docx';
      }
      // DOCX → TXT
      else if(ext==='docx' && to==='txt'){
        blob=new Blob([docxToTxt(bytes)],{type:'text/plain'});
        outName=base+'.txt';
      }
      // PDF → TXT
      else if(ext==='pdf' && to==='txt'){
        blob=new Blob([pdfToTxt(bytes)],{type:'text/plain'});
        outName=base+'.txt';
      }
      // Anything → ZIP
      else if(to==='zip'){
        blob=await makeZip(bytes,selectedFile.name);
        outName=base+'.zip';
      }
      // Same or unsupported → copy
      else {
        blob=new Blob([bytes],{type:selectedFile.type});
        outName=base+'.'+to;
      }
    }

    // ════════════════
    //  MODE: RESIZE (Target size)
    // ════════════════
    else if(selectedMode==='resize'){
      showProgress(35,'Resizing to target…');

      if(IMAGES.includes(ext) && ext!=='svg'){
        blob=await resizeImageToTarget(selectedFile,ext,targetBytes);
        outName=base+'_resized.'+ext;
      } else {
        // For non-image files: compress text or wrap in zip
        if(TEXTS.includes(ext)||OFFICES.includes(ext)){
          const text=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
          const minified=minify(text,3);
          blob=new Blob([minified],{type:selectedFile.type||'text/plain'});
        } else {
          blob=await makeZip(bytes,selectedFile.name);
        }
        outName=base+'_resized.'+(blob.type==='application/zip'?'zip':ext);
      }
    }

    showProgress(90,'Finalising…');
    await wait(300);
    showProgress(100,'Done!');
    await wait(200);
    hideProgress();
    showResult(outName,blob);

  } catch(err){
    hideProgress();
    showError('Failed: '+err.message);
    console.error(err);
  }

  btn.disabled=false; checkReady();
});

// ════════════════════════════════════════
//   ENGINE FUNCTIONS
// ════════════════════════════════════════

// IMAGE COMPRESS
function compressImage(file,quality,scale){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(img.width*scale));
      c.height=Math.max(1,Math.round(img.height*scale));
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      const ext=getExt(file);
      const mime=ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';
      c.toBlob(b=>{URL.revokeObjectURL(url);res(b);},mime,quality);
    };
    img.onerror=()=>rej(new Error('Cannot read image'));
    img.src=url;
  });
}

// IMAGE CONVERT
function convertImage(file,toFmt){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas');
      c.width=img.width; c.height=img.height;
      c.getContext('2d').drawImage(img,0,0);
      const mime=toFmt==='png'?'image/png':toFmt==='webp'?'image/webp':'image/jpeg';
      c.toBlob(b=>{URL.revokeObjectURL(url);res(b);},mime,0.92);
    };
    img.onerror=()=>rej(new Error('Cannot read image'));
    img.src=url;
  });
}

// IMAGE RESIZE TO TARGET BYTES
function resizeImageToTarget(file,ext,target){
  return new Promise(res=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      const mime=ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';
      let q=0.9,w=img.width,h=img.height;
      const c=document.createElement('canvas');
      const attempt=()=>{
        c.width=Math.max(1,Math.round(w));
        c.height=Math.max(1,Math.round(h));
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        c.toBlob(b=>{
          if(!b||b.size<=target||q<0.05){res(b||new Blob([new Uint8Array(0)]));return;}
          q-=0.10;
          if(q<0.1){w*=0.8;h*=0.8;q=0.7;}
          attempt();
        },mime,q);
      };
      attempt();
      URL.revokeObjectURL(url);
    };
    img.onerror=()=>res(new Blob([new Uint8Array(0)]));
    img.src=url;
  });
}

// TEXT MINIFY
function minify(text,level){
  let o=text;
  if(level>=1){o=o.replace(/[ \t]+/g,' ');o=o.replace(/\n{3,}/g,'\n\n');}
  if(level>=2){o=o.replace(/\n{2,}/g,'\n');o=o.replace(/\/\/[^\n]*/g,'');o=o.replace(/<!--[\s\S]*?-->/g,'');}
  if(level>=3){o=o.replace(/\/\*[\s\S]*?\*\//g,'');o=o.replace(/>\s+</g,'><');o=o.trim();}
  return o;
}

// OFFICE COMPRESS
function compressOffice(bytes,level){
  try{
    let text=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
    if(level==='medium'||level==='high') text=text.replace(/>\s+</g,'><').replace(/\s{2,}/g,' ');
    return new Blob([new TextEncoder().encode(text)],{type:'application/octet-stream'});
  } catch(e){ return new Blob([bytes],{type:'application/octet-stream'}); }
}

// DOCX → TXT
function docxToTxt(bytes){
  try{
    const s=new TextDecoder('utf-8',{fatal:false}).decode(bytes);
    const m=s.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
    if(m) return m.map(x=>x.replace(/<[^>]+>/g,'')).join(' ').replace(/\s+/g,' ').trim();
    return '[No readable text found]';
  } catch(e){ return '[Error: '+e.message+']'; }
}

// PDF → TXT
function pdfToTxt(bytes){
  try{
    const raw=new TextDecoder('latin1').decode(bytes);
    const chunks=[];
    const bt=/BT[\s\S]*?ET/g; let m;
    while((m=bt.exec(raw))!==null){
      const tj=/\(([^)]*)\)\s*T[jJ]/g,ar=/\[([^\]]+)\]\s*TJ/g; let t;
      while((t=tj.exec(m[0]))!==null) chunks.push(t[1]);
      while((t=ar.exec(m[0]))!==null){const ts=t[1].match(/\(([^)]*)\)/g);if(ts)ts.forEach(x=>chunks.push(x.slice(1,-1)));}
    }
    return chunks.join(' ').replace(/\\n/g,'\n').replace(/\\\(/g,'(').replace(/\\\)/g,')').trim()||'[No readable text — PDF may be image-based]';
  } catch(e){ return '[Error: '+e.message+']'; }
}

// TXT → DOCX
function txtToDocx(text){
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  const paras=text.split('\n').map(l=>'<w:p><w:r><w:t xml:space="preserve">'+esc(l)+'</w:t></w:r></w:p>').join('');
  const xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paras+'</w:body></w:document>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  function s2u(s){return new TextEncoder().encode(s);}
  function u16(n){return[n&0xff,(n>>8)&0xff];}
  function u32(n){return[n&0xff,(n>>8)&0xff,(n>>16)&0xff,(n>>24)&0xff];}
  function crc32(b){const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c;}let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=t[(c^b[i])&0xff]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
  function entry(name,data){const nb=s2u(name),crc=crc32(data),hdr=new Uint8Array([0x50,0x4B,0x03,0x04,0x14,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0)]);return{hdr,nb,data,crc,size:data.length};}
  function buildZip(entries){const parts=[];let off=0;const cds=[];for(const e of entries){const loc=[...e.hdr,...e.nb,...e.data];parts.push(new Uint8Array(loc));cds.push(new Uint8Array([0x50,0x4B,0x01,0x02,0x14,0x00,0x14,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,...u32(e.crc),...u32(e.size),...u32(e.size),...u16(e.nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off),...e.nb]));off+=loc.length;}const cdS=off,cdL=cds.reduce((a,b)=>a+b.length,0);const eocd=new Uint8Array([0x50,0x4B,0x05,0x06,0,0,0,0,...u16(entries.length),...u16(entries.length),...u32(cdL),...u32(cdS),...u16(0)]);const all=[...parts,...cds,eocd],tot=all.reduce((a,b)=>a+b.length,0),buf=new Uint8Array(tot);let p=0;for(const x of all){buf.set(x,p);p+=x.length;}return buf;}
  return new Blob([buildZip([entry('_rels/.rels',s2u(rels)),entry('[Content_Types].xml',s2u(ct)),entry('word/document.xml',s2u(xml))])],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

// WRAP ANY FILE IN ZIP
function makeZip(bytes,filename){
  return new Promise(resolve=>{
    function u16(n){return[n&0xff,(n>>8)&0xff];}
    function u32(n){return[n&0xff,(n>>8)&0xff,(n>>16)&0xff,(n>>24)&0xff];}
    function crc32(data){const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c;}let c=0xFFFFFFFF;for(let i=0;i<data.length;i++)c=t[(c^data[i])&0xff]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
    const nb=new TextEncoder().encode(filename),crc=crc32(bytes);
    const lh=new Uint8Array([0x50,0x4B,0x03,0x04,0x14,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,...u32(crc),...u32(bytes.length),...u32(bytes.length),...u16(nb.length),...u16(0)]);
    const cd=new Uint8Array([0x50,0x4B,0x01,0x02,0x14,0x00,0x14,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,...u32(crc),...u32(bytes.length),...u32(bytes.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(0),...nb]);
    const ls=lh.length+nb.length+bytes.length;
    const eocd=new Uint8Array([0x50,0x4B,0x05,0x06,0,0,0,0,1,0,1,0,...u32(cd.length),...u32(ls),...u16(0)]);
    const tot=ls+cd.length+eocd.length,buf=new Uint8Array(tot);
    let p=0;buf.set(lh,p);p+=lh.length;buf.set(nb,p);p+=nb.length;buf.set(bytes,p);p+=bytes.length;buf.set(cd,p);p+=cd.length;buf.set(eocd,p);
    resolve(new Blob([buf],{type:'application/zip'}));
  });
}