import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Play, BookOpen, Eye, GitBranch, User, Shield, X } from "lucide-react";

const M={bg:"#0a0a0b",bg2:"#111113",bg3:"#19191c",bd:"rgba(255,255,255,0.08)",bd2:"rgba(255,255,255,0.14)",bdS:"rgba(255,255,255,0.22)",tx:"#fafafa",ts:"#a1a1aa",td:"#63636e",tg:"#3e3e45",ac:"#f97316",acS:"rgba(249,115,22,0.1)"};
const PC="#d4722b",BO="#e8702a",BD="#b5541c",STR=1.5,ETR=3.0;

function BallDot({size=7}){return(<svg width={size} height={size} viewBox="0 0 24 24" style={{display:"inline-block",verticalAlign:"baseline",marginLeft:1,marginBottom:-1}}><circle cx="12" cy="12" r="11" fill="#f97316" stroke="#c2610f" strokeWidth="1.5"/><path d="M1 12 Q7 7 12 12 Q17 17 23 12" fill="none" stroke="#c2610f" strokeWidth="0.9" opacity="0.55"/><line x1="12" y1="1" x2="12" y2="23" stroke="#c2610f" strokeWidth="0.9" opacity="0.45"/></svg>);}
function BallButton({children,onClick,style={}}){const[h,setH]=useState(false);return(<button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{position:"relative",overflow:"hidden",padding:"8px 18px",fontFamily:"inherit",fontSize:11,fontWeight:800,border:"none",background:h?"#fb923c":"#f97316",color:"#fff",cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"background 0.15s",...style}}><svg viewBox="0 0 200 50" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}><path d="M-10 25 Q50 8 100 25 Q150 42 210 25" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2"/><line x1="140" y1="-5" x2="140" y2="55" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/></svg><span style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:6}}>{children}</span></button>);}

function generateTiles(seed){const tiles=[];const colors=["#ca913c","#d19d47","#c88d32","#c98a28","#daa549","#cc9338","#cc9844","#d19740","#ca8c2f","#c48f3d","#d49d44","#c89240"];let rng=seed;const rand=()=>{rng=(rng*16807)%2147483647;return(rng&0x7fffffff)/2147483647;};let x=-28,id=0;while(x<28){const w=x<-27.5||x>27.5?0.52:0.94;let y=-3;const segs=2+Math.floor(rand()*2);for(let s=0;s<segs;s++){const h=s===segs-1?50-(y+3):3+rand()*35;const ch=Math.min(h,50-(y+3));if(ch>0)tiles.push({id:id++,x,y,w,h:ch,fill:colors[Math.floor(rand()*colors.length)]});y+=ch;if(y>=47)break;}x+=w;}return tiles;}

