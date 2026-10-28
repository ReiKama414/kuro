// sprite slicer v6: explicit panel grid + fixed counts + per-cell component ownership
globalThis.slice6 = async function (file, species, counts, panelsIn, opts) {
  opts = opts || {};
  const CELL = 160;
  const CLIPS = ['idle','blink','walk_right','walk_left','walk_down','walk_up','run_right','run_left','sit','lay','sleep','jump','land','hit'];
  const maskSat = opts.maskSat != null ? opts.maskSat : 0.66;
  const im = await readImage(file);
  const W = im.width, H = im.height;
  const cv = createCanvas(W,H), cx = cv.getContext('2d'); cx.drawImage(im,0,0);
  const d = cx.getImageData(0,0,W,H).data;
  const m = new Uint8Array(W*H);
  for (let p=0;p<W*H;p++){const i=p*4; if(d[i+3]<40) continue;
    const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    if(mx && (mx-mn)/mx>maskSat && mx>90) continue;
    m[p]=1;}
  const lab=new Int32Array(W*H).fill(-1), st=new Int32Array(W*H), comps=[];
  for (let p=0;p<W*H;p++){
    if(!m[p]||lab[p]>=0)continue;
    const id=comps.length; let s=0; st[s++]=p; lab[p]=id;
    let n=0,aX=1e9,bX=-1,aY=1e9,bY=-1;
    while(s){const cur=st[--s];n++;const y=(cur/W)|0,x=cur-y*W;
      if(x<aX)aX=x;if(x>bX)bX=x;if(y<aY)aY=y;if(y>bY)bY=y;
      for(let dy=-1;dy<=1;dy++){const ny=y+dy;if(ny<0||ny>=H)continue;
        for(let dx=-1;dx<=1;dx++){const nx=x+dx;if(nx<0||nx>=W)continue;const nid=ny*W+nx;
          if(lab[nid]>=0||!m[nid])continue;lab[nid]=id;st[s++]=nid;}}}
    const w=bX-aX+1,h=bY-aY+1;
    comps.push({id,n,x0:aX,x1:bX,y0:aY,y1:bY,w,h,fill:n/(w*h)});
  }
  const keep=new Uint8Array(comps.length);
  comps.forEach(o=>{ if(o.n>=600 && o.h>=32 && !(o.w>150&&o.h<42) && o.fill>=0.22) keep[o.id]=1; });
  // numbered badges under each frame (colored circles) give exact frame centres
  const chrome=new Uint8Array(W*H);
  for (let p=0;p<W*H;p++){const i=p*4; if(d[i+3]<40)continue;
    const r=d[i],g=d[i+1],b2=d[i+2],mx=Math.max(r,g,b2),mn=Math.min(r,g,b2);
    if(mx && (mx-mn)/mx>0.45 && mx>80) chrome[p]=1;}
  const clab=new Int32Array(W*H).fill(-1), cst=new Int32Array(W*H), ccs=[];
  for (let p=0;p<W*H;p++){
    if(!chrome[p]||clab[p]>=0)continue;
    const id=ccs.length; let s2=0; cst[s2++]=p; clab[p]=id;
    let n=0,aX=1e9,bX=-1,aY=1e9,bY=-1;
    while(s2){const cur=cst[--s2];n++;const y=(cur/W)|0,x=cur-y*W;
      if(x<aX)aX=x;if(x>bX)bX=x;if(y<aY)aY=y;if(y>bY)bY=y;
      for(let dy=-1;dy<=1;dy++){const ny=y+dy;if(ny<0||ny>=H)continue;
        for(let dx=-1;dx<=1;dx++){const nx=x+dx;if(nx<0||nx>=W)continue;const nid=ny*W+nx;
          if(clab[nid]>=0||!chrome[nid])continue;clab[nid]=id;cst[s2++]=nid;}}}
    const w=bX-aX+1,h=bY-aY+1;
    ccs.push({n,x0:aX,x1:bX,y0:aY,y1:bY,w,h,fill:n/(w*h)});
  }
  const badges=ccs.filter(o=>o.w>=18&&o.w<=46&&o.h>=18&&o.h<=46&&Math.abs(o.w-o.h)<9&&o.fill>0.6);

  const out={};
  for (let pi=0; pi<14; pi++) {
    const P = panelsIn[pi], clip = CLIPS[pi], N = counts[clip];
    const ix0=P[0]+5, iy0=P[1]+5, ix1=P[0]+P[2]-6, iy1=P[1]+P[3]-6;
    const L=ix1-ix0+1, cw=L/N;
    // column occupancy inside the panel, used to snap cell edges to the waist between sprites
    const colN=new Int32Array(L);
    for(let y=iy0;y<=iy1;y++)for(let x=ix0;x<=ix1;x++){
      if(!m[y*W+x])continue; const id=lab[y*W+x]; if(!keep[id])continue; colN[x-ix0]++;}
    const inBadges=badges.filter(o=>{const bx=(o.x0+o.x1)/2, by=(o.y0+o.y1)/2;
      return bx>=P[0]&&bx<=P[0]+P[2]&&by>=P[1]&&by<=P[1]+P[3];})
      .map(o=>(o.x0+o.x1)/2).sort((p,q)=>p-q);
    // fit a uniform lattice of N frame centres to whatever badges were detected
    let lattice=null;
    if (inBadges.length>=3) {
      const diffs=[];
      for(let i=0;i<inBadges.length-1;i++) diffs.push(inBadges[i+1]-inBadges[i]);
      const base=Math.min.apply(null,diffs);
      const units=[];
      for(const g of diffs){ const k=Math.max(1,Math.round(g/base)); units.push(g/k); }
      units.sort((p,q)=>p-q);
      let pitch=units[Math.floor(units.length/2)];
      if (Math.abs(pitch-cw)>cw*0.18) pitch=cw;
      let bestOff=inBadges[0], bestErr=Infinity;
      for(let cand=-2;cand<=2;cand+=0.25){
        const off=inBadges[0]+cand*pitch;
        if(off<ix0-pitch*0.6||off+(N-1)*pitch>ix1+pitch*0.6) continue;
        let err=0;
        for(const bx of inBadges){ let best=Infinity;
          for(let i=0;i<N;i++) best=Math.min(best,Math.abs(bx-(off+i*pitch)));
          err+=best*best; }
        if(err<bestErr){bestErr=err;bestOff=off;}
      }
      const err=Math.sqrt(bestErr/inBadges.length);
      if (err<pitch*0.12) { lattice=[]; for(let i=0;i<N;i++) lattice.push(bestOff+i*pitch); }
    }
    const useBadges = !!lattice;
    const edges=[ix0];
    for(let i=1;i<N;i++){
      const nominal = useBadges ? (lattice[i-1]+lattice[i])/2 : ix0+i*cw;
      const span=cw*(useBadges?0.1:0.3);
      const lo=Math.max(ix0+1,Math.round(nominal-span)), hi=Math.min(ix1-1,Math.round(nominal+span));
      let bx=Math.round(nominal), bv=Infinity;
      for(let x=lo;x<=hi;x++){
        const v=colN[x-ix0]*1000 + Math.abs(x-nominal);
        if(v<bv){bv=v;bx=x;}}
      edges.push(bx);
    }
    edges.push(ix1+1);
    const strip=createCanvas(CELL*N,CELL), tc=strip.getContext('2d');
    const OUT=tc.createImageData(CELL*N,CELL);
    for (let idx=0; idx<N; idx++) {
      const b0=edges[idx], b1=edges[idx+1]-1;
      // pixel counts per component inside the cell
      const tally={};
      for(let y=iy0;y<=iy1;y++)for(let x=b0;x<=b1;x++){
        if(!m[y*W+x])continue; const id=lab[y*W+x];
        if(!keep[id])continue; tally[id]=(tally[id]||0)+1;}
      let bid=-1,bn=0;
      for(const k in tally) if(tally[k]>bn){bn=tally[k];bid=+k;}
      if(bid<0) continue;
      // own = every component that mostly lives in this cell (keeps tails, ears, paws)
      const own=new Set(), clipped=new Set();
      for(const k in tally){
        const id=+k, c=comps[id];
        const ratio=tally[k]/c.n;
        if(c.w>cw*1.5){ if(id===bid) clipped.add(id); }
        else if(ratio>=0.5) own.add(id);
      }
      if(!own.size && !clipped.size) clipped.add(bid);
      const px=(x,y)=>{
        if(!m[y*W+x]||y<iy0||y>iy1) return false;
        const id=lab[y*W+x];
        if(own.has(id)) return true;
        if(clipped.has(id) && x>=b0 && x<=b1) return true;
        return false;
      };
      const ids=[...own,...clipped].map(i=>comps[i]);
      const rx0=Math.max(ix0, Math.min(b0, ...ids.map(c=>c.x0)));
      const rx1=Math.min(ix1, Math.max(b1, ...ids.map(c=>c.x1)));
      const ry0=Math.max(iy0, Math.min(...ids.map(c=>c.y0)));
      const ry1=Math.min(iy1, Math.max(...ids.map(c=>c.y1)));
      let minX=1e9,maxX=-1,minY=1e9,maxY=-1;
      for(let y=ry0;y<=ry1;y++)for(let x=rx0;x<=rx1;x++){
        if(!px(x,y))continue;
        if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
      if(maxX<0) continue;
      const h=maxY-minY+1, fy=maxY-Math.round(h*0.35);
      let fmin=1e9,fmax=-1;
      for(let y=fy;y<=maxY;y++)for(let x=minX;x<=maxX;x++) if(px(x,y)){ if(x<fmin)fmin=x; if(x>fmax)fmax=x; }
      if(fmax<0){fmin=minX;fmax=maxX;}
      const c0=(fmin+fmax)/2;
      const offX=Math.round(idx*CELL+CELL/2-(c0-minX))-minX, offY=(CELL-6-h)-minY;
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        if(!px(x,y))continue;
        const dx=x+offX, dy=y+offY;
        if(dx<0||dy<0||dx>=CELL*N||dy>=CELL)continue;
        const si=(y*W+x)*4, di=(dy*CELL*N+dx)*4;
        OUT.data[di]=d[si];OUT.data[di+1]=d[si+1];OUT.data[di+2]=d[si+2];OUT.data[di+3]=d[si+3];}
    }
    tc.putImageData(OUT,0,0);
    if(!opts.dry) await saveFile('assets/sprites/'+species+'/'+clip+'.png', strip);
    out[clip]=N;
  }
  log(species,'sliced');
  return out;
};

// median panel grid measured from the four sheets with clean borders
globalThis.PANEL_GRID = [
  [7,4,884,164],[901,4,627,164],
  [8,175,760,159],[774,175,756,159],
  [7,340,759,168],[774,340,757,169],
  [7,512,758,159],[773,512,757,159],
  [7,678,486,155],[496,678,502,155],[1013,678,517,155],
  [7,842,509,174],[523,842,489,174],[1016,842,514,174]
];
