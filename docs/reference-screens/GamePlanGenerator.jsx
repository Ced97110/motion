import { useState } from "react";
import { ChevronDown, RefreshCw, Share2, FileText, Zap, Shield, Swords, Target, AlertTriangle, Clock, Users, ChevronRight, Grip, X, Check, Play } from "lucide-react";

const M={bg:"#0a0a0b",bg2:"#111113",bg3:"#19191c",bd:"rgba(255,255,255,0.08)",bd2:"rgba(255,255,255,0.14)",bdS:"rgba(255,255,255,0.22)",tx:"#fafafa",ts:"#a1a1aa",td:"#63636e",tg:"#3e3e45",ac:"#f97316",acS:"rgba(249,115,22,0.1)",gn:"#22c55e",rd:"#ef4444",am:"#eab308",pu:"#a855f7"};

function BallDot({size=7}){return(<svg width={size} height={size} viewBox="0 0 24 24" style={{display:"inline-block",verticalAlign:"baseline",marginLeft:1,marginBottom:-1}}><circle cx="12" cy="12" r="11" fill="#f97316" stroke="#c2610f" strokeWidth="1.5"/><path d="M1 12 Q7 7 12 12 Q17 17 23 12" fill="none" stroke="#c2610f" strokeWidth="0.9" opacity="0.55"/><line x1="12" y1="1" x2="12" y2="23" stroke="#c2610f" strokeWidth="0.9" opacity="0.45"/></svg>);}
function BallButton({children,onClick,style={}}){const[h,setH]=useState(false);return(<button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{position:"relative",overflow:"hidden",padding:"8px 18px",fontFamily:"inherit",fontSize:11,fontWeight:800,border:"none",background:h?"#fb923c":"#f97316",color:"#fff",cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"background 0.15s",...style}}><svg viewBox="0 0 200 50" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}><path d="M-10 25 Q50 8 100 25 Q150 42 210 25" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2"/><line x1="140" y1="-5" x2="140" y2="55" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/></svg><span style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:6}}>{children}</span></button>);}

const GAME={
  opponent:"Lincoln Eagles",date:"Friday, Apr 18",time:"7:00 PM",location:"Home",
  record:"12-4",oppRecord:"9-7",
  scouting:"Lincoln runs pick-and-roll on 68% of half-court possessions. Their point guard (#3 Marcus Reed) goes left 73% of the time and averages 18.4 PPG. Their center (#44) sets high screens but rarely pops — he rolls 85% of the time. Weak perimeter defense: opponents shoot 39% from three against them. They crash the offensive glass hard (3rd in the league) but leak in transition. Their zone (2-3) collapses when you hit the high post.",
  matchups:[
    {us:{num:"1",name:"D'Angelo",pos:"PG",rating:7},them:{num:"3",name:"M. Reed",pos:"PG",rating:8},edge:"them",note:"Reed is their engine. Force him right — his floater goes 28% from the right side."},
    {us:{num:"2",name:"Austin",pos:"SG",rating:6},them:{num:"12",name:"T. Brooks",pos:"SG",rating:5},edge:"us",note:"Austin's length disrupts their kick-out passes. Stay home on Brooks — he's a cutter, not a shooter."},
    {us:{num:"3",name:"Rui",pos:"SF",rating:7},them:{num:"7",name:"J. Willis",pos:"SF",rating:6},edge:"us",note:"Rui's mid-range kills their zone. Willis sags off — punish with the elbow pull-up."},
    {us:{num:"4",name:"AD",pos:"PF",rating:9},them:{num:"22",name:"K. Thomas",pos:"PF",rating:6},edge:"us",note:"Major mismatch. Thomas can't guard AD in the post or on the perimeter. Attack early."},
    {us:{num:"5",name:"LeBron",pos:"C",rating:8},them:{num:"44",name:"D. Carter",pos:"C",rating:7},edge:"us",note:"LeBron's passing from the high post breaks their zone. Carter commits to the roll — hit the open man."},
  ],
  plays:[
    {name:"Lakers Flare Slip",tag:"Ball Screen",why:"Their center rolls 85% — he won't see the slip coming. Creates layup for AD.",fit:95,diff:3},
    {name:"Horns Elbow Pop",tag:"Horns",why:"High post touch from LeBron breaks their 2-3 zone. Kick to corner three.",fit:88,diff:2},
    {name:"Spain PnR",tag:"Ball Screen",why:"Reed goes over screens. Spain action creates a second screen he doesn't expect.",fit:82,diff:4},
    {name:"Floppy Double",tag:"Off-Ball",why:"Lincoln's perimeter D is weak. Double screen frees Austin for catch-and-shoot.",fit:79,diff:2},
    {name:"Zipper into DHO",tag:"Motion",why:"Gets AD the ball in space against Thomas. DHO creates driving lane.",fit:74,diff:3},
  ],
  defense:{
    scheme:"Man-to-man with ICE coverage on PnR",
    why:"Force Reed baseline on ball screens. His left-hand floater from the middle is deadly (54%) but drops to 28% from the right.",
    adjustments:[
      "ICE all ball screens — push Reed right and baseline",
      "Weak-side X — tag the roller, Carter finishes 71% at the rim",
      "Switch 2-4 on cross screens — Brooks and Willis aren't threats",
      "No help off #12 — he's 19% from three, sag and help on Reed drives",
    ]
  },
  situations:[
    {name:"Zone breaker",when:"They go 2-3 (they switch after timeouts)",action:"High post touch to LeBron → skip to corner. Their zone collapses inside."},
    {name:"Transition push",when:"Off any defensive rebound",action:"Outlet to D'Angelo → numbers game. They're 27th in transition D."},
    {name:"Foul trouble",when:"If AD picks up 2 early",action:"Switch to Horns sets — keep AD at the elbow, less contact. Run Floppy for Austin."},
    {name:"End of quarter",when:"Under 8 seconds",action:"Spain PnR with LeBron as screener. Creates two options in one action."},
  ]
};

