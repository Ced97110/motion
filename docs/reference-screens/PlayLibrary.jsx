import { useState } from "react";
import { Search, ChevronDown, Star, Users, Grid3X3, List, Play, Sparkles } from "lucide-react";

const M = {
  bg: "#0a0a0b", bg2: "#111113", bg3: "#19191c",
  bd: "rgba(255,255,255,0.08)", bd2: "rgba(255,255,255,0.14)", bdStrong: "rgba(255,255,255,0.22)",
  tx: "#fafafa", ts: "#a1a1aa", td: "#63636e", tg: "#3e3e45",
  ac: "#f97316", acSoft: "rgba(249,115,22,0.1)", acMed: "rgba(249,115,22,0.15)",
  gn: "#22c55e", rd: "#ef4444", am: "#eab308",
};

function BallDot({size=7}) {
  return(
    <svg width={size} height={size} viewBox="0 0 24 24" style={{display:"inline-block",verticalAlign:"baseline",marginLeft:1,marginBottom:size>6?-1:0}}>
      <circle cx="12" cy="12" r="11" fill="#f97316" stroke="#c2610f" strokeWidth="1.5"/>
      <path d="M1 12 Q7 7 12 12 Q17 17 23 12" fill="none" stroke="#c2610f" strokeWidth="0.9" opacity="0.55"/>
      <line x1="12" y1="1" x2="12" y2="23" stroke="#c2610f" strokeWidth="0.9" opacity="0.45"/>
      <path d="M4.5 4 Q12 8 19.5 4" fill="none" stroke="#c2610f" strokeWidth="0.6" opacity="0.3"/>
      <path d="M4.5 20 Q12 16 19.5 20" fill="none" stroke="#c2610f" strokeWidth="0.6" opacity="0.3"/>
    </svg>
  );
}

/* Basketball seam button — the button IS the ball */
function BallButton({children, onClick, style={}}) {
  const [hov, setHov] = useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        position:"relative", overflow:"hidden",
        padding:"9px 20px", fontFamily:"inherit", fontSize:11, fontWeight:800,
        border:"none", background:hov?"#fb923c":"#f97316", color:"#fff",
        cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.5px",
        display:"flex", alignItems:"center", justifyContent:"center", gap:6,
        transition:"background 0.15s",
        ...style
      }}>
      {/* Basketball seam pattern — positioned as background decoration */}
      <svg viewBox="0 0 200 50" preserveAspectRatio="none" style={{
        position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none"
      }}>
        {/* Horizontal seam — the signature curve */}
        <path d="M-10 25 Q50 8 100 25 Q150 42 210 25" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2"/>
        {/* Vertical seam — offset right to feel asymmetric/dynamic */}
        <line x1="140" y1="-5" x2="140" y2="55" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8"/>
        {/* Upper arc */}
        <path d="M20 -5 Q100 12 180 -5" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8"/>
        {/* Lower arc */}
        <path d="M20 55 Q100 38 180 55" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8"/>
      </svg>
      {/* Button content — on top of seams */}
      <span style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:6}}>{children}</span>
    </button>
  );
}

const PLAYS = [
  {name:"Lakers Flare Slip",tag:"Ball Screen",formation:"Horns",diff:2,starred:true,views:342},
  {name:"Warriors Hammer",tag:"Pin Down",formation:"Motion",diff:3,starred:false,views:891},
  {name:"Celtics Spain PnR",tag:"Ball Screen",formation:"1-4 High",diff:4,starred:true,views:1204},
  {name:"Heat Floppy",tag:"Stagger",formation:"Horns",diff:2,starred:false,views:567},
  {name:"Bucks Loop",tag:"Back Screen",formation:"Motion",diff:3,starred:true,views:433},
  {name:"Nuggets Elbow",tag:"Slip",formation:"Horns",diff:3,starred:false,views:278},
  {name:"76ers Weave",tag:"Ball Screen",formation:"1-4 High",diff:2,starred:false,views:189},
  {name:"Mavs Fist Down",tag:"Pin Down",formation:"Horns",diff:3,starred:true,views:654},
  {name:"Suns Quick Hitter",tag:"Flare",formation:"Motion",diff:1,starred:false,views:445},
  {name:"Hawks Point 5",tag:"Ball Screen",formation:"1-4 High",diff:4,starred:false,views:312},
  {name:"Clippers Zipper",tag:"Flare",formation:"Flex",diff:3,starred:false,views:201},
  {name:"Knicks Pinch Post",tag:"Back Screen",formation:"Triangle",diff:3,starred:true,views:876},
];

