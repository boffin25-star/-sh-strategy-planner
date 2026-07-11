import { useState } from "react";

const BRAND = {
  navy:"#1B3A6B",navyDark:"#122850",navyDeep:"#0C1E3D",accent:"#BFD1EC",accentMid:"#7FA8D4",
  offWhite:"#F4F6FA",white:"#FFFFFF",green:"#2D7D46",greenLight:"#E8F5ED",amber:"#C97A1A",
  amberLight:"#FEF3E2",red:"#B83232",redLight:"#FDEAEA",gray:"#6B7280",grayLight:"#E5E9F0",border:"#D1D9E6",
};
function SecTitle({children}){return<div style={{fontSize:11,fontWeight:800,color:BRAND.navy,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>{children}</div>;}
function Card({children,style}){return<div style={{background:BRAND.white,border:`1px solid ${BRAND.border}`,borderRadius:14,padding:18,marginBottom:14,...style}}>{children}</div>;}

export const RISK_CLASSES=[{label:"General Laborer",rate:2.80},{label:"Carpenter / Framer",rate:3.80},{label:"Roofer",rate:6.50},{label:"Painter (exterior)",rate:4.20},{label:"Concrete / Masonry",rate:3.50},{label:"Drywall / Interior",rate:3.20},{label:"Plumber / HVAC",rate:2.90},{label:"Electrician",rate:2.40},{label:"Water/Fire Restoration",rate:3.50},{label:"Demo / Abatement",rate:5.80},{label:"Office / Admin",rate:0.60}];
export const EMP_TYPES=[{label:"W-2 Temp / Field Worker",value:"w2temp"},{label:"W-2 Regular Employee",value:"w2reg"},{label:"Owner Draw (LLC)",value:"owner"}];
let drawNextId=10;

function DrawCalc() {
  const [draws, setDraws] = useState([
    { id:10, gross:800,  hours:10, riskIdx:8, empType:"w2temp", over50:false },
    { id:11, gross:1000, hours:12, riskIdx:8, empType:"w2temp", over50:false },
    { id:12, gross:4000, hours:40, riskIdx:8, empType:"w2temp", over50:false },
  ]);

  function calcDraw(d) {
    if (d.empType === "owner") {
      return { ss:0,medicare:0,futa:0,waUI:0,pfml:0,lni:0,total:0,trueTotal:Number(d.gross)||0,
        notes:["Owner draws from an LLC are not subject to payroll taxes. Consult your CPA about self-employment tax on distributions."] };
    }
    const gross=Number(d.gross)||0, hours=Number(d.hours)||0, rc=RISK_CLASSES[d.riskIdx];
    const ss=gross*0.062, medicare=gross*0.0145, futa=Math.min(gross,7000)*0.006;
    const waUI=gross*0.01, pfml=d.over50?gross*0.0032:0, lni=hours*rc.rate;
    const total=ss+medicare+futa+waUI+pfml+lni, trueTotal=gross+total;
    const notes=[];
    if(!d.over50) notes.push("PFML employer share waived — under 50 employees.");
    if(gross>=7000) notes.push("FUTA: this draw hits or exceeds the $7,000/yr cap — actual FUTA may be $0 if already hit.");
    notes.push(`L&I (${rc.label}): $${rc.rate.toFixed(2)}/hr x ${hours} hrs. Verify your risk class at lni.wa.gov.`);
    return{ss,medicare,futa,waUI,pfml,lni,total,trueTotal,notes};
  }

  const results=draws.map(d=>({...d,...calcDraw(d)}));
  const grandGross=results.reduce((s,r)=>s+(Number(r.gross)||0),0);
  const grandTax=results.reduce((s,r)=>s+r.total,0);
  const grandTotal=results.reduce((s,r)=>s+r.trueTotal,0);
  const effRate=grandGross>0?(grandTax/grandGross)*100:0;

  return(
    <div>
      <div style={{background:`linear-gradient(135deg,${BRAND.navyDeep},${BRAND.navy})`,borderRadius:14,padding:"16px 18px",marginBottom:14}}>
        <div style={{fontSize:10,color:BRAND.accentMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Construction Draw Calculator — 2026 WA Rates</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
          {[{label:"Total Gross",val:"$"+Math.round(grandGross).toLocaleString(),color:BRAND.white},{label:"Employer Tax",val:"$"+Math.round(grandTax).toLocaleString(),color:"#FFB3B3"},{label:"True Total",val:"$"+Math.round(grandTotal).toLocaleString(),color:BRAND.accent}].map(r=>(
            <div key={r.label} style={{textAlign:"center"}}><div style={{fontSize:9,color:BRAND.accentMid,marginBottom:3}}>{r.label}</div><div style={{fontSize:16,fontWeight:900,color:r.color}}>{r.val}</div></div>
          ))}
        </div>
        <div style={{paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.15)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,color:BRAND.accentMid}}>Effective employer tax rate</div>
          <div style={{fontSize:18,fontWeight:900,color:"#FFB3B3"}}>{effRate.toFixed(1)}%</div>
        </div>
      </div>

      <Card>
        <SecTitle>2026 WA Employer Rates</SecTitle>
        {[
          {label:"Social Security",         rate:"6.2%",   note:"On all wages"},
          {label:"Medicare",                rate:"1.45%",  note:"On all wages"},
          {label:"FUTA (net)",              rate:"0.6%",   note:"First $7,000/yr per employee"},
          {label:"WA Unemployment (UI)",    rate:"~1.0%",  note:"New employer rate; varies with experience"},
          {label:"WA PFML (employer share)",rate:"0.32%",  note:"Only if 50+ employees"},
          {label:"L&I Workers Comp",        rate:"per hr", note:"Varies by risk class — see reference below"},
          {label:"WA State Income Tax",     rate:"$0",     note:"No state income tax in Washington"},
        ].map((r,i,a)=>(
          <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<a.length-1?`1px solid ${BRAND.grayLight}`:"none"}}>
            <div><div style={{fontSize:12,fontWeight:600,color:BRAND.navy}}>{r.label}</div><div style={{fontSize:10,color:BRAND.gray}}>{r.note}</div></div>
            <div style={{fontSize:13,fontWeight:800,color:r.rate==="$0"?BRAND.green:BRAND.amber}}>{r.rate}</div>
          </div>
        ))}
      </Card>

      <SecTitle>Draw Entries ({draws.length})</SecTitle>
      {results.map((r,idx)=>(
        <div key={r.id} style={{background:BRAND.white,border:`1.5px solid ${BRAND.border}`,borderRadius:14,marginBottom:12,overflow:"hidden"}}>
          <div style={{background:BRAND.offWhite,padding:"10px 14px",borderBottom:`1px solid ${BRAND.grayLight}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:800,color:BRAND.navy}}>Draw #{idx+1}</div>
            {draws.length>1&&<button onClick={()=>setDraws(p=>p.filter(d=>d.id!==r.id))} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:BRAND.gray}}>x</button>}
          </div>
          <div style={{padding:"12px 14px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:BRAND.gray,marginBottom:4}}>Gross Draw</div>
                <div style={{position:"relative"}}><span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,fontWeight:700,color:BRAND.accentMid}}>$</span>
                  <input type="number" value={r.gross} onChange={e=>setDraws(p=>p.map(d=>d.id===r.id?{...d,gross:Number(e.target.value)}:d))}
                    style={{width:"100%",boxSizing:"border-box",padding:"8px 8px 8px 22px",borderRadius:8,border:`1.5px solid ${BRAND.border}`,fontSize:14,fontWeight:700,color:BRAND.navy,background:BRAND.offWhite,outline:"none"}}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:BRAND.gray,marginBottom:4}}>Hours Worked</div>
                <input type="number" value={r.hours} onChange={e=>setDraws(p=>p.map(d=>d.id===r.id?{...d,hours:Number(e.target.value)}:d))}
                  style={{width:"100%",boxSizing:"border-box",padding:"8px",borderRadius:8,border:`1.5px solid ${BRAND.border}`,fontSize:14,fontWeight:700,color:BRAND.navy,background:BRAND.offWhite,outline:"none"}}/>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:BRAND.gray,marginBottom:6}}>Employee Type</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {EMP_TYPES.map(t=>(
                  <button key={t.value} onClick={()=>setDraws(p=>p.map(d=>d.id===r.id?{...d,empType:t.value}:d))} style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${r.empType===t.value?BRAND.navy:BRAND.border}`,background:r.empType===t.value?BRAND.navy:BRAND.white,cursor:"pointer",textAlign:"left",fontSize:12,fontWeight:700,color:r.empType===t.value?BRAND.white:BRAND.gray}}>{t.label}</button>
                ))}
              </div>
            </div>
            {r.empType!=="owner"&&(
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:700,color:BRAND.gray,marginBottom:4}}>L&I Risk Class</div>
                <select value={r.riskIdx} onChange={e=>setDraws(p=>p.map(d=>d.id===r.id?{...d,riskIdx:Number(e.target.value)}:d))}
                  style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${BRAND.border}`,fontSize:13,fontWeight:600,color:BRAND.navy,background:BRAND.offWhite,outline:"none"}}>
                  {RISK_CLASSES.map((rc,i)=><option key={i} value={i}>{rc.label} — ${rc.rate.toFixed(2)}/hr</option>)}
                </select>
              </div>
            )}
            {r.empType!=="owner"&&(
              <button onClick={()=>setDraws(p=>p.map(d=>d.id===r.id?{...d,over50:!d.over50}:d))} style={{width:"100%",padding:"8px 12px",borderRadius:8,marginBottom:12,border:`1.5px solid ${r.over50?BRAND.amber:BRAND.border}`,background:r.over50?BRAND.amberLight:BRAND.white,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:600,color:r.over50?BRAND.amber:BRAND.gray}}>50+ Employees (PFML applies)</span>
                <span style={{fontSize:14}}>{r.over50?"[x]":""}</span>
              </button>
            )}
            {r.empType==="owner"?(
              <div style={{background:BRAND.greenLight,border:`1.5px solid #86C99A`,borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:12,fontWeight:700,color:BRAND.green,marginBottom:4}}>Owner Draw - No Payroll Taxes</div>
                <div style={{fontSize:11,color:BRAND.gray,lineHeight:1.5}}>{r.notes[0]}</div>
              </div>
            ):(
              <>
                <div style={{background:BRAND.offWhite,borderRadius:10,padding:"4px 12px",marginBottom:10}}>
                  {[
                    {label:"Social Security (6.2%)",val:r.ss},
                    {label:"Medicare (1.45%)",val:r.medicare},
                    {label:"FUTA (0.6% net)",val:r.futa},
                    {label:"WA UI (~1.0%)",val:r.waUI},
                    {label:"WA PFML (0.32%)",val:r.pfml,zero:!r.over50},
                    {label:`L&I (${RISK_CLASSES[r.riskIdx].label})`,val:r.lni,note:`$${RISK_CLASSES[r.riskIdx].rate}/hr x ${r.hours}hrs`},
                  ].map((row,i,a)=>(
                    <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<a.length-1?`1px solid ${BRAND.grayLight}`:"none"}}>
                      <div><div style={{fontSize:11,fontWeight:600,color:row.zero?BRAND.gray:BRAND.navy}}>{row.label}</div>{row.note&&<div style={{fontSize:9,color:BRAND.gray}}>{row.note}</div>}</div>
                      <div style={{fontSize:12,fontWeight:800,color:row.zero?BRAND.gray:BRAND.amber}}>{row.zero?"--":"$"+row.val.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                  <div style={{background:BRAND.redLight,border:`1px solid #E89C9C`,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:BRAND.gray,marginBottom:2}}>Employer Add-On</div>
                    <div style={{fontSize:17,fontWeight:900,color:BRAND.red}}>${r.total.toFixed(2)}</div>
                    <div style={{fontSize:9,color:BRAND.gray}}>{r.gross>0?((r.total/(Number(r.gross)||1))*100).toFixed(1)+"% of draw":""}</div>
                  </div>
                  <div style={{background:`linear-gradient(135deg,${BRAND.navyDeep},${BRAND.navy})`,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:BRAND.accentMid,marginBottom:2}}>True Total Cost</div>
                    <div style={{fontSize:17,fontWeight:900,color:BRAND.white}}>${r.trueTotal.toFixed(2)}</div>
                  </div>
                </div>
                {r.notes.length>0&&<div style={{background:BRAND.amberLight,border:`1px solid #E8C97A`,borderRadius:8,padding:"8px 10px"}}>{r.notes.map((n,i)=><div key={i} style={{fontSize:10,color:"#7A5500",lineHeight:1.5,marginBottom:i<r.notes.length-1?4:0}}>! {n}</div>)}</div>}
              </>
            )}
          </div>
        </div>
      ))}

      <button onClick={()=>setDraws(p=>[...p,{id:drawNextId++,gross:1000,hours:16,riskIdx:8,empType:"w2temp",over50:false}])}
        style={{width:"100%",padding:"12px",borderRadius:10,border:`2px dashed ${BRAND.border}`,background:"transparent",fontSize:13,fontWeight:700,color:BRAND.accentMid,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:14}}>
        + Add Draw
      </button>

      {draws.length>1&&(
        <Card style={{background:BRAND.navyDeep,border:"none"}}>
          <div style={{fontSize:11,color:BRAND.accentMid,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>All Draws Combined</div>
          {[{label:"Total Gross Draws",val:"$"+grandGross.toFixed(2),color:BRAND.white},{label:"Total Employer Taxes",val:"$"+grandTax.toFixed(2),color:"#FFB3B3"},{label:"Effective Tax Rate",val:effRate.toFixed(1)+"%",color:BRAND.accent},{label:"True Total Cost",val:"$"+grandTotal.toFixed(2),color:"#FF8080"}].map((row,i,a)=>(
            <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<a.length-1?"1px solid rgba(255,255,255,0.1)":"none"}}>
              <div style={{fontSize:12,color:BRAND.accentMid}}>{row.label}</div>
              <div style={{fontSize:14,fontWeight:800,color:row.color}}>{row.val}</div>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <SecTitle>L&I Risk Class Reference</SecTitle>
        <div style={{fontSize:11,color:BRAND.gray,marginBottom:10,lineHeight:1.5}}>Workers comp is per hour worked, not a payroll percentage. Verify your exact class at lni.wa.gov.</div>
        {RISK_CLASSES.map((rc,i)=>(
          <div key={rc.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<RISK_CLASSES.length-1?`1px solid ${BRAND.grayLight}`:"none"}}>
            <div style={{fontSize:12,color:BRAND.navy,fontWeight:600}}>{rc.label}</div>
            <div style={{fontSize:12,fontWeight:800,color:BRAND.amber}}>${rc.rate.toFixed(2)}/hr</div>
          </div>
        ))}
      </Card>

      <div style={{background:BRAND.amberLight,border:`1px solid #E8C97A`,borderRadius:12,padding:14}}>
        <div style={{fontSize:11,fontWeight:800,color:"#7A5500",marginBottom:4}}>This is an estimate tool</div>
        <div style={{fontSize:11,color:"#7A5500",lineHeight:1.6}}>L&I rates vary by risk class and experience. FUTA caps at $7,000/yr per employee. WA UI rate adjusts with experience rating. Verify current rates with a payroll provider or your CPA.</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: ROADMAP
// ══════════════════════════════════════════════════════════════════════════════

export default DrawCalc;
