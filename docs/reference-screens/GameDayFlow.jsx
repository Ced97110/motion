import { useState, useEffect } from "react";
import { Clock, Shield, Swords, Zap, AlertTriangle, ChevronRight, Check, Play, Timer, Users, Activity, Wifi, WifiOff, UserPlus, Undo2, ArrowLeftRight, X } from "lucide-react";

const M={bg:"#0a0a0b",bg2:"#111113",bg3:"#19191c",bd:"rgba(255,255,255,0.08)",bd2:"rgba(255,255,255,0.14)",bdS:"rgba(255,255,255,0.22)",tx:"#fafafa",ts:"#a1a1aa",td:"#63636e",tg:"#3e3e45",ac:"#f97316",acS:"rgba(249,115,22,0.1)",gn:"#22c55e",rd:"#ef4444",am:"#eab308",pu:"#a855f7"};

function BallDot({size=7}){return(<svg width={size} height={size} viewBox="0 0 24 24" style={{display:"inline-block",verticalAlign:"baseline",marginLeft:1,marginBottom:-1}}><circle cx="12" cy="12" r="11" fill="#f97316" stroke="#c2610f" strokeWidth="1.5"/><path d="M1 12 Q7 7 12 12 Q17 17 23 12" fill="none" stroke="#c2610f" strokeWidth="0.9" opacity="0.55"/><line x1="12" y1="1" x2="12" y2="23" stroke="#c2610f" strokeWidth="0.9" opacity="0.45"/></svg>);}

const GAME={opponent:"Lincoln Eagles",score:{us:28,them:31},quarter:"Halftime",
  plan:{scheme:"Man with ICE on PnR",plays:["Lakers Flare Slip","Horns Elbow Pop","Spain PnR","Floppy Double"]},
};

const CHIP_DATA={
  offense:[
    {id:"pnr_working",label:"Our PnR is working"},{id:"3pt_cold",label:"Cold from three"},
    {id:"post_mismatch",label:"Post mismatch"},{id:"transition_open",label:"Transition is open"},
    {id:"turnovers",label:"Too many turnovers"},{id:"fts_missing",label:"Missing free throws"},
  ],
  defense:[
    {id:"their_3_hot",label:"Their 3 is hot"},{id:"key_player_hot",label:"Reed getting left"},
    {id:"boards_losing",label:"Losing the boards"},{id:"foul_trouble",label:"Foul trouble"},
    {id:"our_d_working",label:"Our D is working"},{id:"fast_break_leak",label:"Leaking fast breaks"},
  ],
  situational:[
    {id:"timeout_play",label:"Need a timeout play"},{id:"end_quarter",label:"End of quarter set"},
    {id:"press_break",label:"They're pressing"},{id:"stall",label:"Need to run clock"},
  ]
};

const AI_ADJ=[
  {type:"offense",priority:"high",text:"Switch to Horns Elbow Pop. You're 1-7 from three — attack mid-range. Rui's elbow pull-up is 3-4.",color:M.ac},
  {type:"defense",priority:"high",text:"Double Reed on left-side PnR. He's 5-6 from the left floater. Trap and rotate — give up the corner three, #12 is 0-3.",color:M.gn},
  {type:"situational",priority:"medium",text:"Attack AD in the post. Thomas has 3 fouls — be aggressive, draw the 4th.",color:M.am},
];

const FALLBACK_ADJ=[
  {type:"offline",text:"If their 3 is hot → switch to 2-3 zone for 2-3 possessions, then switch back.",color:M.td},
  {type:"offline",text:"If foul trouble → sub pattern: rotate AD with Jackson, keep LeBron in.",color:M.td},
  {type:"offline",text:"If turnovers → slow pace, run half-court sets only. No transition pushing.",color:M.td},
];

const LIVE_EXPLOITS=[
  {text:"Thomas has 4 fouls — attack the post NOW",urgency:"critical",time:"3:42 Q3"},
  {text:"You're 2-14 from three — drive and kick to mid-range",urgency:"warning",time:"5:10 Q3"},
  {text:"Their #12 is 0-4 — sag off, help on Reed",urgency:"info",time:"6:20 Q3"},
];