function MiniCourt({seed=1}) {
  const cols=["#b8842a","#c99535","#a87a28","#d4a23e","#be8e30","#c89538"];
  let rng=seed;const r=()=>{rng=(rng*16807)%2147483647;return(rng&0x7fffffff)/2147483647;};
  const dots=Array.from({length:5},(_,i)=>[(-12+i*6)+r()*4,8+r()*28]);
  return(
    <svg viewBox="-28 -3 56 50" style={{width:"100%",display:"block"}}>
      <rect x="-28" y="-3" width="56" height="50" fill="#151108"/>
      {Array.from({length:10},(_,i)=><rect key={i} x={-28+i*5.6} y="-3" width="5.6" height="50" fill={cols[Math.floor(r()*6)]} opacity="0.35"/>)}
      <rect x="-28" y="-3" width="56" height="50" fill="rgba(180,140,60,0.15)"/>
      <g stroke="rgba(255,255,255,0.12)" strokeWidth="0.25" fill="none">
        <rect x="-25" y="0" width="50" height="47"/>
        <path d="M-6 0L-6 19L6 19L6 0"/><path d="M-6 19A6 6 0 0 0 6 19"/>
        <path d="M-21.65 0L-21.65 9.95A22.15 22.15 0 0 0 21.65 9.95L21.65 0"/>
      </g>
      {dots.map((d,i)=><text key={i} x={d[0]} y={d[1]} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.5)" fontSize="2.8" fontWeight="700" fontFamily="system-ui">{i+1}</text>)}
      <path d={"M"+dots[3][0]+" "+dots[3][1]+" Q"+(dots[3][0]-10)+" "+(dots[3][1]-6)+" "+dots[1][0]+" "+dots[1][1]} fill="none" stroke="rgba(249,115,22,0.3)" strokeWidth="0.22" strokeDasharray="1 0.5"/>
    </svg>
  );
}

function PlayCard({play,onClick}) {
  const dl=["","Easy","Med","Hard","Expert"];
  const dc=["",M.gn,M.am,M.ac,M.rd];
  const [hov,setHov]=useState(false);
  return(
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{border:"1px solid "+(hov?M.bd2:M.bd),cursor:"pointer",background:hov?M.bg2:M.bg,transition:"all 0.12s",overflow:"hidden"}}>
      <div style={{borderBottom:"1px solid "+M.bd,position:"relative"}}>
        <MiniCourt seed={play.name.length*7+play.views}/>
        {play.starred && <div style={{position:"absolute",top:6,right:6}}><Star size={11} fill={M.am} stroke={M.am}/></div>}
      </div>
      <div style={{padding:"10px 12px"}}>
        <div style={{fontSize:13,fontWeight:800,color:M.tx,lineHeight:1.2,marginBottom:6,letterSpacing:"-0.3px"}}>{play.name}</div>
        <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
          <span style={{fontSize:9,padding:"2px 6px",border:"1px solid "+M.ac+"40",background:M.acSoft,color:M.ac,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.3px"}}>{play.tag}</span>
          <span style={{fontSize:9,padding:"2px 6px",border:"1px solid "+M.bd,color:M.td}}>{play.formation}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,color:M.td}}>
          <span style={{color:dc[play.diff],fontWeight:700,fontSize:9,textTransform:"uppercase"}}>{dl[play.diff]}</span>
          <span style={{fontSize:9,color:M.tg}}>{play.views}</span>
        </div>
      </div>
    </div>
  );
}