function MiniCourt({style={}}){
  return(
    <svg viewBox="-28 -3 56 50" style={{display:"block",width:"100%",...style}}>
      <rect x="-28" y="-3" width="56" height="50" fill="rgb(199,172,131)" rx="0"/>
      <rect x="-28" y="-3" width="56" height="50" fill="rgba(235,215,185,0.5)"/>
      <g stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none">
        <line x1="-25" y1="0" x2="25" y2="0"/><line x1="-25" y1="0" x2="-25" y2="47"/><line x1="25" y1="0" x2="25" y2="47"/>
        <path d="M-6 0L-6 19L6 19L6 0"/><path d="M-6 19A6 6 0 0 0 6 19"/>
        <path d="M-21.65 0L-21.65 9.95A22.15 22.15 0 0 0 21.65 9.95L21.65 0"/>
      </g>
      {[[-2,30],[10,6],[-10,6],[18,24],[-18,24]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.2" fill="none" stroke="rgba(51,51,51,0.5)" strokeWidth="0.25"/>
      ))}
      <text x="-2" y="30.5" textAnchor="middle" dominantBaseline="central" fill="rgba(51,51,51,0.5)" fontSize="4" fontWeight="700" fontFamily="system-ui">1</text>
    </svg>
  );
}

function EdgeBadge({edge}){
  const c=edge==="us"?M.gn:edge==="them"?M.rd:M.am;
  const label=edge==="us"?"Advantage":edge==="them"?"Watch":"Even";
  return <span style={{fontSize:9,padding:"1px 5px",border:`1px solid ${c}40`,background:`${c}10`,color:c,fontWeight:600,textTransform:"uppercase"}}>{label}</span>;
}

function FitBar({value}){
  const c=value>=85?M.gn:value>=70?M.ac:M.am;
  return(
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:50,height:3,background:"rgba(255,255,255,0.06)"}}><div style={{height:"100%",width:value+"%",background:c,opacity:0.8}}/></div>
      <span style={{fontSize:10,fontWeight:800,color:c}}>{value}%</span>
    </div>
  );
}