const PLAY={
  name:"Lakers Flare Slip",tag:"Ball Screen",
  desc:"Very simple action, works great against switch defense. Slip screens are a great counter because defenders usually anticipate the switch.",
  players:{"1":[0,32],"2":[-13,26],"3":[13,26],"4":[23,4],"5":[21,17]},
  roster:{"1":{name:"D'Angelo",pos:"PG"},"2":{name:"Austin",pos:"SG"},"3":{name:"Rui",pos:"SF"},"4":{name:"AD",pos:"PF"},"5":{name:"LeBron",pos:"C"}},
  defense:{"X1":[1,30],"X2":[-11,24],"X3":[11,24],"X4":[21,6],"X5":[19,15]},
  ballStart:"1",
  phases:[
    {label:"Phase 1",text:"4 jogs toward 2 and sells the flare screen, making it look like the action is for 2.",
      spotlightText:{"4":"YOU jog from the corner toward Player 2. Sell the screen — make it look real. The defense MUST believe you're screening.","2":"Watch Player 4 approach. Drift toward the corner as if using the flare screen.","1":"Hold the ball at the top. Read the defense — watch how X4 reacts.","3":"Stay spaced on the wing. Hold X3 in place.","5":"Hold the elbow. You're the release valve."},
      actions:[
        {marker:"screen",path:"M21.427 4.069 C-5.204 5.347 -16.703 11.397 -13.070 22.220",move:{id:"4",to:[-13.07,22.22]},stepLabel:"Flare screen fake",stepDesc:"Player 4 runs from the weak side toward Player 2, selling the screen."},
        {marker:"arrow",path:"M-14.364 25.238 C-15.977 24.036 -17.659 21.740 -19.410 18.350",move:{id:"2",to:[-19.41,18.35]},stepLabel:"Wing clear-out",stepDesc:"Player 2 drifts toward the corner to sell the flare action."},
      ],
      defenseActions:[{id:"X4",to:[-11,20],desc:"X4 follows 4 across, anticipating the screen"},{id:"X2",to:[-17,20],desc:"X2 shifts to prepare for the switch"}],
    },
  ],
  branchPoint:{
    prompt:"How does the defense react to the screen?",
    options:[
      {label:"X4 switches early",desc:"The defender jumps to the switch — the slip is wide open",icon:"→",
        phase:{label:"Phase 2A — Slip",text:"4 cuts hard to the basket. The switch created a gap.",
          spotlightText:{"4":"NOW — cut hard to the rim. X4 jumped to switch, you're wide open.","1":"X4 switched. Deliver the bounce pass to 4 cutting to the rim.","2":"Stay in the corner. Your gravity holds X2 away.","3":"Hold position. If X3 helps, you're the kick-out.","5":"Read help. If X5 drops, flash to the elbow."},
          detail:"The screen never happens. The ANTICIPATION creates the opening.",
          actions:[
            {marker:"arrow",path:"M-11.893 21.174 C-8.792 18.417 -5.686 15.655 -2.577 12.890",move:{id:"4",to:[-1.52,11.95]},stepLabel:"The slip cut",stepDesc:"4 cuts hard through the gap."},
            {marker:"arrow",dashed:true,path:"M-0.120 30.430 L-1.400 13.520",ball:{from:"1",to:"4"},stepLabel:"Entry pass",stepDesc:"1 delivers the bounce pass to 4."},
          ],
          defenseActions:[{id:"X4",to:[-15,18],desc:"X4 stuck on wrong side"},{id:"X5",to:[5,14],desc:"X5 helps but too late"}],
      }},
      {label:"X4 stays home",desc:"The defender doesn't switch — the real screen creates an open three",icon:"↗",
        phase:{label:"Phase 2B — Flare",text:"X4 didn't switch. 4 sets the actual screen. 2 gets an open three.",
          spotlightText:{"4":"X4 didn't bite. Set the REAL screen on X2. Solid contact.","2":"Screen is real. Come off tight, catch and shoot the three.","1":"Swing the pass to 2 coming off the screen.","3":"If X3 helps on 2's shot, relocate.","5":"Crash the boards for the long rebound."},
          detail:"When the defense doesn't switch, the original design works — flare screen for an open three.",
          actions:[
            {marker:"arrow",path:"M-19.410 18.350 C-19 15 -17 12 -15.5 10.5",move:{id:"2",to:[-15.5,10.5]},stepLabel:"Flare off screen",stepDesc:"2 uses the screen for an open three."},
            {marker:"arrow",dashed:true,path:"M-0.120 30.430 L-14.5 11.5",ball:{from:"1",to:"2"},stepLabel:"Skip pass",stepDesc:"1 fires the skip pass for catch-and-shoot."},
          ],
          defenseActions:[{id:"X4",to:[-12,20],desc:"X4 stays with 4"},{id:"X2",to:[-18,16],desc:"X2 caught behind the screen"}],
      }},
    ]
  },
};

const ns="http://www.w3.org/2000/svg";
function makePath(d){if(typeof document==="undefined")return null;const s=document.createElementNS(ns,"svg"),p=document.createElementNS(ns,"path");p.setAttribute("d",d);s.appendChild(p);document.body.appendChild(s);return{el:p,svg:s,len:p.getTotalLength(),remove:()=>document.body.removeChild(s)};}
function pointAtLen(d,len){const p=makePath(d);if(!p)return null;const pt=p.el.getPointAtLength(Math.max(0,len));p.remove();return[pt.x,pt.y];}
function calcLen(d){const p=makePath(d);if(!p)return 50;const l=p.len;p.remove();return l;}
const ease=t=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