const BOX=[
  {num:"1",name:"D'Angelo",min:16,pts:8,reb:1,ast:4,to:2,fgm:3,fga:7,tpm:1,tpa:4,fls:1},
  {num:"2",name:"Austin",min:16,pts:3,reb:2,ast:0,to:1,fgm:1,fga:5,tpm:0,tpa:3,fls:2},
  {num:"3",name:"Rui",min:14,pts:9,reb:3,ast:1,to:0,fgm:4,fga:6,tpm:0,tpa:0,fls:1},
  {num:"4",name:"AD",min:16,pts:6,reb:5,ast:0,to:1,fgm:2,fga:4,tpm:0,tpa:0,fls:2},
  {num:"5",name:"LeBron",min:16,pts:2,reb:4,ast:3,to:1,fgm:1,fga:3,tpm:0,tpa:0,fls:0},
];

export default function GameDayFlowV2(){
  const [phase,setPhase]=useState("halftime");
  const [selected,setSelected]=useState(new Set());
  const [showAdj,setShowAdj]=useState(false);
  const [isOffline,setIsOffline]=useState(false);
  const [hasGamePlan,setHasGamePlan]=useState(true);
  const [showScoreInput,setShowScoreInput]=useState(false);
  const [showTrackerInvite,setShowTrackerInvite]=useState(false);
  const [showQuickPlay,setShowQuickPlay]=useState(false);
  const [customChip,setCustomChip]=useState("");
  const [showCustomInput,setShowCustomInput]=useState(null);
  const [gameTime,setGameTime]=useState("00:00");

  useEffect(()=>{const t=setInterval(()=>{setGameTime(new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));},1000);return()=>clearInterval(t);},[]);

  const toggle=(id)=>{setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});setShowAdj(false);};
  const selectedCount=selected.size;

  return(
    <div style={{minHeight:"100vh",background:M.bg,color:M.ts,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",fontSize:13}}>

      {/* GAME BAR */}
      <div style={{background:M.bg2,borderBottom:"1px solid "+M.bdS,padding:"0 20px"}}>
        <div style={{maxWidth:960,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",height:48}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontSize:14,fontWeight:800,color:M.tx,letterSpacing:"-0.5px"}}>motion<BallDot size={6}/></div>
            <div style={{height:18,width:1,background:M.bd2}}/>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,background:M.rd,borderRadius:"50%",animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:11,fontWeight:700,color:M.rd,textTransform:"uppercase"}}>Live</span>
            </div>
            {isOffline&&<div style={{display:"flex",alignItems:"center",gap:3,padding:"2px 6px",background:M.am+"15",border:"1px solid "+M.am+"30"}}><WifiOff size={10} color={M.am}/><span style={{fontSize:9,color:M.am,fontWeight:600}}>Offline</span></div>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{textAlign:"right"}}><div style={{fontSize:9,color:M.td,textTransform:"uppercase",fontWeight:600}}>You</div><div style={{fontSize:24,fontWeight:900,color:M.tx}}>{GAME.score.us}</div></div>
            <div style={{fontSize:11,color:M.tg,fontWeight:600,padding:"4px 8px",border:"1px solid "+M.bd2}}>{GAME.quarter}</div>
            <div style={{textAlign:"left"}}><div style={{fontSize:9,color:M.td,textTransform:"uppercase",fontWeight:600}}>Lincoln</div><div style={{fontSize:24,fontWeight:900,color:M.rd}}>{GAME.score.them}</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:M.td}}><Clock size={11} style={{verticalAlign:"-1px",marginRight:3}}/>{gameTime}</span>
            <div onClick={()=>setIsOffline(!isOffline)} style={{cursor:"pointer",padding:"3px 6px",border:"1px solid "+M.bd2,fontSize:9,color:M.td}}>{isOffline?<Wifi size={10}/>:<WifiOff size={10}/>}</div>
          </div>
        </div>
      </div>

      {/* PHASE TABS */}
      <div style={{maxWidth:960,margin:"0 auto",padding:"12px 20px 0"}}>
        <div style={{display:"flex",gap:0,border:"1px solid "+M.bdS}}>
          {[{id:"pregame",label:"Pre-game",sub:"Review plan"},{id:"halftime",label:"Halftime",sub:"Quick adjust"},{id:"live",label:"Live",sub:"Stat exploits"}].map(({id,label,sub})=>(
            <div key={id} onClick={()=>setPhase(id)} style={{flex:1,padding:"14px 16px",textAlign:"center",cursor:"pointer",background:phase===id?M.acS:"transparent",borderBottom:phase===id?"2px solid "+M.ac:"2px solid transparent",borderRight:"1px solid "+M.bdS}}>
              <div style={{fontSize:14,fontWeight:phase===id?900:500,color:phase===id?M.ac:M.td,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
              <div style={{fontSize:10,color:phase===id?M.ac:M.tg,marginTop:2}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"16px 20px 60px"}}>

        {/* ═══ PRE-GAME ═══ */}
        {phase==="pregame"&&(
          <div>
            {/* EDGE CASE E1: No game plan */}
            {!hasGamePlan?(
              <div>
                <div style={{textAlign:"center",padding:"32px 0 20px"}}>
                  <Zap size={24} color={M.pu} style={{marginBottom:8}}/>
                  <div style={{fontSize:18,fontWeight:900,color:M.tx,marginBottom:4}}>No game plan yet</div>
                  <div style={{fontSize:13,color:M.td}}>Generate one in 90 seconds</div>
                </div>
                <div style={{border:"1px solid "+M.bdS,padding:"16px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:M.ts,marginBottom:8}}>Who are you playing tonight?</div>
                  <div style={{display:"flex",gap:8}}>
                    <input placeholder="Opponent name..." style={{flex:1,padding:"10px 12px",background:M.bg,border:"1px solid "+M.bd2,color:M.tx,fontSize:14,fontFamily:"inherit",outline:"none"}}/>
                    <button onClick={()=>setHasGamePlan(true)} style={{padding:"10px 20px",background:M.ac,border:"none",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",textTransform:"uppercase"}}>Quick plan</button>
                  </div>
                  <div style={{marginTop:8,fontSize:11,color:M.tg}}>Or <span onClick={()=>setHasGamePlan(true)} style={{color:M.ac,cursor:"pointer"}}>skip — generate from your team strengths</span></div>
                </div>
                <div style={{marginTop:12,textAlign:"center"}}>
                  <span onClick={()=>setHasGamePlan(true)} style={{fontSize:11,color:M.td,cursor:"pointer"}}>Demo: show sample game plan →</span>
                </div>
              </div>
            ):(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px"}}>Tonight's game plan · vs {GAME.opponent}</div>
                  {/* EDGE CASE P1: Edit lineup */}
                  <div style={{display:"flex",gap:6}}>
                    <div style={{padding:"4px 10px",border:"1px solid "+M.bd2,fontSize:10,fontWeight:600,color:M.td,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}><ArrowLeftRight size={9}/> Edit lineup</div>
                  </div>
                </div>
                <div style={{border:"1px solid "+M.bdS,marginBottom:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} title="Tap to change scheme">
                  <div><div style={{fontSize:9,fontWeight:700,color:M.tg,textTransform:"uppercase",marginBottom:2}}>Defensive scheme</div><div style={{fontSize:16,fontWeight:900,color:M.tx}}>{GAME.plan.scheme}</div></div>
                  <Shield size={20} color={M.gn}/>
                </div>

                <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Plays to run</div>
                {GAME.plan.plays.map((play,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"1px solid "+M.bd}}>
                    <div style={{width:24,height:24,border:"1px solid "+M.ac+"40",background:M.acS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:M.ac}}>{i+1}</div>
                    <div style={{flex:1,fontSize:14,fontWeight:700,color:M.tx}}>{play}</div>
                    <ChevronRight size={14} color={M.td}/>
                  </div>
                ))}

                <div style={{marginTop:16,padding:"12px 16px",borderLeft:"2px solid "+M.pu,background:M.pu+"08"}}>
                  <div style={{fontSize:9,fontWeight:800,color:M.pu,textTransform:"uppercase",marginBottom:4}}>Key matchup</div>
                  <p style={{fontSize:13,color:M.ts,lineHeight:1.6,margin:0}}>Force Reed right on every ball screen. His left floater is 54% — his right is 28%. ICE everything.</p>
                </div>

                {/* EDGE CASE P2: Add pre-game note */}
                <div style={{marginTop:12,padding:"10px 14px",border:"1px dashed "+M.bd2,display:"flex",alignItems:"center",gap:8,cursor:"pointer",color:M.td,fontSize:11}}>
                  + Add warmup observation
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ HALFTIME ═══ */}
        {phase==="halftime"&&(
          <div>
            {/* EDGE CASE H8: Quick play shortcut for timeouts */}
            {!showQuickPlay?(
              <div onClick={()=>setShowQuickPlay(true)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"8px",border:"1px solid "+M.ac+"40",background:M.acS,marginBottom:14,cursor:"pointer",fontSize:11,fontWeight:700,color:M.ac}}>
                <Play size={12}/> Quick play — timeout? Tap for a play call
              </div>
            ):(
              <div style={{border:"1px solid "+M.ac+"40",background:M.acS,marginBottom:14,padding:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:800,color:M.ac,textTransform:"uppercase"}}>Quick play call</span>
                  <X size={12} color={M.td} style={{cursor:"pointer"}} onClick={()=>setShowQuickPlay(false)}/>
                </div>
                {GAME.plan.plays.slice(0,3).map((p,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderBottom:"1px solid "+M.bd,cursor:"pointer"}} onClick={()=>setShowQuickPlay(false)}>
                    <div style={{width:20,height:20,border:"1px solid "+M.ac,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:M.ac}}>{i+1}</div>
                    <span style={{fontSize:14,fontWeight:700,color:M.tx}}>{p}</span>
                    <ChevronRight size={12} color={M.td} style={{marginLeft:"auto"}}/>
                  </div>
                ))}
              </div>
            )}

            {/* EDGE CASE E5: Quick score input */}
            <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:14}}>
              <div onClick={()=>setShowScoreInput(!showScoreInput)} style={{padding:"6px 14px",border:"1px solid "+M.bd2,fontSize:10,fontWeight:600,color:M.td,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                <Activity size={10}/> Update score
              </div>
            </div>

            {showScoreInput&&(
              <div style={{border:"1px solid "+M.bdS,padding:"14px",marginBottom:14,display:"flex",gap:16,justifyContent:"center",alignItems:"center"}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:9,color:M.td,textTransform:"uppercase",fontWeight:600,marginBottom:4}}>You</div>
                  <input type="number" defaultValue={GAME.score.us} style={{width:60,padding:"8px",fontSize:24,fontWeight:900,textAlign:"center",background:M.bg,border:"1px solid "+M.bd2,color:M.tx,fontFamily:"inherit"}}/>
                </div>
                <div style={{fontSize:16,color:M.tg,fontWeight:600}}>—</div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:9,color:M.td,textTransform:"uppercase",fontWeight:600,marginBottom:4}}>Them</div>
                  <input type="number" defaultValue={GAME.score.them} style={{width:60,padding:"8px",fontSize:24,fontWeight:900,textAlign:"center",background:M.bg,border:"1px solid "+M.bd2,color:M.tx,fontFamily:"inherit"}}/>
                </div>
                <button onClick={()=>setShowScoreInput(false)} style={{padding:"8px 16px",background:M.ac,border:"none",color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer"}}>Save</button>
              </div>
            )}

            <div style={{textAlign:"center",marginBottom:14}}>
              <div style={{fontSize:9,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:3}}>
                Tap what you're seeing · {selectedCount} selected
              </div>
              <div style={{fontSize:11,color:M.td}}>
                {selectedCount===0?"Select observations or generate from stats alone":selectedCount<3?"Add more for better adjustments":"Ready to generate"}
              </div>
            </div>

            {/* CHIPS — offense */}
            {[
              {key:"offense",label:"Offense",icon:Swords,color:M.ac},
              {key:"defense",label:"Defense",icon:Shield,color:M.gn},
              {key:"situational",label:"Situational",icon:AlertTriangle,color:M.am},
            ].map(({key,label,icon:Icon,color})=>(
              <div key={key} style={{marginBottom:14}}>
                <div style={{fontSize:9,fontWeight:700,color,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6,display:"flex",alignItems:"center",gap:4}}><Icon size={10}/> {label}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {CHIP_DATA[key].map(c=>(
                    <div key={c.id} onClick={()=>toggle(c.id)} style={{padding:"10px 16px",border:"1px solid "+(selected.has(c.id)?color:M.bd2),background:selected.has(c.id)?color+"12":"transparent",color:selected.has(c.id)?color:M.ts,fontSize:13,fontWeight:selected.has(c.id)?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:6,userSelect:"none",transition:"all 0.1s"}}>
                      {selected.has(c.id)&&<Check size={12}/>}{c.label}
                    </div>
                  ))}
                  {/* EDGE CASE H4: Custom chip */}
                  {showCustomInput===key?(
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <input value={customChip} onChange={e=>setCustomChip(e.target.value)} placeholder="Other..." maxLength={50} autoFocus style={{padding:"10px 12px",border:"1px solid "+color,background:"transparent",color:M.tx,fontSize:13,fontFamily:"inherit",outline:"none",width:160}}/>
                      <button onClick={()=>{if(customChip.trim()){toggle("custom_"+key);setShowCustomInput(null);}}} style={{padding:"10px 12px",background:color,border:"none",color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer"}}>Add</button>
                    </div>
                  ):(
                    <div onClick={()=>setShowCustomInput(key)} style={{padding:"10px 16px",border:"1px dashed "+M.bd2,color:M.td,fontSize:13,cursor:"pointer"}}>+ Other</div>
                  )}
                </div>
              </div>
            ))}

            {/* GENERATE BUTTON — EDGE CASE H2: always available */}
            {!showAdj&&(
              <div style={{textAlign:"center",marginTop:4}}>
                <button onClick={()=>setShowAdj(true)} style={{padding:"14px 32px",background:M.ac,border:"none",color:"#fff",fontSize:15,fontWeight:900,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px",position:"relative",overflow:"hidden",opacity:1}}>
                  <svg viewBox="0 0 200 50" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}><path d="M-10 25 Q50 8 100 25 Q150 42 210 25" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2"/></svg>
                  <span style={{position:"relative",display:"flex",alignItems:"center",gap:6}}>
                    <Zap size={14}/> {selectedCount===0?"Generate from stats":"Generate adjustments"}
                  </span>
                </button>
                {selectedCount===0&&<div style={{fontSize:10,color:M.tg,marginTop:6}}>AI will analyze the box score — no observations needed</div>}
              </div>
            )}

            {/* AI ADJUSTMENTS */}
            {showAdj&&(
              <div style={{marginTop:4}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:9,fontWeight:700,color:isOffline?M.am:M.pu,textTransform:"uppercase",letterSpacing:"1px",display:"flex",alignItems:"center",gap:4}}>
                    {isOffline?<><WifiOff size={10}/> Quick adjustments (offline)</>:<><Zap size={10}/> AI halftime adjustments</>}
                  </div>
                  <div onClick={()=>setShowAdj(false)} style={{fontSize:10,color:M.td,cursor:"pointer"}}>Update ↻</div>
                </div>

                {/* EDGE CASE H5: Show fallback if offline, AI if online */}
                {(isOffline?FALLBACK_ADJ:AI_ADJ).map((adj,i)=>{
                  const Icon=adj.type==="offense"?Swords:adj.type==="defense"?Shield:AlertTriangle;
                  return(
                    <div key={i} style={{border:"1px solid "+adj.color+"30",marginBottom:8,padding:"14px 16px",borderLeft:"3px solid "+adj.color}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <Icon size={14} color={adj.color}/>
                        <span style={{fontSize:10,fontWeight:800,color:adj.color,textTransform:"uppercase"}}>{adj.type}</span>
                        {adj.priority==="high"&&<span style={{fontSize:9,padding:"1px 5px",background:M.rd+"15",border:"1px solid "+M.rd+"30",color:M.rd,fontWeight:600}}>Priority</span>}
                        {isOffline&&<span style={{fontSize:9,padding:"1px 5px",background:M.am+"15",border:"1px solid "+M.am+"30",color:M.am,fontWeight:600}}>Cached</span>}
                      </div>
                      <p style={{fontSize:15,color:M.tx,lineHeight:1.6,margin:0,fontWeight:500}}>{adj.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ LIVE ═══ */}
        {phase==="live"&&(
          <div>
            {/* EDGE CASE L1: Invite stat tracker */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              <div onClick={()=>setShowTrackerInvite(!showTrackerInvite)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",border:"1px solid "+M.pu+"40",background:M.pu+"08",color:M.pu,fontSize:10,fontWeight:600,cursor:"pointer"}}>
                <UserPlus size={10}/> Invite stat tracker
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",border:"1px solid "+M.bd2,color:M.td,fontSize:10,fontWeight:600,cursor:"pointer"}}>
                <ArrowLeftRight size={10}/> Substitution
              </div>
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",border:"1px solid "+M.bd2,color:M.td,fontSize:10,fontWeight:600,cursor:"pointer"}}>
                <Undo2 size={10}/> Undo last
              </div>
            </div>

            {showTrackerInvite&&(
              <div style={{border:"1px solid "+M.pu+"40",background:M.pu+"08",padding:"14px 16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:800,color:M.tx}}>Invite a stat tracker</div>
                  <X size={12} color={M.td} style={{cursor:"pointer"}} onClick={()=>setShowTrackerInvite(false)}/>
                </div>
                <p style={{fontSize:12,color:M.ts,lineHeight:1.5,margin:"0 0 10px"}}>An assistant coach, parent, or team manager can track stats on their phone. You see the exploits — they tap the numbers.</p>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,padding:"10px 14px",background:M.bg,border:"1px solid "+M.bd2,fontSize:18,fontWeight:900,color:M.pu,textAlign:"center",letterSpacing:"4px",fontFamily:"monospace"}}>MOTION-7284</div>
                  <button style={{padding:"10px 14px",background:M.pu,border:"none",color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer"}}>Copy</button>
                </div>
                <div style={{fontSize:10,color:M.td,marginTop:6}}>They open motion.app/join and enter this code</div>
              </div>
            )}

            {/* LIVE EXPLOITS */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>AI exploits · updating live</div>
              {LIVE_EXPLOITS.map((e,i)=>{
                const c=e.urgency==="critical"?M.rd:e.urgency==="warning"?M.am:M.pu;
                return(
                  <div key={i} style={{border:"1px solid "+c+"30",borderLeft:"3px solid "+c,marginBottom:6,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:14,fontWeight:700,color:M.tx}}>{e.text}</div>
                    <div style={{fontSize:10,color:M.td,flexShrink:0,marginLeft:12}}>{e.time}</div>
                  </div>
                );
              })}
            </div>

            {/* BOX SCORE */}
            <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Box score</div>
            <div style={{border:"1px solid "+M.bd2,overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:500}}>
                <thead><tr style={{background:M.bg2}}>
                  {["#","Name","Min","Pts","Reb","Ast","TO","FG","3PT","Fls"].map(h=>(
                    <th key={h} style={{padding:"6px",textAlign:h==="#"||h==="Name"?"left":"center",fontWeight:600,color:M.td,fontSize:9,textTransform:"uppercase",borderBottom:"1px solid "+M.bd}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{BOX.map((p,i)=>(
                  <tr key={i} style={{borderBottom:"1px solid "+M.bd}}>
                    <td style={{padding:"6px",fontWeight:800,color:M.tx}}>{p.num}</td>
                    <td style={{padding:"6px",fontWeight:600,color:M.ts}}>{p.name}</td>
                    <td style={{padding:"6px",textAlign:"center",color:M.td}}>{p.min}</td>
                    <td style={{padding:"6px",textAlign:"center",fontWeight:800,color:M.tx}}>{p.pts}</td>
                    <td style={{padding:"6px",textAlign:"center",color:M.ts}}>{p.reb}</td>
                    <td style={{padding:"6px",textAlign:"center",color:M.ts}}>{p.ast}</td>
                    <td style={{padding:"6px",textAlign:"center",color:p.to>=2?M.rd:M.ts}}>{p.to}</td>
                    <td style={{padding:"6px",textAlign:"center",color:M.ts}}>{p.fgm}-{p.fga}</td>
                    <td style={{padding:"6px",textAlign:"center",color:p.tpa>0&&p.tpm===0?M.rd:M.ts}}>{p.tpm}-{p.tpa}</td>
                    <td style={{padding:"6px",textAlign:"center",color:p.fls>=3?M.am:M.td}}>{p.fls}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            {/* TEAM STATS */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12}}>
              {[
                {label:"FG%",value:Math.round(BOX.reduce((s,p)=>s+p.fgm,0)/BOX.reduce((s,p)=>s+p.fga,0)*100),good:45},
                {label:"3PT%",value:Math.round(BOX.reduce((s,p)=>s+p.tpm,0)/Math.max(1,BOX.reduce((s,p)=>s+p.tpa,0))*100),good:33},
                {label:"Assists",value:BOX.reduce((s,p)=>s+p.ast,0),good:8},
                {label:"Turnovers",value:BOX.reduce((s,p)=>s+p.to,0),good:null,bad:true},
              ].map((s,i)=>{
                const isGood=s.bad?false:s.value>=s.good;
                return(
                  <div key={i} style={{border:"1px solid "+M.bd2,padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:M.tg,textTransform:"uppercase",fontWeight:600,marginBottom:4}}>{s.label}</div>
                    <div style={{fontSize:22,fontWeight:900,color:s.bad?M.rd:isGood?M.gn:M.am}}>{s.value}{s.good!==null&&!s.bad?"%":""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