export default function MotionMergeV2() {
  const [activeTag,setActiveTag]=useState(0);
  const [view,setView]=useState("grid");
  const [searchFocused,setSearchFocused]=useState(false);
  const [showFilters,setShowFilters]=useState(false);
  const [selected,setSelected]=useState(null);
  const TAGS=["All","Offense","Defense","Transition","SLOB","ATO"];

  return(
    <div style={{minHeight:"100vh",background:M.bg,color:M.ts,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",fontSize:13}}>

      {/* NAV */}
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 20px",borderBottom:"1px solid "+M.bdStrong,background:M.bg,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:16,fontWeight:800,color:M.tx,letterSpacing:"-0.5px"}}>
            motion<BallDot size={7}/>
          </div>
          <div style={{height:18,width:1,background:M.bd2}}/>
          <div style={{display:"inline-flex",border:"1px solid "+M.bdStrong}}>
            {["Playbook","Body","Drills","Game IQ"].map((t,i)=>(
              <div key={i} style={{padding:"4px 12px",fontSize:10,fontWeight:i===0?800:500,borderRight:i<3?"1px solid "+M.bdStrong:"none",background:i===0?M.acSoft:"transparent",color:i===0?M.ac:M.td,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px"}}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button style={{padding:"5px 12px",fontSize:10,fontWeight:600,border:"1px solid "+M.bdStrong,background:"transparent",color:M.ts,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            <Sparkles size={11} color={M.ac}/> AI recommend
          </button>
          <div style={{width:28,height:28,border:"1px solid "+M.bdStrong,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:M.tx,fontWeight:800,background:M.bg2}}>CW</div>
        </div>
      </nav>

      {/* HERO HEADER */}
      <div style={{padding:"28px 20px 20px",borderBottom:"1px solid "+M.bdStrong}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:9,fontWeight:700,color:M.td,textTransform:"uppercase",letterSpacing:"2px",marginBottom:6}}>Knowledge base</div>
            <h1 style={{fontSize:38,fontWeight:900,color:M.tx,margin:0,letterSpacing:"-2px",lineHeight:1}}>Play library</h1>
          </div>
          {/* PRIMARY BUTTON with basketball seams */}
          <BallButton>+ Create play</BallButton>
        </div>
      </div>

      {/* STATS */}
      <div style={{display:"flex",borderBottom:"1px solid "+M.bdStrong}}>
        {[["934","plays"],["7","books"],["2,440","pages"],["150+","drills"],["8","archetypes"]].map(([v,l],i)=>(
          <div key={i} style={{flex:1,padding:"12px 12px",textAlign:"center",borderRight:i<4?"1px solid "+M.bd:"none"}}>
            <div style={{fontSize:22,fontWeight:900,color:M.tx,letterSpacing:"-1px"}}>{v}</div>
            <div style={{fontSize:8,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginTop:1}}>{l}</div>
          </div>
        ))}
      </div>

      {/* SEARCH + FILTERS */}
      <div style={{padding:"14px 20px",borderBottom:"1px solid "+M.bd}}>
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <div style={{flex:1,display:"flex",alignItems:"center",border:"1px solid "+(searchFocused?M.ac+"60":M.bd2),padding:"7px 12px",background:M.bg2,transition:"border-color 0.15s"}}>
            <Search size={14} color={M.td} style={{marginRight:8,flexShrink:0}}/>
            <input placeholder="Search plays by name, action, formation..."
              onFocus={()=>setSearchFocused(true)} onBlur={()=>setSearchFocused(false)}
              style={{background:"transparent",border:"none",outline:"none",color:M.tx,fontFamily:"inherit",fontSize:12,width:"100%"}}/>
          </div>
          <button onClick={()=>setShowFilters(!showFilters)} style={{display:"flex",alignItems:"center",gap:4,padding:"7px 12px",fontFamily:"inherit",fontSize:10,fontWeight:700,border:"1px solid "+(showFilters?M.ac+"60":M.bd2),background:showFilters?M.acSoft:"transparent",color:showFilters?M.ac:M.td,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.3px"}}>
            Filters <ChevronDown size={11}/>
          </button>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"inline-flex",border:"1px solid "+M.bdStrong}}>
            {TAGS.map((t,i)=>(
              <div key={i} onClick={()=>setActiveTag(i)} style={{padding:"4px 10px",fontSize:10,fontWeight:activeTag===i?800:500,borderRight:i<TAGS.length-1?"1px solid "+M.bdStrong:"none",background:activeTag===i?M.acSoft:"transparent",color:activeTag===i?M.ac:M.td,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.5px"}}>{t}</div>
            ))}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:700,color:M.tg}}>934</span>
            <div style={{display:"inline-flex",border:"1px solid "+M.bdStrong}}>
              <div onClick={()=>setView("grid")} style={{padding:"3px 6px",cursor:"pointer",background:view==="grid"?M.bg3:"transparent",color:view==="grid"?M.tx:M.tg}}><Grid3X3 size={12}/></div>
              <div onClick={()=>setView("list")} style={{padding:"3px 6px",cursor:"pointer",borderLeft:"1px solid "+M.bdStrong,background:view==="list"?M.bg3:"transparent",color:view==="list"?M.tx:M.tg}}><List size={12}/></div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div style={{display:"flex",gap:20,paddingTop:10,marginTop:10,borderTop:"1px solid "+M.bd}}>
            {[["Formation",["All","Horns","Motion","1-4 High","Flex"]],["Action",["All","PnR","Flare","Pin Down","Slip"]],["Difficulty",["All","Easy","Med","Hard"]]].map(([label,opts],gi)=>(
              <div key={gi}>
                <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>{label}</div>
                <div style={{display:"inline-flex",border:"1px solid "+M.bd2}}>
                  {opts.map((o,i)=>(
                    <div key={i} style={{padding:"3px 8px",fontSize:9,borderRight:i<opts.length-1?"1px solid "+M.bd2:"none",color:i===0?M.ac:M.td,background:i===0?M.acSoft:"transparent",cursor:"pointer",fontWeight:i===0?700:400}}>{o}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PLAY GRID */}
      <div style={{padding:"16px 20px"}}>
        {view==="grid"?(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {PLAYS.map((p,i)=><PlayCard key={i} play={p} onClick={()=>setSelected(p)}/>)}
          </div>
        ):(
          <div style={{border:"1px solid "+M.bdStrong,overflow:"hidden"}}>
            <div style={{display:"flex",padding:"6px 12px",borderBottom:"1px solid "+M.bdStrong,fontSize:9,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"0.5px",background:M.bg2}}>
              <div style={{flex:2}}>Name</div><div style={{flex:1}}>Action</div><div style={{flex:1}}>Formation</div><div style={{width:60,textAlign:"center"}}>Level</div><div style={{width:50,textAlign:"right"}}>Views</div>
            </div>
            {PLAYS.map((p,i)=>(
              <div key={i} onClick={()=>setSelected(p)}
                style={{display:"flex",alignItems:"center",padding:"8px 12px",borderBottom:i<PLAYS.length-1?"1px solid "+M.bd:"none",cursor:"pointer",transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=M.bg2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{flex:2,fontWeight:800,color:M.tx,fontSize:12,display:"flex",alignItems:"center",gap:6,letterSpacing:"-0.2px"}}>
                  {p.name} {p.starred&&<Star size={9} fill={M.am} stroke={M.am}/>}
                </div>
                <div style={{flex:1}}><span style={{padding:"1px 5px",border:"1px solid "+M.ac+"40",background:M.acSoft,color:M.ac,fontSize:9,fontWeight:600}}>{p.tag}</span></div>
                <div style={{flex:1,fontSize:11,color:M.td}}>{p.formation}</div>
                <div style={{width:60,textAlign:"center",fontSize:9,fontWeight:700,color:["",M.gn,M.am,M.ac,M.rd][p.diff],textTransform:"uppercase"}}>{["","Easy","Med","Hard","Exp"][p.diff]}</div>
                <div style={{width:50,textAlign:"right",fontSize:10,color:M.tg}}>{p.views}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",justifyContent:"center",marginTop:16}}>
          <div style={{display:"inline-flex",border:"1px solid "+M.bdStrong}}>
            {["‹","1","2","3","...","78","›"].map((p,i)=>(
              <div key={i} style={{padding:"5px 12px",fontSize:10,fontWeight:i===1?800:500,borderRight:i<6?"1px solid "+M.bdStrong:"none",color:i===1?M.ac:M.td,background:i===1?M.acSoft:"transparent",cursor:"pointer"}}>{p}</div>
            ))}
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      {selected&&(
        <div style={{position:"fixed",top:0,right:0,bottom:0,width:400,background:M.bg,borderLeft:"1px solid "+M.bdStrong,zIndex:200,display:"flex",flexDirection:"column",overflow:"auto"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid "+M.bdStrong,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:9,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px"}}>Play detail</span>
            <span onClick={()=>setSelected(null)} style={{cursor:"pointer",color:M.td,fontSize:18,width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid "+M.bd2}}>×</span>
          </div>
          <div style={{borderBottom:"1px solid "+M.bdStrong}}><MiniCourt seed={selected.name.length*7+selected.views}/></div>
          <div style={{padding:"16px",flex:1}}>
            <h2 style={{fontSize:20,fontWeight:900,color:M.tx,margin:"0 0 6px",letterSpacing:"-0.8px"}}>{selected.name}</h2>
            <div style={{display:"flex",gap:4,marginBottom:12}}>
              <span style={{fontSize:9,padding:"2px 6px",border:"1px solid "+M.ac+"40",background:M.acSoft,color:M.ac,fontWeight:600,textTransform:"uppercase"}}>{selected.tag}</span>
              <span style={{fontSize:9,padding:"2px 6px",border:"1px solid "+M.bd,color:M.td}}>{selected.formation}</span>
              <span style={{fontSize:9,padding:"2px 6px",border:"1px solid "+["","rgba(34,197,94,0.3)","rgba(234,179,8,0.3)","rgba(249,115,22,0.3)","rgba(239,68,68,0.3)"][selected.diff],background:["","rgba(34,197,94,0.08)","rgba(234,179,8,0.08)","rgba(249,115,22,0.08)","rgba(239,68,68,0.08)"][selected.diff],color:["",M.gn,M.am,M.ac,M.rd][selected.diff],fontWeight:700,textTransform:"uppercase"}}>
                {["","Easy","Medium","Hard","Expert"][selected.diff]}
              </span>
            </div>
            <p style={{fontSize:12,color:M.ts,lineHeight:1.7,marginBottom:16}}>
              Very simple action, works great against switch defense. Slip screens are a great counter because defenders usually anticipate the switch and move early.
            </p>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Skill requirements</div>
              <div style={{border:"1px solid "+M.bd2,overflow:"hidden"}}>
                {[["Passing",5],["Off-ball movement",4],["Screening",3],["Basketball IQ",4]].map(([s,v],i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",padding:"7px 10px",borderBottom:i<3?"1px solid "+M.bd:"none"}}>
                    <span style={{flex:1,fontSize:11,fontWeight:600,color:M.ts}}>{s}</span>
                    <div style={{width:80,height:3,background:"rgba(255,255,255,0.06)",marginRight:8}}>
                      <div style={{height:"100%",width:v*10+"%",background:M.ac,opacity:0.8}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:900,color:M.tx,width:20,textAlign:"right"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:8,fontWeight:700,color:M.tg,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Source</div>
              <div style={{fontSize:11,color:M.td}}>NBA Playbook 2018-19, p.247</div>
            </div>
            {/* SIDEBAR PRIMARY BUTTON — also has basketball seams */}
            <div style={{display:"flex",gap:6}}>
              <BallButton style={{flex:1}}><Play size={11}/> Open viewer</BallButton>
              <button style={{flex:1,padding:"9px",fontFamily:"inherit",fontSize:11,fontWeight:600,border:"1px solid "+M.bdStrong,background:"transparent",color:M.ts,cursor:"pointer"}}>
                Add to playbook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{padding:"14px 20px",borderTop:"1px solid "+M.bdStrong,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10}}>
        <div style={{display:"flex",alignItems:"center"}}>
          <span style={{fontWeight:800,color:M.ts,fontSize:12}}>motion</span><BallDot size={6}/>
        </div>
        <span style={{color:M.tg}}>Terms · Privacy · API</span>
      </div>
    </div>
  );
}