export default function PlayViewerV3Fixed(){
  const [phaseIdx,setPhaseIdx]=useState(0);
  const [actIdx,setActIdx]=useState(-1);
  const [prog,setProg]=useState(1);
  const [pos,setPos]=useState({});
  const [defPos,setDefPos]=useState({});
  const [ball,setBall]=useState("1");
  const [lens,setLens]=useState({});
  const [isAnim,setIsAnim]=useState(false);
  const [labelMode,setLabelMode]=useState(0);
  const [ballPulse,setBallPulse]=useState(1);
  const [catchAnim,setCatchAnim]=useState(0);
  const [tooltip,setTooltip]=useState(null);
  const [showDefense,setShowDefense]=useState(false);
  const [spotlight,setSpotlight]=useState(null);
  const [branchChosen,setBranchChosen]=useState(null);
  const [showBranchPrompt,setShowBranchPrompt]=useState(false);

  // Refs to avoid stale closures in animation callbacks
  const branchRef=useRef(null);
  branchRef.current=branchChosen;

  const animRef=useRef(null);
  const pulseRef=useRef(null);
  const courtRef=useRef(null);
  const showDefRef=useRef(false);
  showDefRef.current=showDefense;
  const tiles=useMemo(()=>generateTiles(42),[]);

  const phases=useMemo(()=>{
    const base=[PLAY.phases[0]];
    if(branchChosen!==null) base.push(PLAY.branchPoint.options[branchChosen].phase);
    return base;
  },[branchChosen]);

  useEffect(()=>{
    const p={};Object.entries(PLAY.players).forEach(([id,v])=>{p[id]=[...v];});setPos(p);
    const dp={};Object.entries(PLAY.defense).forEach(([id,v])=>{dp[id]=[...v];});setDefPos(dp);
    const l={};
    PLAY.phases[0].actions.forEach((a,ai)=>{l[`0-${ai}`]=calcLen(a.path);});
    PLAY.branchPoint.options.forEach((opt,oi)=>{opt.phase.actions.forEach((a,ai)=>{l[`b${oi}-${ai}`]=calcLen(a.path);});});
    setLens(l);
    const tick=()=>{setBallPulse(1+Math.sin(Date.now()*0.003)*0.06);pulseRef.current=requestAnimationFrame(tick);};
    pulseRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(pulseRef.current);
  },[]);

  const phase=phases[phaseIdx]||phases[0];
  const curAct=actIdx>=0&&actIdx<phase.actions.length?phase.actions[actIdx]:null;
  const getLenKey=(pi,ai)=>pi===0?`0-${ai}`:`b${branchRef.current}-${ai}`;
  const curLen=curAct?lens[getLenKey(phaseIdx,actIdx)]||50:50;
  const isPassAction=!!curAct?.dashed;
  const drawProg=Math.min(1,prog/0.35);
  const fadeProg=Math.max(0,Math.min(1,(prog-0.35)/0.30));
  const lineOpacity=prog<0.35?1:Math.max(0.10,1-fadeProg*0.9);
  const visEnd=curLen-ETR;const visLen=Math.max(0,visEnd-STR);const drawnLen=visLen*drawProg;

  const ghosts=useMemo(()=>{
    const r=[];
    for(let pi=0;pi<phaseIdx;pi++) phases[pi]?.actions.forEach((a,ai)=>r.push({...a,k:`g-${pi}-${ai}`,pi,ai}));
    if(actIdx>=0) for(let ai=0;ai<actIdx;ai++) r.push({...phase.actions[ai],k:`g-${phaseIdx}-${ai}`,pi:phaseIdx,ai});
    return r;
  },[phaseIdx,actIdx,phase,phases]);

  // Compute marker positions for ghost trails so arrows persist after completion
  const ghostMarkers=useMemo(()=>{
    return ghosts.map(a=>{
      const gLen=lens[getLenKey(a.pi,a.ai)]||50;
      const gEnd=gLen-ETR;
      const tip=pointAtLen(a.path,gEnd);
      const behind=pointAtLen(a.path,Math.max(0,gEnd-1.5));
      if(!tip||!behind)return null;
      const angle=Math.atan2(tip[1]-behind[1],tip[0]-behind[0])*180/Math.PI;
      return{tip,angle,type:a.marker,dashed:!!a.dashed,k:a.k};
    }).filter(Boolean);
  },[ghosts,lens]);

  const ballPos=useMemo(()=>{
    const hp=pos[ball]||PLAY.players[ball];
    if(curAct?.ball&&prog<0.35){const f=pos[curAct.ball.from]||PLAY.players[curAct.ball.from];const t=pos[curAct.ball.to]||PLAY.players[curAct.ball.to];const p=drawProg;return{x:f[0]+(t[0]-f[0])*p,y:f[1]+(t[1]-f[1])*p,traveling:true};}
    return{x:hp[0]+2.2,y:hp[1]-2.2,traveling:false};
  },[ball,pos,curAct,prog,drawProg]);

  const markerInfo=useMemo(()=>{
    if(!curAct||drawProg<0.9)return null;const tip=pointAtLen(curAct.path,visEnd);const behind=pointAtLen(curAct.path,Math.max(0,visEnd-1.5));
    if(!tip||!behind)return null;return{tip,angle:Math.atan2(tip[1]-behind[1],tip[0]-behind[0])*180/Math.PI,type:curAct.marker,opacity:lineOpacity};
  },[curAct,drawProg,visEnd,lineOpacity]);

  // Core animation — uses refs to avoid stale closures
  const animateAction=useCallback((pi,ai,phaseData,onComplete)=>{
    setTooltip(null);setPhaseIdx(pi);setActIdx(ai);setProg(0);setIsAnim(true);
    const action=phaseData.actions[ai];
    const dur=action.dashed?1800:2400;
    const start=performance.now();
    const defActs=phaseData.defenseActions||[];
    const lenKey=pi===0?`0-${ai}`:`b${branchRef.current}-${ai}`;

    const tick=(now)=>{
      const raw=Math.min(1,(now-start)/dur);
      const t=ease(raw);
      setProg(t);
      if(action.move){const mp=Math.max(0,(t-0.65)/0.35);if(mp>0&&mp<1){const tl=lens[lenKey]||50;const pt=pointAtLen(action.path,tl*mp);if(pt)setPos(prev=>({...prev,[action.move.id]:pt}));}}
      if(showDefRef.current&&ai===0){defActs.forEach(da=>{const sp=PLAY.defense[da.id];const ep=da.to;const dp=Math.min(1,t*1.2);setDefPos(prev=>({...prev,[da.id]:[sp[0]+(ep[0]-sp[0])*dp,sp[1]+(ep[1]-sp[1])*dp]}));});}
      if(raw<1){animRef.current=requestAnimationFrame(tick);}
      else{
        if(action.move)setPos(prev=>({...prev,[action.move.id]:action.move.to}));
        if(action.ball){setBall(action.ball.to);setCatchAnim(1);setTimeout(()=>setCatchAnim(0),400);}
        setIsAnim(false);
        if(onComplete)onComplete();
      }
    };
    cancelAnimationFrame(animRef.current);
    animRef.current=requestAnimationFrame(tick);
  },[lens]);

  const rebuild=useCallback((toPi,toAi,phasesArr)=>{
    const p={};Object.entries(PLAY.players).forEach(([id,v])=>{p[id]=[...v];});let b=PLAY.ballStart;
    const dp={};Object.entries(PLAY.defense).forEach(([id,v])=>{dp[id]=[...v];});
    for(let pi=0;pi<=toPi;pi++){
      const ph=phasesArr?phasesArr[pi]:phases[pi];if(!ph)break;
      const maxA=pi<toPi?ph.actions.length:toAi;
      for(let ai=0;ai<maxA;ai++){const a=ph.actions[ai];if(a.move)p[a.move.id]=[...a.move.to];if(a.ball)b=a.ball.to;}
      if(pi<=toPi)(ph.defenseActions||[]).forEach(da=>{dp[da.id]=[...da.to];});
    }
    setPos(p);setBall(b);setDefPos(dp);
  },[phases]);

  // Play All: chains through Phase 0 actions, then shows branch prompt
  const playAll=()=>{
    setTooltip(null);setShowBranchPrompt(false);setBranchChosen(null);
    const p={};Object.entries(PLAY.players).forEach(([id,v])=>{p[id]=[...v];});setPos(p);
    const dp={};Object.entries(PLAY.defense).forEach(([id,v])=>{dp[id]=[...v];});setDefPos(dp);
    setBall(PLAY.ballStart);

    const phase0=PLAY.phases[0];
    const acts=phase0.actions;
    let i=0;
    const runNext=()=>{
      if(i>=acts.length){
        // Phase 0 complete — show branch prompt!
        setTimeout(()=>setShowBranchPrompt(true),400);
        return;
      }
      const ai=i;i++;
      if(ai>0){
        // rebuild to state before this action
        const rp={};Object.entries(PLAY.players).forEach(([id,v])=>{rp[id]=[...v];});let rb=PLAY.ballStart;
        const rdp={};Object.entries(PLAY.defense).forEach(([id,v])=>{rdp[id]=[...v];});
        for(let j=0;j<ai;j++){const a=acts[j];if(a.move)rp[a.move.id]=[...a.move.to];if(a.ball)rb=a.ball.to;}
        (phase0.defenseActions||[]).forEach(da=>{rdp[da.id]=[...da.to];});
        setPos(rp);setBall(rb);setDefPos(rdp);
      }
      animateAction(0,ai,phase0,()=>{setTimeout(runNext,300);});
    };
    setTimeout(runNext,200);
  };

  // Next: step forward, or show branch prompt at the end of Phase 0
  const next=()=>{
    if(isAnim)return;setTooltip(null);
    const n=actIdx+1;
    if(n<phase.actions.length){
      animateAction(phaseIdx,n,phase,()=>{
        // If just finished last action of phase 0 and no branch chosen
        if(phaseIdx===0&&n===phase.actions.length-1&&branchRef.current===null){
          setTimeout(()=>setShowBranchPrompt(true),400);
        }
      });
    }else if(phaseIdx===0&&branchRef.current===null){
      // Already at end of phase 0, show branch prompt
      setShowBranchPrompt(true);
    }else if(phaseIdx<phases.length-1){
      const nextPhase=phases[phaseIdx+1];
      rebuild(phaseIdx+1,0);
      animateAction(phaseIdx+1,0,nextPhase,null);
    }
  };

  const prev=()=>{if(isAnim)return;setTooltip(null);
    if(actIdx>0){rebuild(phaseIdx,actIdx-1);animateAction(phaseIdx,actIdx-1,phase,null);}
    else if(phaseIdx>0){const prevPh=phases[phaseIdx-1];rebuild(phaseIdx-1,prevPh.actions.length-1);animateAction(phaseIdx-1,prevPh.actions.length-1,prevPh,null);}
  };

  const reset=()=>{setTooltip(null);setShowBranchPrompt(false);setBranchChosen(null);cancelAnimationFrame(animRef.current);
    const p={};Object.entries(PLAY.players).forEach(([id,v])=>{p[id]=[...v];});setPos(p);
    const dp={};Object.entries(PLAY.defense).forEach(([id,v])=>{dp[id]=[...v];});setDefPos(dp);
    setBall(PLAY.ballStart);setPhaseIdx(0);setActIdx(-1);setProg(1);setIsAnim(false);};

  const chooseBranch=(idx)=>{
    setBranchChosen(idx);branchRef.current=idx;setShowBranchPrompt(false);
    const branchPhase=PLAY.branchPoint.options[idx].phase;
    // Rebuild to end of phase 0
    const p={};Object.entries(PLAY.players).forEach(([id,v])=>{p[id]=[...v];});let b=PLAY.ballStart;
    const dp={};Object.entries(PLAY.defense).forEach(([id,v])=>{dp[id]=[...v];});
    PLAY.phases[0].actions.forEach(a=>{if(a.move)p[a.move.id]=[...a.move.to];if(a.ball)b=a.ball.to;});
    (PLAY.phases[0].defenseActions||[]).forEach(da=>{dp[da.id]=[...da.to];});
    setPos(p);setBall(b);setDefPos(dp);
    // Animate first action of chosen branch
    setTimeout(()=>animateAction(1,0,branchPhase,()=>{
      setTimeout(()=>animateAction(1,1,branchPhase,null),300);
    }),300);
  };

  const handleSegmentClick=(e,action)=>{if(!courtRef.current)return;const r=courtRef.current.getBoundingClientRect();setTooltip({x:e.clientX-r.left,y:e.clientY-r.top,label:action.stepLabel,desc:action.stepDesc});};

  const playerOrder=useMemo(()=>{const ids=Object.keys(PLAY.players);if(curAct?.move){const m=curAct.move.id;return[...ids.filter(id=>id!==m),m];}return ids;},[curAct]);
  const getLabel=(id)=>{if(labelMode===0)return id;if(labelMode===1)return PLAY.roster[id]?.pos||id;return PLAY.roster[id]?.name||id;};
  const bs=catchAnim>0?1.3-catchAnim*0.3:ballPulse;
  const spotText=spotlight&&phase?.spotlightText?.[spotlight]||null;

  return(
    <div style={{minHeight:"100vh",background:M.bg,color:M.ts,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",fontSize:13}}>

      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 20px",borderBottom:"1px solid "+M.bdS,background:M.bg}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:16,fontWeight:800,color:M.tx,letterSpacing:"-0.5px"}}>motion<BallDot size={7}/></div>
          <div style={{height:18,width:1,background:M.bd2}}/>
          <div style={{display:"inline-flex",border:"1px solid "+M.bdS}}>
            {["Playbook","Body","Drills","Game IQ"].map((t,i)=>(<div key={i} style={{padding:"4px 12px",fontSize:10,fontWeight:i===0?800:500,borderRight:i<3?"1px solid "+M.bdS:"none",background:i===0?M.acS:"transparent",color:i===0?M.ac:M.td,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px"}}>{t}</div>))}
          </div>
        </div>
        <div style={{width:28,height:28,border:"1px solid "+M.bdS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:M.tx,fontWeight:800,background:M.bg2}}>CW</div>
      </nav>

      <div style={{padding:"6px 20px",fontSize:10,color:M.tg,borderBottom:"1px solid "+M.bd}}>
        <span style={{color:M.td}}>Play library</span><span style={{margin:"0 6px"}}>›</span><span style={{color:M.ts}}>{PLAY.name}</span>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"20px 20px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <h1 style={{fontSize:28,fontWeight:900,color:M.tx,margin:"0 0 6px",letterSpacing:"-1.5px"}}>{PLAY.name}</h1>
            <div style={{display:"flex",gap:4}}>
              <span style={{fontSize:9,padding:"2px 6px",border:"1px solid "+M.ac+"40",background:M.acS,color:M.ac,fontWeight:600,textTransform:"uppercase"}}>{PLAY.tag}</span>
              <span style={{fontSize:9,padding:"2px 6px",border:"1px solid "+M.bd,color:M.td}}>Horns</span>
              {branchChosen!==null&&<span style={{fontSize:9,padding:"2px 6px",border:"1px solid rgba(168,85,247,0.3)",background:"rgba(168,85,247,0.08)",color:"#a855f7",fontWeight:600,display:"flex",alignItems:"center",gap:3}}><GitBranch size={9}/>{PLAY.branchPoint.options[branchChosen].label}</span>}
            </div>
          </div>
          <BallButton onClick={playAll} style={{opacity:isAnim?0.5:1}}><Play size={11}/> Play all</BallButton>
        </div>

        {/* GAME-CHANGER TOGGLES */}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <div onClick={()=>setShowDefense(!showDefense)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",border:"1px solid "+(showDefense?"rgba(239,68,68,0.4)":M.bd2),background:showDefense?"rgba(239,68,68,0.08)":"transparent",color:showDefense?"#ef4444":M.td,cursor:"pointer",fontSize:10,fontWeight:600}}>
            <Shield size={12}/> {showDefense?"Defense on":"Show defense"}
          </div>
          <div style={{display:"inline-flex",border:"1px solid "+M.bd2,fontSize:10}}>
            <div onClick={()=>setSpotlight(null)} style={{padding:"5px 8px",color:!spotlight?M.ac:M.td,background:!spotlight?M.acS:"transparent",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:3}}><Eye size={11}/> All</div>
            {Object.keys(PLAY.players).map(id=>(<div key={id} onClick={()=>setSpotlight(spotlight===id?null:id)} style={{padding:"5px 8px",borderLeft:"1px solid "+M.bd2,color:spotlight===id?M.ac:M.td,background:spotlight===id?M.acS:"transparent",cursor:"pointer",fontWeight:spotlight===id?800:500}}>{id}</div>))}
          </div>
        </div>

        {/* COURT */}
        <div style={{border:"1px solid "+M.bdS,overflow:"hidden",marginBottom:16,position:"relative"}}>
          <div style={{display:"flex",borderBottom:"1px solid "+M.bd,background:M.bg2}}>
            {phases.map((p,i)=>(<div key={i} onClick={()=>{if(!isAnim){setTooltip(null);rebuild(i,0);animateAction(i,0,phases[i],null);}}} style={{padding:"8px 16px",fontSize:11,fontWeight:i===phaseIdx?800:500,color:i===phaseIdx?M.ac:M.td,borderBottom:i===phaseIdx?"2px solid "+M.ac:"2px solid transparent",cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px"}}>{p.label}</div>))}
            {branchChosen===null&&<div style={{padding:"8px 16px",fontSize:10,color:M.tg,display:"flex",alignItems:"center",gap:4}}><GitBranch size={10}/> Awaiting read</div>}
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",paddingRight:12}}>
              <div onClick={()=>setLabelMode((labelMode+1)%3)} style={{padding:"3px 8px",fontSize:9,border:"1px solid "+M.bd2,color:M.ts,cursor:"pointer",fontWeight:600}}>{["#","POS","NAME"][labelMode]} ▼</div>
            </div>
          </div>

          <div ref={courtRef} style={{position:"relative"}}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="-28 -3 56 50" style={{display:"block",width:"100%"}} fontFamily="system-ui,sans-serif">
              <rect width="56" height="50" x="-28" y="-3" fill="rgb(219,192,151)"/>
              <g>{tiles.map(t=><rect key={t.id} x={t.x} y={t.y} width={t.w} height={t.h} fill={t.fill}/>)}</g>
              <rect x="-28" y="-3" width="56" height="50" fill="rgb(245,225,205)" fillOpacity="0.65"/>

              <g stroke="#fff" strokeWidth="0.3" fill="none" strokeLinecap="square">
                <line x1="-25" y1="0" x2="25" y2="0"/><line x1="-25" y1="0" x2="-25" y2="47"/><line x1="25" y1="0" x2="25" y2="47"/>
                <path d="M-6 0L-6 19L6 19L6 0"/><path d="M-6 19A6 6 0 0 0 6 19"/>
                <path d="M-21.65 0L-21.65 9.95A22.15 22.15 0 0 0 21.65 9.95L21.65 0"/>
                <path d="M6 47A6 6 0 0 0-6 47"/><circle cx="0" cy="5.25" r="0.75"/>
              </g>

              {/* Ghosts */}
              {ghosts.map(a=>{const gLen=lens[getLenKey(a.pi,a.ai)]||50;const gVis=Math.max(0,gLen-STR-ETR);const dim=spotlight&&a.move?.id!==spotlight;
                return <g key={a.k} opacity={dim?0.1:1}><path d={a.path} strokeWidth="0.22" fill="none" stroke={a.dashed?PC:"rgba(51,51,51,0.10)"} strokeDasharray={a.dashed?"1.2 0.4":`${gVis} ${gLen}`} strokeDashoffset={`-${STR}`} opacity={a.dashed?0.15:1}/><path d={a.path} strokeWidth="2.5" fill="none" stroke="transparent" style={{cursor:"pointer"}} onClick={e=>handleSegmentClick(e,a)}/></g>;
              })}

              {/* Ghost markers — arrows/screens persisting on completed trails */}
              {ghostMarkers.map(gm=>(
                <g key={"gm-"+gm.k} transform={`translate(${gm.tip[0]} ${gm.tip[1]}) rotate(${gm.angle})`} opacity={0.15}>
                  {gm.type==="screen"
                    ?<rect x="0" y="-1.2" width="0.4" height="2.4" fill={gm.dashed?PC:"rgba(51,51,51,1)"}/>
                    :<polygon points="-1.4 -0.8,0 0,-1.4 0.8,-1.3 0" fill={gm.dashed?PC:"rgba(51,51,51,1)"}/>}
                </g>
              ))}

              {/* Current */}
              {curAct&&(()=>{const dim=spotlight&&curAct.move?.id!==spotlight&&!curAct.ball;
                return <g opacity={dim?0.15:1}><path d={curAct.path} strokeWidth="0.22" fill="none" stroke={isPassAction?PC:"rgba(51,51,51,1)"} strokeDasharray={`${drawnLen} ${curLen}`} strokeDashoffset={`-${STR}`} opacity={lineOpacity} strokeLinecap="round"/><path d={curAct.path} strokeWidth="2.5" fill="none" stroke="transparent" style={{cursor:"pointer"}} onClick={e=>handleSegmentClick(e,curAct)}/></g>;
              })()}

              {/* Defense */}
              {showDefense&&Object.entries(defPos).map(([id,dp])=>{const dim=spotlight!==null;return(
                <g key={id} transform={`translate(${dp[0]} ${dp[1]})`} opacity={dim?0.25:0.75}>
                  <circle cx="0" cy="0" r="1.6" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.6)" strokeWidth="0.18" strokeDasharray="0.8 0.4"/>
                  <svg x="-4.725" y="-4.725" width="9.45" height="9.45" viewBox="-150 -150 300 300"><text textAnchor="middle" dominantBaseline="central" fill="rgba(239,68,68,0.7)" fontWeight="700" fontSize="55" fontFamily="system-ui,sans-serif" x="0" y="0">{id}</text></svg>
                </g>);
              })}

              {/* Players */}
              {playerOrder.map(id=>{const p=pos[id]||PLAY.players[id];const hasBall=id===ball;const lbl=getLabel(id);const fs=labelMode===2?Math.min(50,180/lbl.length):70;const dim=spotlight&&spotlight!==id;
                return(<g key={id} transform={`translate(${p[0]} ${p[1]})`} opacity={dim?0.2:1} style={{transition:"opacity 0.3s"}}>
                  {spotlight===id&&<circle cx="0" cy="0" r="2.5" fill="none" stroke={M.ac} strokeWidth="0.15" opacity="0.5" strokeDasharray="0.6 0.3"/>}
                  <circle cx="0" cy="0" r="1.48" fill="transparent" stroke="rgba(51,51,51,1)" strokeWidth="0.22" opacity={hasBall?1:0}/>
                  <svg x="-4.725" y="-4.725" width="9.45" height="9.45" viewBox="-150 -150 300 300"><text textAnchor="middle" dominantBaseline="central" fill={spotlight===id?"rgba(249,115,22,0.9)":"rgba(51,51,51,1)"} fontWeight="700" fontSize={fs} fontFamily="system-ui,sans-serif" x="0" y="0">{lbl}</text></svg>
                </g>);
              })}

              {/* Marker */}
              {markerInfo&&<g transform={`translate(${markerInfo.tip[0]} ${markerInfo.tip[1]}) rotate(${markerInfo.angle})`} opacity={markerInfo.opacity}>{markerInfo.type==="screen"?<rect x="0" y="-1.2" width="0.4" height="2.4" fill={isPassAction?PC:"rgba(51,51,51,1)"}/>:<polygon points="-1.4 -0.8,0 0,-1.4 0.8,-1.3 0" fill={isPassAction?PC:"rgba(51,51,51,1)"}/>}</g>}

              {/* Ball */}
              <g transform={`translate(${ballPos.x} ${ballPos.y})`}>
                <ellipse cx="0.1" cy="1.2" rx="0.6" ry="0.15" fill="rgba(0,0,0,0.08)"/>
                <g transform={`scale(${bs})`}><circle cx="0" cy="0" r="0.7" fill={BO} stroke={BD} strokeWidth="0.1"/><path d="M-0.7 0 Q-0.2 -0.3 0 0 Q0.2 0.3 0.7 0" fill="none" stroke={BD} strokeWidth="0.06" opacity="0.45"/><line x1="0" y1="-0.7" x2="0" y2="0.7" stroke={BD} strokeWidth="0.06" opacity="0.35"/></g>
                {ballPos.traveling&&<circle cx="0" cy="0" r="1.1" fill="none" stroke={BO} strokeWidth="0.12" opacity="0.25"/>}
              </g>
            </svg>

            {/* Tooltip */}
            {tooltip&&<div style={{position:"absolute",left:Math.min(tooltip.x,(courtRef.current?.offsetWidth||600)-230),top:Math.max(8,tooltip.y-100),width:220,background:M.bg,border:"1px solid "+M.bdS,zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",borderBottom:"1px solid "+M.bd,background:M.bg2}}><span style={{fontSize:9,color:M.td}}>Step detail</span><div onClick={()=>setTooltip(null)} style={{cursor:"pointer",color:M.td}}><X size={10}/></div></div>
              <div style={{padding:"8px"}}><div style={{fontSize:12,fontWeight:800,color:M.tx,marginBottom:3}}>{tooltip.label}</div><div style={{fontSize:11,color:M.ts,lineHeight:1.5}}>{tooltip.desc}</div></div>
            </div>}

            {/* === BRANCH PROMPT OVERLAY === */}
            {showBranchPrompt&&(
              <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,backdropFilter:"blur(2px)"}}>
                <div style={{width:340,background:M.bg,border:"1px solid "+M.bdS,boxShadow:"0 16px 48px rgba(0,0,0,0.6)"}}>
                  <div style={{padding:"14px 16px",borderBottom:"1px solid "+M.bd,display:"flex",alignItems:"center",gap:8}}>
                    <GitBranch size={16} color="#a855f7"/>
                    <span style={{fontSize:15,fontWeight:900,color:M.tx,letterSpacing:"-0.5px"}}>Read the defense</span>
                  </div>
                  <div style={{padding:"10px 16px",fontSize:12,color:M.ts,borderBottom:"1px solid "+M.bd}}>
                    {PLAY.branchPoint.prompt}
                  </div>
                  {PLAY.branchPoint.options.map((opt,i)=>(
                    <div key={i} onClick={()=>chooseBranch(i)}
                      style={{padding:"14px 16px",borderBottom:i===0?"1px solid "+M.bd:"none",cursor:"pointer",transition:"background 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=M.bg2}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontSize:18,color:"#a855f7"}}>{opt.icon}</span>
                        <span style={{fontSize:14,fontWeight:800,color:M.tx}}>{opt.label}</span>
                      </div>
                      <div style={{fontSize:11,color:M.td,paddingLeft:26}}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{height:3,background:M.bg2}}><div style={{height:"100%",background:M.ac,width:`${(actIdx<0?0:prog)*100}%`,transition:prog===0?"none":"width 0.05s linear"}}/></div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px",background:M.bg2,borderTop:"1px solid "+M.bd}}>
            <div style={{display:"flex",gap:2}}>
              {phases.map((_,i)=>(<div key={i} onClick={()=>{if(!isAnim){setTooltip(null);rebuild(i,0);animateAction(i,0,phases[i],null);}}} style={{width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:i===phaseIdx?800:500,border:"1px solid "+(i===phaseIdx?M.ac+"60":M.bd2),background:i===phaseIdx?M.acS:"transparent",color:i===phaseIdx?M.ac:M.td,cursor:"pointer"}}>{i+1}</div>))}
            </div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <span style={{fontSize:9,color:M.tg,display:"flex",alignItems:"center",gap:3}}>
                <svg width="8" height="8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill={BO} stroke={BD} strokeWidth="2"/></svg>
                {PLAY.roster[ball]?.name||ball}
              </span>
              <div style={{height:14,width:1,background:M.bd,margin:"0 4px"}}/>
              <div onClick={prev} style={{cursor:"pointer",color:M.td,opacity:isAnim?0.3:1}}><ChevronLeft size={16}/></div>
              <div onClick={next} style={{cursor:"pointer",color:M.td,opacity:isAnim?0.3:1}}><ChevronRight size={16}/></div>
              <div onClick={reset} style={{cursor:"pointer",color:M.td}}><RotateCcw size={13}/></div>
            </div>
          </div>
        </div>

        {/* COACHING TEXT */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div>
            <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>
              {spotlight?`Player ${spotlight} — Your role`:phase?.label+" — Coaching notes"}
            </div>
            {spotlight&&spotText?(
              <div style={{padding:"10px 12px",borderLeft:"2px solid "+M.ac,background:M.acS}}>
                <div style={{fontSize:9,fontWeight:800,color:M.ac,textTransform:"uppercase",marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
                  <User size={10}/> {PLAY.roster[spotlight]?.name} ({PLAY.roster[spotlight]?.pos})
                </div>
                <p style={{fontSize:13,color:M.tx,lineHeight:1.7,margin:0,fontWeight:500}}>{spotText}</p>
              </div>
            ):(<p style={{fontSize:13,color:M.ts,lineHeight:1.7,margin:0}}>{phase?.text}</p>)}
            {phase?.detail&&!spotlight&&(
              <div style={{marginTop:10,padding:"10px 12px",borderLeft:"2px solid "+M.ac,background:M.acS}}>
                <div style={{fontSize:9,fontWeight:800,color:M.ac,textTransform:"uppercase",marginBottom:3}}>Key detail</div>
                <p style={{fontSize:12,color:M.ts,lineHeight:1.7,margin:0}}>{phase.detail}</p>
              </div>
            )}
          </div>
          <div>
            {showDefense&&phase?.defenseActions?.length>0?(
              <div>
                <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}><span style={{color:"#ef4444"}}>Defense reactions</span></div>
                <div style={{border:"1px solid rgba(239,68,68,0.2)"}}>
                  {phase.defenseActions.map((da,i)=>(<div key={i} style={{padding:"8px 10px",borderBottom:i<phase.defenseActions.length-1?"1px solid "+M.bd:"none",display:"flex",gap:8}}><span style={{fontSize:10,fontWeight:800,color:"#ef4444",width:20}}>{da.id}</span><span style={{fontSize:11,color:M.ts,lineHeight:1.5}}>{da.desc}</span></div>))}
                </div>
              </div>
            ):(
              <div>
                <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Skill requirements</div>
                <div style={{border:"1px solid "+M.bd2}}>
                  {[["Passing",5],["Off-ball",4],["Screening",3],["IQ",4]].map(([s,v],i)=>(<div key={i} style={{display:"flex",alignItems:"center",padding:"6px 10px",borderBottom:i<3?"1px solid "+M.bd:"none"}}><span style={{flex:1,fontSize:11,fontWeight:600,color:M.ts}}>{s}</span><div style={{width:60,height:3,background:"rgba(255,255,255,0.06)",marginRight:8}}><div style={{height:"100%",width:v*10+"%",background:M.ac,opacity:0.8}}/></div><span style={{fontSize:11,fontWeight:900,color:M.tx,width:16,textAlign:"right"}}>{v}</span></div>))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