export default function GamePlanGenerator(){
  const [activeSection,setActiveSection]=useState("offense");
  const [expandedPlay,setExpandedPlay]=useState(0);

  return(
    <div style={{minHeight:"100vh",background:M.bg,color:M.ts,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",fontSize:13}}>

      {/* NAV */}
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 20px",borderBottom:"1px solid "+M.bdS,background:M.bg}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:16,fontWeight:800,color:M.tx,letterSpacing:"-0.5px"}}>motion<BallDot size={7}/></div>
          <div style={{height:18,width:1,background:M.bd2}}/>
          <div style={{display:"inline-flex",border:"1px solid "+M.bdS}}>
            {["Playbook","Body","Drills","Game IQ"].map((t,i)=>(
              <div key={i} style={{padding:"4px 12px",fontSize:10,fontWeight:i===3?800:500,borderRight:i<3?"1px solid "+M.bdS:"none",background:i===3?"rgba(168,85,247,0.1)":"transparent",color:i===3?"#a855f7":M.td,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px"}}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{width:28,height:28,border:"1px solid "+M.bdS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:M.tx,fontWeight:800,background:M.bg2}}>CW</div>
      </nav>

      {/* BREADCRUMB */}
      <div style={{padding:"6px 20px",fontSize:10,color:M.tg,borderBottom:"1px solid "+M.bd}}>
        <span style={{color:M.td,cursor:"pointer"}}>Game IQ</span><span style={{margin:"0 6px"}}>›</span><span style={{color:M.ts}}>Game plan</span>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"20px 20px 60px"}}>

        {/* GAME HEADER */}
        <div style={{borderBottom:"1px solid "+M.bdS,paddingBottom:16,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:M.pu,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
                <Zap size={10}/> AI game plan
              </div>
              <h1 style={{fontSize:28,fontWeight:900,color:M.tx,margin:"0 0 6px",letterSpacing:"-1.5px"}}>
                vs {GAME.opponent}
              </h1>
              <div style={{display:"flex",gap:12,fontSize:11,color:M.td}}>
                <span style={{display:"flex",alignItems:"center",gap:3}}><Clock size={10}/> {GAME.date} · {GAME.time}</span>
                <span style={{display:"flex",alignItems:"center",gap:3}}><Target size={10}/> {GAME.location}</span>
                <span>You: <span style={{color:M.gn,fontWeight:700}}>{GAME.record}</span></span>
                <span>Them: <span style={{color:M.rd,fontWeight:700}}>{GAME.oppRecord}</span></span>
              </div>
            </div>
            <div style={{display:"flex",gap:6}}>
              <div style={{padding:"6px 12px",border:"1px solid "+M.bd2,fontSize:10,fontWeight:600,color:M.td,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><RefreshCw size={10}/> Regenerate</div>
              <div style={{padding:"6px 12px",border:"1px solid "+M.bd2,fontSize:10,fontWeight:600,color:M.td,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Share2 size={10}/> Share</div>
              <div style={{padding:"6px 12px",border:"1px solid "+M.bd2,fontSize:10,fontWeight:600,color:M.td,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><FileText size={10}/> PDF</div>
            </div>
          </div>
        </div>

        {/* SECTION TABS */}
        <div style={{display:"flex",gap:0,marginBottom:20,border:"1px solid "+M.bdS}}>
          {[{id:"offense",label:"Offense",icon:Swords},{id:"defense",label:"Defense",icon:Shield},{id:"matchups",label:"Matchups",icon:Users},{id:"situations",label:"Situations",icon:AlertTriangle}].map(({id,label,icon:Icon})=>(
            <div key={id} onClick={()=>setActiveSection(id)} style={{flex:1,padding:"10px 16px",fontSize:11,fontWeight:activeSection===id?800:500,color:activeSection===id?M.ac:M.td,background:activeSection===id?M.acS:"transparent",borderRight:"1px solid "+M.bdS,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px",display:"flex",alignItems:"center",justifyContent:"center",gap:5,borderBottom:activeSection===id?"2px solid "+M.ac:"2px solid transparent"}}>
              <Icon size={12}/>{label}
            </div>
          ))}
        </div>

        {/* === OFFENSE SECTION === */}
        {activeSection==="offense"&&(
          <div>
            {/* SCOUTING INTEL */}
            <div style={{marginBottom:20,padding:"12px 16px",borderLeft:"2px solid "+M.pu,background:"rgba(168,85,247,0.04)"}}>
              <div style={{fontSize:9,fontWeight:800,color:M.pu,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4,display:"flex",alignItems:"center",gap:4}}><Zap size={9}/> AI scouting intel</div>
              <p style={{fontSize:13,color:M.ts,lineHeight:1.7,margin:0}}>{GAME.scouting}</p>
            </div>

            {/* RECOMMENDED PLAYS */}
            <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
              Recommended plays · {GAME.plays.length} selected
            </div>

            {GAME.plays.map((play,i)=>(
              <div key={i} style={{border:"1px solid "+(expandedPlay===i?M.ac+"40":M.bd2),marginBottom:8,background:expandedPlay===i?M.acS:"transparent",cursor:"pointer"}} onClick={()=>setExpandedPlay(expandedPlay===i?-1:i)}>
                <div style={{display:"flex",alignItems:"center",padding:"10px 14px",gap:12}}>
                  <div style={{width:20,textAlign:"center"}}>
                    <Grip size={12} color={M.tg}/>
                  </div>
                  <div style={{width:52,height:36,border:"1px solid "+M.bd2,flexShrink:0,overflow:"hidden"}}>
                    <MiniCourt/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                      <span style={{fontSize:14,fontWeight:800,color:M.tx}}>{play.name}</span>
                      <span style={{fontSize:9,padding:"1px 5px",border:"1px solid "+M.ac+"40",background:M.acS,color:M.ac,fontWeight:600}}>{play.tag}</span>
                    </div>
                    <div style={{fontSize:11,color:M.td}}>{play.why}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <FitBar value={play.fit}/>
                    <div style={{fontSize:9,color:M.tg,marginTop:2}}>{"★".repeat(play.diff)}{"☆".repeat(5-play.diff)} difficulty</div>
                  </div>
                  <ChevronDown size={14} color={M.td} style={{transform:expandedPlay===i?"rotate(180deg)":"rotate(0)",transition:"transform 0.15s"}}/>
                </div>

                {expandedPlay===i&&(
                  <div style={{borderTop:"1px solid "+M.bd,padding:"12px 14px 12px 46px",display:"grid",gridTemplateColumns:"120px 1fr",gap:12}}>
                    <div style={{border:"1px solid "+M.bd2,overflow:"hidden"}}>
                      <MiniCourt style={{background:"rgb(199,172,131)"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:M.ts,lineHeight:1.7,marginBottom:8}}>
                        {play.why} This play exploits their defensive tendencies and matches your team's strengths.
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <BallButton onClick={(e)=>{e.stopPropagation();}} style={{padding:"5px 12px",fontSize:10}}><Play size={9}/> Open viewer</BallButton>
                        <div onClick={(e)=>e.stopPropagation()} style={{padding:"5px 12px",border:"1px solid "+M.bd2,fontSize:10,fontWeight:600,color:M.td,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
                          <X size={9}/> Remove
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div style={{padding:"10px 14px",border:"1px dashed "+M.bd2,textAlign:"center",fontSize:11,color:M.td,cursor:"pointer",marginTop:4}}>
              + Add play from library
            </div>
          </div>
        )}

        {/* === DEFENSE SECTION === */}
        {activeSection==="defense"&&(
          <div>
            <div style={{marginBottom:16,padding:"14px 16px",border:"1px solid "+M.bdS}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                <Shield size={14} color={M.gn}/>
                <span style={{fontSize:16,fontWeight:900,color:M.tx,letterSpacing:"-0.5px"}}>{GAME.defense.scheme}</span>
              </div>
              <p style={{fontSize:13,color:M.ts,lineHeight:1.7,margin:0}}>{GAME.defense.why}</p>
            </div>

            <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
              Key adjustments
            </div>

            {GAME.defense.adjustments.map((adj,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"10px 14px",borderBottom:"1px solid "+M.bd,alignItems:"flex-start"}}>
                <div style={{width:20,height:20,border:"1px solid "+M.gn+"40",background:M.gn+"10",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                  <Check size={10} color={M.gn}/>
                </div>
                <div style={{fontSize:13,color:M.ts,lineHeight:1.6}}>{adj}</div>
              </div>
            ))}

            <div style={{marginTop:20,padding:"12px 16px",borderLeft:"2px solid "+M.rd,background:M.rd+"08"}}>
              <div style={{fontSize:9,fontWeight:800,color:M.rd,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>Danger zone</div>
              <p style={{fontSize:12,color:M.ts,lineHeight:1.6,margin:0}}>
                Their #3 Marcus Reed averages 18.4 PPG and goes left 73% of the time. If he gets to his left-hand floater from the middle of the lane, it's 54% — nearly automatic. ICE coverage forces him right where he drops to 28%. This is the game.
              </p>
            </div>
          </div>
        )}

        {/* === MATCHUPS SECTION === */}
        {activeSection==="matchups"&&(
          <div>
            <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
              Defensive assignments
            </div>

            {GAME.matchups.map((m,i)=>(
              <div key={i} style={{border:"1px solid "+M.bd2,marginBottom:8,padding:"12px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  {/* US */}
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,border:"1px solid "+M.bdS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:M.tx}}>{m.us.num}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,color:M.tx}}>{m.us.name}</div>
                      <div style={{fontSize:10,color:M.td}}>{m.us.pos} · Rating {m.us.rating}/10</div>
                    </div>
                  </div>

                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <span style={{fontSize:9,fontWeight:800,color:M.tg,textTransform:"uppercase"}}>Guards</span>
                    <EdgeBadge edge={m.edge}/>
                  </div>

                  {/* THEM */}
                  <div style={{display:"flex",alignItems:"center",gap:10,flexDirection:"row-reverse"}}>
                    <div style={{width:32,height:32,border:"1px solid "+M.rd+"40",background:M.rd+"08",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:M.rd}}>{m.them.num}</div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:800,color:M.tx}}>{m.them.name}</div>
                      <div style={{fontSize:10,color:M.td}}>{m.them.pos} · Rating {m.them.rating}/10</div>
                    </div>
                  </div>
                </div>

                <div style={{fontSize:11,color:M.ts,lineHeight:1.5,padding:"8px 10px",background:M.bg2,borderLeft:"2px solid "+(m.edge==="us"?M.gn:m.edge==="them"?M.rd:M.am)}}>
                  {m.note}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* === SITUATIONS SECTION === */}
        {activeSection==="situations"&&(
          <div>
            <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>
              Special situations · {GAME.situations.length} prepared
            </div>

            {GAME.situations.map((s,i)=>(
              <div key={i} style={{border:"1px solid "+M.bd2,marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderBottom:"1px solid "+M.bd}}>
                  <AlertTriangle size={12} color={M.am}/>
                  <span style={{fontSize:14,fontWeight:800,color:M.tx}}>{s.name}</span>
                </div>
                <div style={{padding:"10px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:9,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>When</div>
                    <div style={{fontSize:12,color:M.ts,lineHeight:1.6}}>{s.when}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>Action</div>
                    <div style={{fontSize:12,color:M.tx,fontWeight:600,lineHeight:1.6}}>{s.action}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        <div style={{marginTop:32,display:"flex",gap:8,justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderTop:"1px solid "+M.bdS}}>
          <div style={{fontSize:11,color:M.tg}}>
            <Zap size={10} style={{verticalAlign:"-1px",marginRight:4}} color={M.pu}/>
            Generated from your roster + Lincoln's last 5 games · <span style={{color:M.pu,cursor:"pointer"}}>View sources</span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <div style={{padding:"8px 16px",border:"1px solid "+M.bd2,fontSize:11,fontWeight:600,color:M.ts,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              <Users size={11}/> Share with team
            </div>
            <BallButton style={{padding:"8px 20px"}}>
              <Play size={11}/> Start game day mode
            </BallButton>
          </div>
        </div>
      </div>
    </div>
  );
}
