import { useState, useMemo } from "react";
import DrawCalc from "./DrawCalc.jsx";

// ─── Brand ───────────────────────────────────────────────────────────────────
const BRAND = {
  navy:       "#1B3A6B",
  navyDark:   "#122850",
  navyDeep:   "#0C1E3D",
  accent:     "#BFD1EC",
  accentMid:  "#7FA8D4",
  offWhite:   "#F4F6FA",
  white:      "#FFFFFF",
  green:      "#2D7D46",
  greenLight: "#E8F5ED",
  amber:      "#C97A1A",
  amberLight: "#FEF3E2",
  red:        "#B83232",
  redLight:   "#FDEAEA",
  gray:       "#6B7280",
  grayLight:  "#E5E9F0",
  border:     "#D1D9E6",
  purple:     "#6D3E8E",
  purpleLight:"#F3ECF9",
};

const DEFAULT_OVERHEAD = 6000;
const JOB_SIZES = [3000, 5000, 8000, 10000, 15000, 25000, 50000];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STAGES = [
  { label:"Current", brandon:0,    erik:3500, matt:0    },
  { label:"Stage 1", brandon:4000, erik:4000, matt:4000 },
  { label:"Stage 2", brandon:5500, erik:5500, matt:5000 },
  { label:"Stage 3", brandon:7000, erik:7000, matt:6000 },
  { label:"Goal",    brandon:9000, erik:9000, matt:6000 },
];

// ─── Tax helpers ──────────────────────────────────────────────────────────────
function federalIncomeTax(annual) {
  const brackets = [
    {limit:11600,rate:.10},{limit:47150,rate:.12},{limit:100525,rate:.22},
    {limit:191950,rate:.24},{limit:243725,rate:.32},{limit:609350,rate:.35},
    {limit:Infinity,rate:.37},
  ];
  let tax=0,prev=0;
  for(const b of brackets){
    if(annual<=prev)break;
    tax+=(Math.min(annual,b.limit)-prev)*b.rate;
    prev=b.limit;
  }
  return tax;
}
function calcEmployeeTaxes(annualGross) {
  const ss=Math.min(annualGross*.062,168600*.062);
  const med=annualGross*.0145;
  const addMed=annualGross>200000?(annualGross-200000)*.009:0;
  const fed=federalIncomeTax(annualGross);
  const empTx=ss+med+addMed+fed;
  const ess=Math.min(annualGross*.062,168600*.062);
  const emed=annualGross*.0145;
  const futa=Math.min(annualGross,7000)*.006;
  const suta=Math.min(annualGross,67600)*.01;
  const erTx=ess+emed+futa+suta;
  return{socialSecurity:ss,medicare:med,additionalMed:addMed,fedIncome:fed,
    totalEmployee:empTx,employerSS:ess,employerMed:emed,futa,suta,
    totalEmployer:erTx,netTakeHome:annualGross-empTx};
}
function monthlyGross(emp){
  if(emp.type==="salary")return Number(emp.amount)||0;
  return(Number(emp.amount)||0)*(Number(emp.hours)||40)*52/12;
}
function calcFixed(employees,overhead){
  const gross=employees.reduce((s,e)=>s+monthlyGross(e),0);
  const erTx=employees.reduce((s,e)=>s+calcEmployeeTaxes(monthlyGross(e)*12).totalEmployer/12,0);
  return{gross,erTx,labor:gross+erTx,fixed:overhead+gross+erTx};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt =(n)=>"$"+Math.round(Math.abs(n)).toLocaleString();
const fmtK=(n)=>Math.abs(n)>=1000?`$${(Math.abs(n)/1e3).toFixed(Math.abs(n)%1e3===0?0:1)}k`:fmt(n);
const pct =(n)=>n.toFixed(1)+"%";
let nextId=4;

// ─── Micro components ─────────────────────────────────────────────────────────
function Pill({children,color=BRAND.navy,bg=BRAND.accent,style}){
  return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:"0.05em",color,background:bg,...style}}>{children}</span>;
}
function Card({children,style}){
  return <div style={{background:BRAND.white,border:`1px solid ${BRAND.border}`,borderRadius:14,padding:18,marginBottom:14,...style}}>{children}</div>;
}
function SecTitle({children}){
  return <div style={{fontSize:11,fontWeight:800,color:BRAND.navy,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>{children}</div>;
}
function StatRow({label,sub,value,valueColor=BRAND.navy,last,indent}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",paddingLeft:indent?12:0,borderBottom:last?"none":`1px solid ${BRAND.grayLight}`}}>
      <div>
        <div style={{fontSize:indent?12:13,fontWeight:indent?500:600,color:indent?BRAND.gray:BRAND.navy}}>{label}</div>
        {sub&&<div style={{fontSize:11,color:BRAND.gray,marginTop:1}}>{sub}</div>}
      </div>
      <div style={{fontSize:indent?12:14,fontWeight:700,color:valueColor}}>{value}</div>
    </div>
  );
}
function StackBar({slices}){
  return(
    <div>
      <div style={{display:"flex",height:18,borderRadius:6,overflow:"hidden",border:`1px solid ${BRAND.border}`}}>
        {slices.map((s,i)=><div key={i} style={{width:`${Math.max(0,s.pct)}%`,background:s.color,transition:"width .35s ease"}} title={`${s.label}: ${s.pct.toFixed(1)}%`}/>)}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"5px 12px",marginTop:7}}>
        {slices.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:BRAND.gray}}>
            <div style={{width:7,height:7,borderRadius:2,background:s.color}}/>
            {s.label} {s.pct.toFixed(0)}%
          </div>
        ))}
      </div>
    </div>
  );
}
function NumInput({label,value,onChange,prefix="$",suffix}){
  return(
    <div>
      {label&&<div style={{fontSize:11,fontWeight:700,color:BRAND.gray,marginBottom:4}}>{label}</div>}
      <div style={{position:"relative"}}>
        {prefix&&<span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,fontWeight:700,color:BRAND.accentMid}}>{prefix}</span>}
        <input type="number" value={value} onChange={e=>onChange(Number(e.target.value))}
          style={{width:"100%",boxSizing:"border-box",padding:`8px ${suffix?"28px":8}px 8px ${prefix?"22px":8}px`,borderRadius:8,border:`1.5px solid ${BRAND.border}`,fontSize:14,fontWeight:700,color:BRAND.navy,background:BRAND.offWhite,outline:"none"}}/>
        {suffix&&<span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:12,color:BRAND.gray}}>{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({emp,onChange,onRemove,canRemove}){
  const [exp,setExp]=useState(false);
  const gross=monthlyGross(emp),annualG=gross*12,taxes=calcEmployeeTaxes(annualG);
  return(
    <div style={{background:BRAND.white,border:`1.5px solid ${BRAND.border}`,borderRadius:12,marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <input value={emp.name} onChange={e=>onChange({...emp,name:e.target.value})} placeholder="Name"
            style={{flex:1,fontSize:15,fontWeight:700,color:BRAND.navy,border:"none",background:"transparent",outline:"none"}}/>
          <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1.5px solid ${BRAND.border}`}}>
            {["salary","hourly"].map(t=>(
              <button key={t} onClick={()=>onChange({...emp,type:t})}
                style={{padding:"4px 10px",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,
                  background:emp.type===t?BRAND.navy:BRAND.offWhite,color:emp.type===t?BRAND.white:BRAND.gray}}>
                {t[0].toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
          {canRemove&&<button onClick={onRemove} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",color:BRAND.gray}}>✕</button>}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:BRAND.gray,marginBottom:3}}>{emp.type==="salary"?"Monthly Salary":"Hourly Rate"}</div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,fontWeight:700,color:BRAND.accentMid}}>$</span>
              <input type="number" value={emp.amount} onChange={e=>onChange({...emp,amount:e.target.value})}
                style={{width:"100%",boxSizing:"border-box",padding:"8px 8px 8px 22px",borderRadius:8,border:`1.5px solid ${BRAND.border}`,fontSize:14,fontWeight:700,color:BRAND.navy,background:BRAND.offWhite,outline:"none"}}/>
            </div>
          </div>
          {emp.type==="hourly"&&(
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:BRAND.gray,marginBottom:3}}>Hrs/week</div>
              <input type="number" value={emp.hours} onChange={e=>onChange({...emp,hours:e.target.value})}
                style={{width:"100%",boxSizing:"border-box",padding:"8px",borderRadius:8,border:`1.5px solid ${BRAND.border}`,fontSize:14,fontWeight:700,color:BRAND.navy,background:BRAND.offWhite,outline:"none"}}/>
            </div>
          )}
          <div style={{textAlign:"right",paddingBottom:2}}>
            <div style={{fontSize:10,color:BRAND.gray}}>Monthly gross</div>
            <div style={{fontSize:16,fontWeight:900,color:BRAND.navy}}>{fmt(gross)}</div>
          </div>
        </div>
        <button onClick={()=>setExp(!exp)}
          style={{marginTop:10,width:"100%",padding:"7px",borderRadius:8,border:`1px solid ${BRAND.border}`,background:BRAND.offWhite,fontSize:11,fontWeight:700,color:BRAND.navy,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          {exp?"▲ Hide":"▼ Show"} Tax Breakdown
        </button>
      </div>
      {exp&&(
        <div style={{borderTop:`1px solid ${BRAND.grayLight}`,padding:"12px 14px",background:BRAND.offWhite}}>
          <div style={{fontSize:11,fontWeight:800,color:BRAND.navy,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Annual Gross: {fmt(annualG)}</div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:BRAND.gray,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Employee Deductions</div>
            <div style={{background:BRAND.white,borderRadius:10,padding:"4px 12px",border:`1px solid ${BRAND.border}`}}>
              <StatRow label="Federal Income Tax" sub="2024 brackets, single filer est." value={fmt(taxes.fedIncome/12)+"/mo"} valueColor={BRAND.red} indent/>
              <StatRow label="Social Security" sub="6.2% up to $168,600" value={fmt(taxes.socialSecurity/12)+"/mo"} valueColor={BRAND.amber} indent/>
              <StatRow label="Medicare" sub="1.45%" value={fmt(taxes.medicare/12)+"/mo"} valueColor={BRAND.amber} indent/>
              <StatRow label="WA State Income Tax" sub="Washington has no state income tax" value="$0" valueColor={BRAND.green} indent/>
              <StatRow label="Total Deductions" value={fmt(taxes.totalEmployee/12)+"/mo"} valueColor={BRAND.red} last/>
            </div>
          </div>
          <div style={{background:`linear-gradient(135deg,${BRAND.navyDeep},${BRAND.navy})`,borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,color:BRAND.accentMid}}>Est. Monthly Take-Home</div>
              <div style={{fontSize:20,fontWeight:900,color:BRAND.white}}>{fmt(taxes.netTakeHome/12)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:BRAND.accentMid}}>Annual Take-Home</div>
              <div style={{fontSize:16,fontWeight:800,color:BRAND.accent}}>{fmt(taxes.netTakeHome)}</div>
            </div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:BRAND.gray,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Employer Cost (S&H pays)</div>
          <div style={{background:BRAND.white,borderRadius:10,padding:"4px 12px",border:`1px solid ${BRAND.border}`}}>
            <StatRow label="Gross Salary" value={fmt(gross)+"/mo"} valueColor={BRAND.navy} indent/>
            <StatRow label="Employer SS + Medicare" sub="6.2% + 1.45% match" value={fmt((taxes.employerSS+taxes.employerMed)/12)+"/mo"} valueColor={BRAND.amber} indent/>
            <StatRow label="FUTA + WA SUTA" sub="Unemployment insurance" value={fmt((taxes.futa+taxes.suta)/12)+"/mo"} valueColor={BRAND.amber} indent/>
            <StatRow label="Total Cost to S&H" value={fmt((gross*12+taxes.totalEmployer)/12)+"/mo"} valueColor={BRAND.red} last/>
          </div>
          <div style={{marginTop:8,fontSize:10,color:BRAND.gray,lineHeight:1.5}}>* Single filer estimate. Actual varies by W-4. Check WA L&I for your SUTA rate.</div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({employees,overhead,margin}){
  const {gross,erTx,labor,fixed}=calcFixed(employees,overhead);
  const revenue=fixed/(1-margin/100),profit=revenue-fixed;
  const oPct=(overhead/revenue)*100,lPct=(labor/revenue)*100,prPct=(profit/revenue)*100;
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <Card style={{textAlign:"center",padding:"20px 12px"}}>
          <div style={{fontSize:10,fontWeight:700,color:BRAND.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Break-Even</div>
          <div style={{fontSize:28,fontWeight:900,color:BRAND.red,lineHeight:1}}>{fmtK(fixed)}</div>
          <div style={{fontSize:10,color:BRAND.gray,marginTop:4}}>per month</div>
        </Card>
        <Card style={{textAlign:"center",padding:"20px 12px"}}>
          <div style={{fontSize:10,fontWeight:700,color:BRAND.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Target Rev</div>
          <div style={{fontSize:28,fontWeight:900,color:BRAND.green,lineHeight:1}}>{fmtK(revenue)}</div>
          <div style={{fontSize:10,color:BRAND.gray,marginTop:4}}>{margin}% margin</div>
        </Card>
      </div>
      <div style={{background:`linear-gradient(135deg,${BRAND.navyDeep},${BRAND.navy})`,borderRadius:14,padding:"16px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:BRAND.accentMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>Annual Target</div>
          <div style={{fontSize:30,fontWeight:900,color:BRAND.white,lineHeight:1.1}}>{fmt(revenue*12)}</div>
          <div style={{fontSize:11,color:BRAND.accentMid,marginTop:3}}>{fmt(profit*12)}/yr retained profit</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:BRAND.accentMid,marginBottom:4}}>Jobs needed/mo</div>
          <div style={{fontSize:16,fontWeight:800,color:BRAND.accent}}>{Math.ceil(revenue/10000)}<span style={{fontSize:11,fontWeight:400}}> × $10k</span></div>
          <div style={{fontSize:13,fontWeight:700,color:BRAND.accent,marginTop:2}}>{Math.ceil(revenue/15000)}<span style={{fontSize:11,fontWeight:400}}> × $15k</span></div>
        </div>
      </div>
      <Card>
        <SecTitle>Monthly Cost Breakdown</SecTitle>
        <StatRow label="Business Overhead" sub="insurance, tools, gas, software" value={fmt(overhead)}/>
        <StatRow label="Gross Payroll" sub={`${employees.length} team members`} value={fmt(gross)}/>
        <StatRow label="Employer Taxes" sub="SS, Medicare, FUTA, SUTA" value={fmt(erTx)} valueColor={BRAND.amber}/>
        <StatRow label="Total Fixed Costs" value={fmt(fixed)} valueColor={BRAND.red} last/>
      </Card>
      <Card>
        <SecTitle>Per $1,000 of Revenue</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          {[{label:"Overhead",val:(oPct/100)*1000,color:BRAND.accentMid},{label:"Labor",val:(lPct/100)*1000,color:BRAND.navy},{label:"Profit",val:(prPct/100)*1000,color:BRAND.green}].map(r=>(
            <div key={r.label} style={{background:BRAND.offWhite,borderRadius:10,padding:"10px 12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                <div style={{width:7,height:7,borderRadius:2,background:r.color}}/>
                <span style={{fontSize:10,color:BRAND.gray,fontWeight:600}}>{r.label}</span>
              </div>
              <div style={{fontSize:19,fontWeight:900,color:BRAND.navy}}>{fmt(r.val)}</div>
            </div>
          ))}
        </div>
        <StackBar slices={[{label:"Overhead",pct:oPct,color:BRAND.accentMid},{label:"Labor",pct:lPct,color:BRAND.navy},{label:"Profit",pct:prPct,color:BRAND.green}]}/>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: SALARIES
// ══════════════════════════════════════════════════════════════════════════════
function Salaries({employees,setEmployees,overhead,setOverhead,margin,setMargin}){
  const totalGross=employees.reduce((s,e)=>s+monthlyGross(e),0);
  const totalErTx=employees.reduce((s,e)=>s+calcEmployeeTaxes(monthlyGross(e)*12).totalEmployer/12,0);
  return(
    <div>
      <Card>
        <SecTitle>Team ({employees.length} people)</SecTitle>
        {employees.map(emp=>(
          <EmployeeCard key={emp.id} emp={emp}
            onChange={u=>setEmployees(prev=>prev.map(e=>e.id===emp.id?u:e))}
            onRemove={()=>setEmployees(prev=>prev.filter(e=>e.id!==emp.id))}
            canRemove={employees.length>1}/>
        ))}
        <button onClick={()=>setEmployees(prev=>[...prev,{id:nextId++,name:"",type:"salary",amount:0,hours:40}])}
          style={{width:"100%",padding:"11px",borderRadius:10,border:`2px dashed ${BRAND.border}`,background:"transparent",fontSize:13,fontWeight:700,color:BRAND.accentMid,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          + Add Team Member
        </button>
      </Card>
      <Card>
        <SecTitle>Business Settings</SecTitle>
        <div style={{marginBottom:16}}>
          <NumInput label="Monthly Overhead" value={overhead} onChange={setOverhead}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:600,color:BRAND.navy}}>Profit margin target</span>
          <span style={{fontSize:14,fontWeight:800,color:BRAND.green}}>{margin}%</span>
        </div>
        <input type="range" min={5} max={40} step={1} value={margin} onChange={e=>setMargin(Number(e.target.value))} style={{width:"100%",accentColor:BRAND.navy}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:BRAND.gray}}>
          <span>5% tight</span><span>20% healthy</span><span>40% strong</span>
        </div>
      </Card>
      <Card style={{background:BRAND.offWhite}}>
        <SecTitle>Team Cost Summary</SecTitle>
        <StatRow label="Total Gross Payroll" value={fmt(totalGross)+"/mo"}/>
        <StatRow label="Employer Taxes" sub="SS match, Medicare, FUTA, SUTA" value={fmt(totalErTx)+"/mo"} valueColor={BRAND.amber}/>
        <StatRow label="Total Labor Cost" value={fmt(totalGross+totalErTx)+"/mo"} valueColor={BRAND.red} last/>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: JOB COST ESTIMATOR
// ══════════════════════════════════════════════════════════════════════════════
function JobCost({employees,overhead,margin}){
  const [bid,setBid]=useState(15000);
  const [mats,setMats]=useState(3000);
  const [laborHrs,setLaborHrs]=useState(40);
  const [laborRate,setLaborRate]=useState(65);
  const [subs,setSubs]=useState(0);
  const [misc,setMisc]=useState(0);
  const [jobName,setJobName]=useState("");

  const laborCost=laborHrs*laborRate;
  const totalCost=mats+laborCost+subs+misc;
  const grossProfit=bid-totalCost;
  const grossMargin=bid>0?(grossProfit/bid)*100:0;

  const {fixed}=calcFixed(employees,overhead);
  const revenueTarget=fixed/(1-margin/100);

  // How much of fixed costs this job covers
  const fixedCoverPct=Math.min(100,(bid/revenueTarget)*100);

  const status=grossMargin>=margin?"go":grossMargin>=margin*0.7?"caution":"nogo";
  const statusColors={go:{bg:BRAND.greenLight,color:BRAND.green,border:"#86C99A",label:"✅ GO — Solid margin"},caution:{bg:BRAND.amberLight,color:BRAND.amber,border:"#E8C97A",label:"⚠️ CAUTION — Thin margin"},nogo:{bg:BRAND.redLight,color:BRAND.red,border:"#E89C9C",label:"🚫 NO-GO — Below target"}};
  const sc=statusColors[status];

  return(
    <div>
      <Card>
        <SecTitle>Job Details</SecTitle>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:BRAND.gray,marginBottom:4}}>Job Name (optional)</div>
          <input value={jobName} onChange={e=>setJobName(e.target.value)} placeholder="e.g. Smith Water Damage"
            style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:8,border:`1.5px solid ${BRAND.border}`,fontSize:14,color:BRAND.navy,background:BRAND.offWhite,outline:"none"}}/>
        </div>
        <NumInput label="Bid / Invoice Amount" value={bid} onChange={setBid}/>
      </Card>

      <Card>
        <SecTitle>Costs</SecTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <NumInput label="Materials" value={mats} onChange={setMats}/>
          <NumInput label="Subcontractors" value={subs} onChange={setSubs}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <NumInput label="Labor Hours" value={laborHrs} onChange={setLaborHrs} prefix=""/>
          <NumInput label="Labor Rate / hr" value={laborRate} onChange={setLaborRate}/>
        </div>
        <NumInput label="Misc / Other" value={misc} onChange={setMisc}/>
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${BRAND.grayLight}`,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:13,color:BRAND.gray,fontWeight:600}}>Total job cost</span>
          <span style={{fontSize:16,fontWeight:900,color:BRAND.red}}>{fmt(totalCost)}</span>
        </div>
      </Card>

      {/* Go/No-Go Banner */}
      <div style={{background:sc.bg,border:`1.5px solid ${sc.border}`,borderRadius:14,padding:"16px 18px",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:800,color:sc.color,marginBottom:10}}>{sc.label}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {label:"Gross Profit",val:fmt(grossProfit),color:grossProfit>=0?BRAND.green:BRAND.red},
            {label:"Gross Margin",val:pct(grossMargin),color:grossMargin>=margin?BRAND.green:BRAND.red},
            {label:"Target Margin",val:pct(margin),color:BRAND.navy},
            {label:"Margin Gap",val:pct(grossMargin-margin),color:grossMargin>=margin?BRAND.green:BRAND.red},
          ].map(r=>(
            <div key={r.label} style={{background:"rgba(255,255,255,0.6)",borderRadius:10,padding:"8px 12px"}}>
              <div style={{fontSize:10,color:BRAND.gray,marginBottom:2}}>{r.label}</div>
              <div style={{fontSize:17,fontWeight:900,color:r.color}}>{r.val}</div>
            </div>
          ))}
        </div>
      </div>

      <Card>
        <SecTitle>Cost Breakdown</SecTitle>
        <StatRow label="Materials" value={fmt(mats)} sub={pct((mats/bid)*100)+" of bid"} indent/>
        <StatRow label="Labor" value={fmt(laborCost)} sub={`${laborHrs}hrs × ${fmt(laborRate)}/hr`} indent/>
        <StatRow label="Subcontractors" value={fmt(subs)} indent/>
        <StatRow label="Misc" value={fmt(misc)} indent/>
        <StatRow label="Total Costs" value={fmt(totalCost)} valueColor={BRAND.red}/>
        <StatRow label="Gross Profit" value={fmt(grossProfit)} valueColor={grossProfit>=0?BRAND.green:BRAND.red} last/>
      </Card>

      <Card style={{background:BRAND.offWhite}}>
        <SecTitle>Monthly Goal Coverage</SecTitle>
        <div style={{fontSize:12,color:BRAND.gray,marginBottom:8}}>This job covers <strong style={{color:BRAND.navy}}>{pct(fixedCoverPct)}</strong> of your monthly revenue target ({fmt(revenueTarget)})</div>
        <div style={{background:BRAND.grayLight,borderRadius:6,height:12,overflow:"hidden",marginBottom:6}}>
          <div style={{width:`${fixedCoverPct}%`,height:"100%",borderRadius:6,background:BRAND.navy,transition:"width .4s ease"}}/>
        </div>
        <div style={{fontSize:11,color:BRAND.gray}}>Need {Math.ceil(revenueTarget/bid)} jobs like this per month to hit target</div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: QUICK CHECK
// ══════════════════════════════════════════════════════════════════════════════
function QuickCheck({employees,overhead,margin}){
  const [bid,setBid]=useState(10000);
  const [costPct,setCostPct]=useState(60);
  const {fixed}=calcFixed(employees,overhead);
  const revenueTarget=fixed/(1-margin/100);
  const estCost=bid*(costPct/100);
  const estProfit=bid-estCost;
  const estMargin=bid>0?(estProfit/bid)*100:0;
  const status=estMargin>=margin?"go":estMargin>=margin*0.7?"caution":"nogo";
  const colors={go:{bg:BRAND.green,text:"GO"},caution:{bg:BRAND.amber,text:"CAUTION"},nogo:{bg:BRAND.red,text:"NO-GO"}};
  const c=colors[status];
  const coverPct=Math.min(100,(bid/revenueTarget)*100);

  return(
    <div>
      <Card>
        <SecTitle>Fast Bid Check</SecTitle>
        <div style={{marginBottom:16}}>
          <NumInput label="Bid Amount" value={bid} onChange={setBid}/>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:600,color:BRAND.navy}}>Estimated cost %</span>
            <span style={{fontSize:14,fontWeight:800,color:BRAND.navy}}>{costPct}%</span>
          </div>
          <input type="range" min={20} max={95} step={1} value={costPct} onChange={e=>setCostPct(Number(e.target.value))} style={{width:"100%",accentColor:BRAND.navy}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:BRAND.gray}}>
            <span>20% (high margin)</span><span>60% typical</span><span>95% (break even)</span>
          </div>
        </div>
      </Card>

      {/* Big verdict */}
      <div style={{background:c.bg,borderRadius:16,padding:"28px 20px",marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:42,fontWeight:900,color:BRAND.white,letterSpacing:"0.05em"}}>{c.text}</div>
        <div style={{fontSize:24,fontWeight:800,color:"rgba(255,255,255,0.9)",marginTop:4}}>{pct(estMargin)} margin</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.75)",marginTop:6}}>{fmt(estProfit)} estimated profit · target is {pct(margin)}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        {[
          {label:"Bid",val:fmt(bid),color:BRAND.navy},
          {label:"Est. Costs",val:fmt(estCost),color:BRAND.red},
          {label:"Est. Profit",val:fmt(estProfit),color:estProfit>=0?BRAND.green:BRAND.red},
          {label:"Goal Coverage",val:pct(coverPct),color:BRAND.navy},
        ].map(r=>(
          <Card key={r.label} style={{textAlign:"center",padding:"14px 12px",marginBottom:0}}>
            <div style={{fontSize:10,fontWeight:700,color:BRAND.gray,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{r.label}</div>
            <div style={{fontSize:20,fontWeight:900,color:r.color}}>{r.val}</div>
          </Card>
        ))}
      </div>

      <Card style={{background:BRAND.offWhite}}>
        <SecTitle>What would it take to hit {pct(margin)}?</SecTitle>
        const neededProfit=bid*(margin/100);
        const neededCost=bid-neededProfit;
        <StatRow label="Max allowable cost" value={fmt(bid*(1-margin/100))} sub={pct(100-margin)+" of bid"}/>
        <StatRow label="Your est. cost" value={fmt(estCost)} sub={pct(costPct)+" of bid"} valueColor={estCost<=bid*(1-margin/100)?BRAND.green:BRAND.red}/>
        <StatRow label="Need to cut" value={estCost>bid*(1-margin/100)?fmt(estCost-(bid*(1-margin/100))):"On target"} valueColor={estCost>bid*(1-margin/100)?BRAND.red:BRAND.green} last/>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: REVENUE TRACKER
// ══════════════════════════════════════════════════════════════════════════════
function RevenueTracker({employees,overhead,margin}){
  const currentYear=new Date().getFullYear();
  const currentMonth=new Date().getMonth();
  const {fixed}=calcFixed(employees,overhead);
  const monthlyTarget=fixed/(1-margin/100);
  const [actuals,setActuals]=useState(Array(12).fill(""));
  const [targets,setTargets]=useState(Array(12).fill(Math.round(monthlyTarget)));

  const totalActual=actuals.reduce((s,v)=>s+(Number(v)||0),0);
  const totalTarget=targets.reduce((s,v)=>s+(Number(v)||0),0);
  const ytdPct=totalTarget>0?(totalActual/totalTarget)*100:0;

  return(
    <div>
      <Card style={{background:`linear-gradient(135deg,${BRAND.navyDeep},${BRAND.navy})`,border:"none"}}>
        <div style={{fontSize:10,color:BRAND.accentMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>{currentYear} YTD</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
          <div>
            <div style={{fontSize:30,fontWeight:900,color:BRAND.white}}>{fmt(totalActual)}</div>
            <div style={{fontSize:11,color:BRAND.accentMid}}>of {fmt(totalTarget)} target · {pct(ytdPct)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:BRAND.accentMid}}>Monthly target</div>
            <div style={{fontSize:18,fontWeight:800,color:BRAND.accent}}>{fmtK(monthlyTarget)}</div>
          </div>
        </div>
        <div style={{background:"rgba(255,255,255,0.15)",borderRadius:6,height:10,overflow:"hidden"}}>
          <div style={{width:`${Math.min(100,ytdPct)}%`,height:"100%",borderRadius:6,background:ytdPct>=100?BRAND.green:BRAND.accent,transition:"width .4s ease"}}/>
        </div>
      </Card>

      {MONTHS.map((mo,i)=>{
        const actual=Number(actuals[i])||0;
        const target=Number(targets[i])||0;
        const pctVal=target>0?(actual/target)*100:0;
        const isCurrent=i===currentMonth;
        const isFuture=i>currentMonth;
        const hasData=actuals[i]!=="";
        const barColor=pctVal>=100?BRAND.green:pctVal>=70?BRAND.amber:BRAND.red;
        return(
          <div key={mo} style={{background:isCurrent?"#EEF4FB":BRAND.white,border:`1.5px solid ${isCurrent?BRAND.accentMid:BRAND.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:hasData?8:0}}>
              <div style={{width:36,flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:800,color:isCurrent?BRAND.navy:BRAND.gray}}>{mo}</div>
                {isCurrent&&<div style={{fontSize:9,color:BRAND.accentMid,fontWeight:700}}>NOW</div>}
              </div>
              <div style={{flex:1,position:"relative"}}>
                <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:12,fontWeight:700,color:BRAND.accentMid}}>$</span>
                <input type="number" value={actuals[i]} placeholder={isFuture?"—":fmt(target).replace("$","")}
                  onChange={e=>{const n=[...actuals];n[i]=e.target.value;setActuals(n);}}
                  style={{width:"100%",boxSizing:"border-box",padding:"6px 6px 6px 20px",borderRadius:8,border:`1.5px solid ${isCurrent?BRAND.accentMid:BRAND.border}`,fontSize:13,fontWeight:700,color:BRAND.navy,background:isCurrent?"#EEF4FB":BRAND.offWhite,outline:"none"}}/>
              </div>
              <div style={{width:60,textAlign:"right",flexShrink:0}}>
                {hasData?(
                  <span style={{fontSize:13,fontWeight:800,color:barColor}}>{pct(pctVal)}</span>
                ):(
                  <span style={{fontSize:11,color:BRAND.gray}}>{fmtK(target)}</span>
                )}
              </div>
            </div>
            {hasData&&(
              <div style={{marginLeft:46}}>
                <div style={{background:BRAND.grayLight,borderRadius:4,height:6,overflow:"hidden"}}>
                  <div style={{width:`${Math.min(100,pctVal)}%`,height:"100%",borderRadius:4,background:barColor,transition:"width .3s ease"}}/>
                </div>
                {pctVal>=100&&<div style={{fontSize:10,color:BRAND.green,marginTop:3,fontWeight:700}}>+{fmt(actual-target)} over target</div>}
                {pctVal<100&&<div style={{fontSize:10,color:BRAND.red,marginTop:3}}>{fmt(target-actual)} short</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: SCENARIOS
// ══════════════════════════════════════════════════════════════════════════════
function Scenarios({employees,overhead,margin}){
  const [scenarios,setScenarios]=useState([
    {id:1,name:"Current",overhead:DEFAULT_OVERHEAD,margin:15,employees:[{id:1,name:"Brandon",type:"salary",amount:0,hours:40},{id:2,name:"Erik",type:"salary",amount:3500,hours:40},{id:3,name:"Matt",type:"salary",amount:0,hours:40}]},
    {id:2,name:"Stage 1 (All $4k)",overhead:DEFAULT_OVERHEAD,margin:15,employees:[{id:1,name:"Brandon",type:"salary",amount:4000,hours:40},{id:2,name:"Erik",type:"salary",amount:4000,hours:40},{id:3,name:"Matt",type:"salary",amount:4000,hours:40}]},
    {id:3,name:"Goal ($9k each)",overhead:DEFAULT_OVERHEAD,margin:15,employees:[{id:1,name:"Brandon",type:"salary",amount:9000,hours:40},{id:2,name:"Erik",type:"salary",amount:9000,hours:40},{id:3,name:"Matt",type:"salary",amount:6000,hours:40}]},
  ]);
  const [editing,setEditing]=useState(null);
  const [newName,setNewName]=useState("");

  function addScenario(){
    const id=Date.now();
    setScenarios(prev=>[...prev,{id,name:"New Scenario",overhead,margin,employees:employees.map(e=>({...e}))}]);
  }
  function removeScenario(id){setScenarios(prev=>prev.filter(s=>s.id!==id));}
  function updateName(id,name){setScenarios(prev=>prev.map(s=>s.id===id?{...s,name}:s));}

  const best=useMemo(()=>{
    let min=Infinity,idx=0;
    scenarios.forEach((s,i)=>{
      const{fixed}=calcFixed(s.employees,s.overhead);
      const rev=fixed/(1-s.margin/100);
      if(rev<min){min=rev;idx=i;}
    });
    return idx;
  },[scenarios]);

  return(
    <div>
      <div style={{fontSize:12,color:BRAND.gray,marginBottom:14,lineHeight:1.5}}>Compare different team sizes, overhead levels, and margin targets side by side. Snapshot of current settings is saved when you add a scenario.</div>

      {scenarios.map((sc,i)=>{
        const{gross,erTx,labor,fixed}=calcFixed(sc.employees,sc.overhead);
        const revenue=fixed/(1-sc.margin/100);
        const profit=revenue-fixed;
        const isBest=i===best&&scenarios.length>1;
        return(
          <div key={sc.id} style={{background:BRAND.white,border:`1.5px solid ${isBest?BRAND.green:BRAND.border}`,borderRadius:14,padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              {editing===sc.id?(
                <input autoFocus value={sc.name} onChange={e=>updateName(sc.id,e.target.value)}
                  onBlur={()=>setEditing(null)} onKeyDown={e=>e.key==="Enter"&&setEditing(null)}
                  style={{flex:1,fontSize:15,fontWeight:700,color:BRAND.navy,border:`1.5px solid ${BRAND.border}`,borderRadius:8,padding:"4px 8px",background:BRAND.offWhite,outline:"none"}}/>
              ):(
                <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:15,fontWeight:700,color:BRAND.navy}}>{sc.name}</span>
                  {isBest&&<Pill color={BRAND.green} bg={BRAND.greenLight}>Lowest overhead</Pill>}
                  <button onClick={()=>setEditing(sc.id)} style={{background:"none",border:"none",fontSize:12,color:BRAND.gray,cursor:"pointer"}}>✏️</button>
                </div>
              )}
              {scenarios.length>1&&<button onClick={()=>removeScenario(sc.id)} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",color:BRAND.gray}}>✕</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:10}}>
              {[
                {label:"Payroll",val:fmtK(gross)+"/mo",color:BRAND.navy},
                {label:"Overhead",val:fmtK(sc.overhead)+"/mo",color:BRAND.accentMid},
                {label:"Rev Needed",val:fmtK(revenue)+"/mo",color:BRAND.red},
                {label:"Monthly Profit",val:fmtK(profit),color:BRAND.green},
              ].map(r=>(
                <div key={r.label} style={{background:BRAND.offWhite,borderRadius:8,padding:"8px 10px"}}>
                  <div style={{fontSize:9,color:BRAND.gray,marginBottom:2}}>{r.label}</div>
                  <div style={{fontSize:14,fontWeight:800,color:r.color}}>{r.val}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <Pill color={BRAND.navy} bg={BRAND.accent}>{sc.employees.length} people</Pill>
              <Pill color={BRAND.green} bg={BRAND.greenLight}>{sc.margin}% margin</Pill>
              <Pill color={BRAND.navy} bg={BRAND.accent}>Annual {fmtK(revenue*12)}</Pill>
            </div>
          </div>
        );
      })}

      <button onClick={addScenario}
        style={{width:"100%",padding:"12px",borderRadius:10,border:`2px dashed ${BRAND.border}`,background:"transparent",fontSize:13,fontWeight:700,color:BRAND.accentMid,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        + Add Scenario (snapshot current settings)
      </button>

      {scenarios.length>1&&(
        <Card style={{marginTop:14}}>
          <SecTitle>Revenue Comparison</SecTitle>
          {scenarios.map(sc=>{
            const{fixed}=calcFixed(sc.employees,sc.overhead);
            const revenue=fixed/(1-sc.margin/100);
            const maxRev=Math.max(...scenarios.map(s=>{const f=calcFixed(s.employees,s.overhead).fixed;return f/(1-s.margin/100);}));
            return(
              <div key={sc.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{fontWeight:600,color:BRAND.navy}}>{sc.name}</span>
                  <span style={{color:BRAND.gray}}>{fmtK(revenue)}/mo</span>
                </div>
                <div style={{background:BRAND.grayLight,borderRadius:6,height:10,overflow:"hidden"}}>
                  <div style={{width:`${(revenue/maxRev)*100}%`,height:"100%",borderRadius:6,background:BRAND.navy,transition:"width .4s ease"}}/>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: SEASONAL
// ══════════════════════════════════════════════════════════════════════════════
function Seasonal({employees,overhead,margin}){
  const {fixed}=calcFixed(employees,overhead);
  const annualTarget=(fixed/(1-margin/100))*12;
  const currentMonth=new Date().getMonth();

  // Default seasonal multipliers for restoration (slow winter, busy summer/fall)
  const defaultMults=[0.6,0.65,0.8,0.9,1.0,1.1,1.2,1.3,1.25,1.1,0.85,0.65];
  const [mults,setMults]=useState(defaultMults);
  const [actuals,setActuals]=useState(Array(12).fill(""));

  const totalMult=mults.reduce((s,v)=>s+v,0);
  const monthlyTargets=mults.map(m=>(annualTarget/totalMult)*m);
  const totalPlanned=monthlyTargets.reduce((s,v)=>s+v,0);

  function setMult(i,v){const n=[...mults];n[i]=Math.max(0.1,Math.min(3,v));setMults(n);}

  const totalActual=actuals.reduce((s,v)=>s+(Number(v)||0),0);

  return(
    <div>
      <Card style={{background:`linear-gradient(135deg,${BRAND.navyDeep},${BRAND.navy})`,border:"none"}}>
        <div style={{fontSize:10,color:BRAND.accentMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Annual Revenue Plan</div>
        <div style={{fontSize:28,fontWeight:900,color:BRAND.white}}>{fmt(annualTarget)}</div>
        <div style={{fontSize:11,color:BRAND.accentMid,marginTop:3}}>distributed across seasons · logged {fmt(totalActual)}</div>
      </Card>

      <Card>
        <SecTitle>Seasonal Multipliers</SecTitle>
        <div style={{fontSize:11,color:BRAND.gray,marginBottom:12,lineHeight:1.5}}>Drag sliders to reflect your busy/slow seasons. 1.0 = average month. Higher = busier.</div>
        {MONTHS.map((mo,i)=>{
          const target=monthlyTargets[i];
          const actual=Number(actuals[i])||0;
          const hasActual=actuals[i]!=="";
          const isCurrent=i===currentMonth;
          return(
            <div key={mo} style={{marginBottom:14,paddingBottom:14,borderBottom:i<11?`1px solid ${BRAND.grayLight}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <div style={{width:32,flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:800,color:isCurrent?BRAND.navy:BRAND.gray}}>{mo}</div>
                  {isCurrent&&<div style={{fontSize:8,color:BRAND.accentMid,fontWeight:700}}>NOW</div>}
                </div>
                <input type="range" min={0.1} max={3} step={0.05} value={mults[i]}
                  onChange={e=>setMult(i,Number(e.target.value))}
                  style={{flex:1,accentColor:BRAND.navy}}/>
                <div style={{width:32,textAlign:"right",flexShrink:0}}>
                  <span style={{fontSize:12,fontWeight:700,color:BRAND.navy}}>{mults[i].toFixed(2)}x</span>
                </div>
              </div>
              <div style={{marginLeft:42,display:"flex",gap:8,alignItems:"center"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:BRAND.gray,marginBottom:2}}>Target: <strong style={{color:BRAND.navy}}>{fmt(target)}</strong></div>
                  <div style={{position:"relative"}}>
                    <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",fontSize:11,color:BRAND.accentMid}}>$</span>
                    <input type="number" value={actuals[i]} placeholder="Actual"
                      onChange={e=>{const n=[...actuals];n[i]=e.target.value;setActuals(n);}}
                      style={{width:"100%",boxSizing:"border-box",padding:"5px 5px 5px 18px",borderRadius:7,border:`1.5px solid ${isCurrent?BRAND.accentMid:BRAND.border}`,fontSize:12,fontWeight:700,color:BRAND.navy,background:isCurrent?"#EEF4FB":BRAND.offWhite,outline:"none"}}/>
                  </div>
                </div>
                {hasActual&&(
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:800,color:actual>=target?BRAND.green:BRAND.red}}>{pct((actual/target)*100)}</div>
                    <div style={{fontSize:9,color:actual>=target?BRAND.green:BRAND.red}}>{actual>=target?"+"+fmt(actual-target):"-"+fmt(target-actual)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      <Card style={{background:BRAND.offWhite}}>
        <SecTitle>Seasonal Summary</SecTitle>
        {[
          {label:"Busiest Month",val:MONTHS[mults.indexOf(Math.max(...mults))],sub:fmt(Math.max(...monthlyTargets))+" target"},
          {label:"Slowest Month",val:MONTHS[mults.indexOf(Math.min(...mults))],sub:fmt(Math.min(...monthlyTargets))+" target"},
          {label:"Q1 Target",val:fmt(monthlyTargets.slice(0,3).reduce((s,v)=>s+v,0)),sub:"Jan–Mar"},
          {label:"Q3 Target",val:fmt(monthlyTargets.slice(6,9).reduce((s,v)=>s+v,0)),sub:"Jul–Sep (peak)"},
        ].map(r=>(
          <StatRow key={r.label} label={r.label} sub={r.sub} value={r.val}/>
        ))}
        <StatRow label="YTD Actual" value={fmt(totalActual)} valueColor={totalActual>=totalPlanned?BRAND.green:BRAND.red} last/>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PER-JOB
// ══════════════════════════════════════════════════════════════════════════════
function PerJob({employees,overhead,margin}){
  const [customJob,setCustomJob]=useState(10000);
  const{labor,fixed}=calcFixed(employees,overhead);
  const revenue=fixed/(1-margin/100);
  const oPct=overhead/revenue,lPct=labor/revenue,prPct=margin/100;
  function jc(size){return{overhead:size*oPct,labor:size*lPct,profit:size*prPct,needed:Math.ceil(revenue/size)};}
  return(
    <div>
      <Card>
        <SecTitle>Custom Job Size</SecTitle>
        <div style={{position:"relative",marginBottom:14}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,fontWeight:700,color:BRAND.accentMid}}>$</span>
          <input type="number" value={customJob} onChange={e=>setCustomJob(Number(e.target.value))}
            style={{width:"100%",boxSizing:"border-box",padding:"9px 10px 9px 22px",borderRadius:8,border:`1.5px solid ${BRAND.border}`,fontSize:15,fontWeight:700,color:BRAND.navy,background:BRAND.offWhite,outline:"none"}}/>
        </div>
        {(()=>{const j=jc(customJob);return(
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              {[{label:"Overhead",val:j.overhead,color:BRAND.accentMid},{label:"Labor",val:j.labor,color:BRAND.navy},{label:"Profit",val:j.profit,color:BRAND.green}].map(r=>(
                <div key={r.label} style={{background:BRAND.offWhite,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                    <div style={{width:7,height:7,borderRadius:2,background:r.color}}/>
                    <span style={{fontSize:10,color:BRAND.gray}}>{r.label}</span>
                  </div>
                  <div style={{fontSize:16,fontWeight:900,color:r.color}}>{fmt(r.val)}</div>
                  <div style={{fontSize:10,color:BRAND.gray}}>{pct((r.val/customJob)*100)}</div>
                </div>
              ))}
            </div>
            <StackBar slices={[{label:"Overhead",pct:oPct*100,color:BRAND.accentMid},{label:"Labor",pct:lPct*100,color:BRAND.navy},{label:"Profit",pct:prPct*100,color:BRAND.green}]}/>
            <div style={{marginTop:12,background:BRAND.navyDeep,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
              <span style={{fontSize:12,color:BRAND.accentMid}}>Need </span>
              <span style={{fontSize:20,fontWeight:900,color:BRAND.white}}>{j.needed}</span>
              <span style={{fontSize:12,color:BRAND.accentMid}}> jobs like this per month</span>
            </div>
          </>
        );})()}
      </Card>
      <SecTitle>Standard Job Sizes</SecTitle>
      {JOB_SIZES.map(size=>{const j=jc(size);return(
        <Card key={size} style={{padding:"14px 16px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div><span style={{fontSize:17,fontWeight:800,color:BRAND.navy}}>{fmt(size)}</span><span style={{fontSize:11,color:BRAND.gray,marginLeft:8}}>job</span></div>
            <div style={{display:"flex",gap:6}}>
              <Pill color={BRAND.green} bg={BRAND.greenLight}>{fmt(j.profit)} profit</Pill>
              <Pill color={BRAND.navy} bg={BRAND.accent}>{j.needed}× /mo</Pill>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
            {[{label:"Overhead",val:j.overhead,color:BRAND.accentMid},{label:"Labor",val:j.labor,color:BRAND.navy},{label:"Profit",val:j.profit,color:BRAND.green}].map(r=>(
              <div key={r.label} style={{background:BRAND.offWhite,borderRadius:8,padding:"7px 8px"}}>
                <div style={{fontSize:9,color:BRAND.gray,marginBottom:2}}>{r.label}</div>
                <div style={{fontSize:13,fontWeight:800,color:r.color}}>{fmtK(r.val)}</div>
              </div>
            ))}
          </div>
        </Card>
      );})}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// TAB: DRAWS / CONSTRUCTION PAYROLL CALCULATOR

function Roadmap({margin}){
  const goalS=STAGES[STAGES.length-1];
  const goalTx=calcEmployeeTaxes(goalS.brandon*12).totalEmployer/12+calcEmployeeTaxes(goalS.erik*12).totalEmployer/12+calcEmployeeTaxes(goalS.matt*12).totalEmployer/12;
  const goalRev=(DEFAULT_OVERHEAD+goalS.brandon+goalS.erik+goalS.matt+goalTx)/(1-margin/100);
  return(
    <div>
      <Card style={{background:BRAND.navyDeep,border:"none",padding:"18px 18px 14px"}}>
        <div style={{fontSize:11,color:BRAND.accentMid,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>The Plan</div>
        <div style={{fontSize:16,fontWeight:800,color:BRAND.white,lineHeight:1.4}}>What revenue does S&H need at each salary milestone?</div>
        <div style={{fontSize:12,color:BRAND.accentMid,marginTop:6}}>At {margin}% profit margin</div>
      </Card>
      {STAGES.map((s,i)=>{
        const sal=s.brandon+s.erik+s.matt;
        const tx=calcEmployeeTaxes(s.brandon*12).totalEmployer/12+calcEmployeeTaxes(s.erik*12).totalEmployer/12+calcEmployeeTaxes(s.matt*12).totalEmployer/12;
        const fixed=DEFAULT_OVERHEAD+sal+tx,revenue=fixed/(1-margin/100),profit=revenue-fixed;
        const barWidth=(revenue/goalRev)*100,isCurrent=i===0,isGoal=i===STAGES.length-1;
        return(
          <div key={i} style={{background:isCurrent?"#EEF4FB":BRAND.white,border:`1.5px solid ${isCurrent?BRAND.accentMid:isGoal?BRAND.green:BRAND.border}`,borderRadius:14,padding:"16px 16px 14px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                  <span style={{fontSize:16,fontWeight:800,color:BRAND.navy}}>{s.label}</span>
                  {isCurrent&&<Pill color={BRAND.accentMid} bg="#D6E6F7">Where we are</Pill>}
                  {isGoal&&<Pill color={BRAND.green} bg={BRAND.greenLight}>Goal</Pill>}
                </div>
                <div style={{fontSize:11,color:BRAND.gray}}>B {fmtK(s.brandon)} · E {fmtK(s.erik)} · M {fmtK(s.matt)}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:22,fontWeight:900,color:isGoal?BRAND.green:BRAND.navy}}>{fmtK(revenue)}</div>
                <div style={{fontSize:10,color:BRAND.gray}}>/month needed</div>
              </div>
            </div>
            <div style={{background:BRAND.grayLight,borderRadius:6,height:8,marginBottom:10,overflow:"hidden"}}>
              <div style={{width:`${barWidth}%`,height:"100%",borderRadius:6,background:isGoal?BRAND.green:BRAND.navy,transition:"width .4s ease"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
              {[{label:"Salaries",val:sal,color:BRAND.navy},{label:"Emp Tax",val:tx,color:BRAND.amber},{label:"Fixed",val:fixed,color:BRAND.red},{label:"Profit",val:profit,color:BRAND.green}].map(r=>(
                <div key={r.label} style={{background:BRAND.offWhite,borderRadius:8,padding:"7px 8px"}}>
                  <div style={{fontSize:9,color:BRAND.gray,marginBottom:2}}>{r.label}</div>
                  <div style={{fontSize:12,fontWeight:800,color:r.color}}>{fmtK(r.val)}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Pill color={BRAND.red} bg={BRAND.redLight}>Fixed {fmtK(fixed)}/mo</Pill>
              <Pill color={BRAND.navy} bg={BRAND.accent}>Annual {fmtK(revenue*12)}</Pill>
              <Pill color={BRAND.green} bg={BRAND.greenLight}>{fmtK(profit*12)}/yr profit</Pill>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: PAYROLL REGISTER
// ══════════════════════════════════════════════════════════════════════════════
function PayrollRegister({ employees }) {
  const [period, setPeriod] = useState("monthly"); // monthly | biweekly | weekly

  const periodDivisor = period === "monthly" ? 1 : period === "biweekly" ? 2.167 : 4.333;
  const periodLabel   = period === "monthly" ? "Month" : period === "biweekly" ? "Bi-Weekly" : "Weekly";

  const totals = employees.reduce((acc, emp) => {
    const gross  = monthlyGross(emp);
    const taxes  = calcEmployeeTaxes(gross * 12);
    acc.gross       += gross;
    acc.fedIncome   += taxes.fedIncome   / 12;
    acc.ss          += taxes.socialSecurity / 12;
    acc.medicare    += taxes.medicare    / 12;
    acc.empTotal    += taxes.totalEmployee / 12;
    acc.takeHome    += taxes.netTakeHome / 12;
    acc.erSS        += taxes.employerSS  / 12;
    acc.erMed       += taxes.employerMed / 12;
    acc.futa        += taxes.futa        / 12;
    acc.suta        += taxes.suta        / 12;
    acc.erTotal     += taxes.totalEmployer / 12;
    acc.totalCost   += (gross * 12 + taxes.totalEmployer) / 12;
    return acc;
  }, { gross:0,fedIncome:0,ss:0,medicare:0,empTotal:0,takeHome:0,erSS:0,erMed:0,futa:0,suta:0,erTotal:0,totalCost:0 });

  function D(val) { return fmt(val / periodDivisor); }

  return (
    <div>
      {/* Period selector */}
      <Card>
        <SecTitle>Pay Period</SecTitle>
        <div style={{ display:"flex", gap:8 }}>
          {[["monthly","Monthly"],["biweekly","Bi-Weekly"],["weekly","Weekly"]].map(([val,lbl])=>(
            <button key={val} onClick={()=>setPeriod(val)} style={{
              flex:1, padding:"9px 4px", borderRadius:9, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
              background: period===val ? BRAND.navy : BRAND.offWhite,
              color: period===val ? BRAND.white : BRAND.gray,
            }}>{lbl}</button>
          ))}
        </div>
      </Card>

      {/* Summary banner */}
      <div style={{ background:`linear-gradient(135deg,${BRAND.navyDeep},${BRAND.navy})`, borderRadius:14, padding:"16px 18px", marginBottom:14 }}>
        <div style={{ fontSize:10, color:BRAND.accentMid, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
          {periodLabel} Payroll Summary — {employees.length} Employees
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { label:"Gross Payroll",    val:D(totals.gross),     color:BRAND.white  },
            { label:"Total Deductions", val:D(totals.empTotal),  color:"#FFB3B3"    },
            { label:"Net Take-Home",    val:D(totals.takeHome),  color:BRAND.accent },
          ].map(r=>(
            <div key={r.label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:9, color:BRAND.accentMid, marginBottom:3 }}>{r.label}</div>
              <div style={{ fontSize:16, fontWeight:900, color:r.color }}>{r.val}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:11, color:BRAND.accentMid }}>Total cost to S&H (incl. employer taxes)</div>
          <div style={{ fontSize:18, fontWeight:900, color:"#FFB3B3" }}>{D(totals.totalCost)}</div>
        </div>
      </div>

      {/* Per-employee cards */}
      {employees.map(emp => {
        const gross  = monthlyGross(emp);
        const taxes  = calcEmployeeTaxes(gross * 12);
        const totalCostToSH = (gross * 12 + taxes.totalEmployer) / 12;
        if (gross === 0 && !emp.name) return null;

        const rows_emp = [
          { label:"Federal Income Tax",    sub:"2024 brackets, single filer est.", val:taxes.fedIncome/12,       color:BRAND.red   },
          { label:"Social Security (EE)",  sub:"6.2% withheld from paycheck",      val:taxes.socialSecurity/12,  color:BRAND.amber },
          { label:"Medicare (EE)",         sub:"1.45% withheld",                   val:taxes.medicare/12,        color:BRAND.amber },
          { label:"WA State Income Tax",   sub:"Washington has no state income tax",val:0,                       color:BRAND.green },
        ];
        const rows_er = [
          { label:"Social Security (ER)",  sub:"6.2% employer match",              val:taxes.employerSS/12,      color:BRAND.amber },
          { label:"Medicare (ER)",         sub:"1.45% employer match",             val:taxes.employerMed/12,     color:BRAND.amber },
          { label:"FUTA",                  sub:"Fed unemployment, 0.6% on first $7k/yr", val:taxes.futa/12,     color:BRAND.amber },
          { label:"WA SUTA",               sub:"State unemployment, ~1% on first $67,600/yr", val:taxes.suta/12, color:BRAND.amber },
        ];

        return (
          <div key={emp.id} style={{ background:BRAND.white, border:`1.5px solid ${BRAND.border}`, borderRadius:14, marginBottom:14, overflow:"hidden" }}>
            {/* Employee header */}
            <div style={{ background:`linear-gradient(135deg,${BRAND.navyDeep},${BRAND.navy})`, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:BRAND.white }}>{emp.name || "Unnamed"}</div>
                <div style={{ fontSize:11, color:BRAND.accentMid, marginTop:1 }}>
                  {emp.type === "salary"
                    ? `Salary · ${fmt(gross)}/mo`
                    : `Hourly · $${emp.amount}/hr · ${emp.hours}hrs/wk`}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:BRAND.accentMid }}>Gross {periodLabel}</div>
                <div style={{ fontSize:18, fontWeight:900, color:BRAND.white }}>{D(gross)}</div>
              </div>
            </div>

            <div style={{ padding:"12px 16px" }}>
              {/* Employee deductions */}
              <div style={{ fontSize:11, fontWeight:800, color:BRAND.red, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                Withheld From Paycheck
              </div>
              <div style={{ background:BRAND.offWhite, borderRadius:10, padding:"4px 12px", marginBottom:12 }}>
                {rows_emp.map((r,i)=>(
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i<rows_emp.length-1 ? `1px solid ${BRAND.grayLight}` : "none" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:BRAND.navy }}>{r.label}</div>
                      <div style={{ fontSize:10, color:BRAND.gray }}>{r.sub}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color: r.val===0 ? BRAND.green : r.color }}>
                      {r.val === 0 ? "$0" : `-${D(r.val)}`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Net take-home highlight */}
              <div style={{ background:BRAND.greenLight, border:`1.5px solid #86C99A`, borderRadius:10, padding:"10px 14px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:BRAND.green }}>✓ Est. {periodLabel} Take-Home</div>
                  <div style={{ fontSize:10, color:BRAND.gray, marginTop:1 }}>After all deductions</div>
                </div>
                <div style={{ fontSize:22, fontWeight:900, color:BRAND.green }}>{D(taxes.netTakeHome/12)}</div>
              </div>

              {/* Employer side */}
              <div style={{ fontSize:11, fontWeight:800, color:BRAND.amber, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>
                S&H Pays On Top (Not Withheld)
              </div>
              <div style={{ background:BRAND.offWhite, borderRadius:10, padding:"4px 12px", marginBottom:12 }}>
                {rows_er.map((r,i)=>(
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i<rows_er.length-1 ? `1px solid ${BRAND.grayLight}` : "none" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:BRAND.navy }}>{r.label}</div>
                      <div style={{ fontSize:10, color:BRAND.gray }}>{r.sub}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:800, color:r.color }}>{D(r.val)}</div>
                  </div>
                ))}
              </div>

              {/* True total cost */}
              <div style={{ background:BRAND.redLight, border:`1.5px solid #E89C9C`, borderRadius:10, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:BRAND.red }}>Total Cost to S&H</div>
                  <div style={{ fontSize:10, color:BRAND.gray, marginTop:1 }}>Gross + all employer taxes</div>
                </div>
                <div style={{ fontSize:22, fontWeight:900, color:BRAND.red }}>{D(totalCostToSH)}</div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Team totals */}
      <Card style={{ background:BRAND.navyDeep, border:"none" }}>
        <div style={{ fontSize:11, color:BRAND.accentMid, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>
          {periodLabel} Team Totals
        </div>
        {[
          { label:"Gross Payroll",             val:totals.gross,    color:BRAND.white  },
          { label:"Federal Income Tax (all)",  val:totals.fedIncome,color:"#FFB3B3"   },
          { label:"Social Security (EE all)",  val:totals.ss,       color:"#FFB3B3"   },
          { label:"Medicare (EE all)",         val:totals.medicare, color:"#FFB3B3"   },
          { label:"Total Employee Deductions", val:totals.empTotal, color:"#FFB3B3"   },
          { label:"Total Net Take-Home",       val:totals.takeHome, color:BRAND.accent},
          { label:"Employer Taxes (SS+Med+FUTA+SUTA)", val:totals.erTotal, color:BRAND.amberLight },
          { label:"Total Cost to S&H",         val:totals.totalCost,color:"#FF8080"   },
        ].map((r,i,arr)=>(
          <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i<arr.length-1 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
            <div style={{ fontSize:12, color:BRAND.accentMid }}>{r.label}</div>
            <div style={{ fontSize:14, fontWeight:800, color:r.color }}>{D(r.val)}</div>
          </div>
        ))}
      </Card>

      {/* Remittance schedule */}
      <Card>
        <SecTitle>When To Remit</SecTitle>
        {[
          { who:"IRS (941)",         what:"Federal income tax + SS + Medicare (EE+ER)", when:"Semi-weekly or monthly deposit based on payroll size. Most small businesses: monthly, by the 15th of the following month.", color:BRAND.red },
          { who:"IRS (940)",         what:"FUTA — Federal Unemployment", when:"Quarterly if liability exceeds $500. Annual Form 940 due Jan 31.", color:BRAND.amber },
          { who:"WA L&I / ESD",      what:"WA SUTA — State Unemployment", when:"Quarterly. File online at esd.wa.gov. Due last day of the month after quarter ends.", color:BRAND.accentMid },
          { who:"WA Dept of Revenue",what:"No state income tax — no withholding required", when:"N/A — Washington has no personal income tax.", color:BRAND.green },
        ].map(r=>(
          <div key={r.who} style={{ marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${BRAND.grayLight}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:r.color, flexShrink:0 }}/>
              <div style={{ fontSize:13, fontWeight:800, color:BRAND.navy }}>{r.who}</div>
            </div>
            <div style={{ fontSize:12, color:BRAND.gray, marginBottom:3, paddingLeft:16 }}>{r.what}</div>
            <div style={{ fontSize:11, color:BRAND.accentMid, paddingLeft:16, lineHeight:1.5 }}>{r.when}</div>
          </div>
        ))}
        <div style={{ background:BRAND.amberLight, border:`1px solid #E8C97A`, borderRadius:10, padding:12 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#7A5500", marginBottom:3 }}>⚠️ Talk to a CPA or payroll service</div>
          <div style={{ fontSize:11, color:"#7A5500", lineHeight:1.5 }}>These are estimates for planning. Actual withholding depends on each employee's W-4. Services like Gusto or QuickBooks Payroll can automate all remittances for ~$40–80/mo.</div>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ══════════════════════════════════════════════════════════════════════════════
const ALL_TABS=[
  {id:"dashboard", label:"Home",     icon:"📊"},
  {id:"salaries",  label:"Team",     icon:"👥"},
  {id:"jobcost",   label:"Job Cost", icon:"💼"},
  {id:"quick",     label:"Quick",    icon:"⚡"},
  {id:"revenue",   label:"Revenue",  icon:"📈"},
  {id:"payroll",   label:"Payroll",  icon:"🧾"},
  {id:"scenarios", label:"Scenarios",icon:"🔀"},
  {id:"seasonal",  label:"Seasonal", icon:"📅"},
  {id:"perjob",    label:"Per Job",  icon:"🔨"},
  {id:"draws",     label:"Draws",    icon:"🏗️"},
  {id:"roadmap",   label:"Roadmap",  icon:"🗺️"},
];

const DEFAULT_EMPLOYEES=[
  {id:1,name:"Brandon",type:"salary",amount:0,   hours:40},
  {id:2,name:"Erik",   type:"salary",amount:3500,hours:40},
  {id:3,name:"Matt",   type:"salary",amount:0,   hours:40},
];

export default function App(){
  const [activeTab, setActiveTab]=useState("dashboard");
  const [employees, setEmployees]=useState(DEFAULT_EMPLOYEES);
  const [overhead,  setOverhead] =useState(DEFAULT_OVERHEAD);
  const [margin,    setMargin]   =useState(15);
  const [menuOpen,  setMenuOpen] =useState(false);
  const shared={employees,overhead,margin};

  // Bottom nav shows 5 tabs; rest in overflow menu
  const bottomTabs=ALL_TABS.slice(0,5);
  const moreTabs  =ALL_TABS.slice(5);

  return(
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:BRAND.offWhite,minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:70}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${BRAND.navyDeep} 0%,${BRAND.navy} 100%)`,padding:"18px 18px 14px",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontSize:10,fontWeight:800,color:BRAND.accentMid,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:2}}>S&H Services Spokane</div>
        <div style={{fontSize:18,fontWeight:900,color:BRAND.white}}>{ALL_TABS.find(t=>t.id===activeTab)?.icon} {ALL_TABS.find(t=>t.id===activeTab)?.label}</div>
      </div>

      {/* Content */}
      <div style={{padding:"16px 14px 20px"}}>
        {activeTab==="dashboard" &&<Dashboard  {...shared}/>}
        {activeTab==="salaries"  &&<Salaries   {...shared} setEmployees={setEmployees} setOverhead={setOverhead} setMargin={setMargin}/>}
        {activeTab==="jobcost"   &&<JobCost    {...shared}/>}
        {activeTab==="quick"     &&<QuickCheck {...shared}/>}
        {activeTab==="revenue"   &&<RevenueTracker {...shared}/>}
        {activeTab==="payroll"   &&<PayrollRegister employees={employees}/>}
        {activeTab==="scenarios" &&<Scenarios  {...shared}/>}
        {activeTab==="seasonal"  &&<Seasonal   {...shared}/>}
        {activeTab==="perjob"    &&<PerJob     {...shared}/>}
        {activeTab==="draws"     &&<DrawCalc/>}
        {activeTab==="roadmap"   &&<Roadmap    margin={margin}/>}
      </div>

      {/* More menu overlay */}
      {menuOpen&&(
        <div style={{position:"fixed",bottom:70,left:"50%",transform:"translateX(-50%)",width:"min(480px,100vw)",background:BRAND.white,border:`1px solid ${BRAND.border}`,borderRadius:"16px 16px 0 0",padding:"16px 14px",zIndex:200,boxShadow:"0 -4px 24px rgba(0,0,0,0.12)"}}>
          <div style={{fontSize:11,fontWeight:800,color:BRAND.gray,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>More Tools</div>
          {moreTabs.map(t=>(
            <button key={t.id} onClick={()=>{setActiveTab(t.id);setMenuOpen(false);}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,border:"none",background:activeTab===t.id?BRAND.offWhite:"transparent",cursor:"pointer",marginBottom:4}}>
              <span style={{fontSize:20}}>{t.icon}</span>
              <span style={{fontSize:14,fontWeight:activeTab===t.id?800:600,color:activeTab===t.id?BRAND.navy:BRAND.gray}}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
      {menuOpen&&<div onClick={()=>setMenuOpen(false)} style={{position:"fixed",inset:0,zIndex:150}}/>}

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"min(480px,100vw)",background:BRAND.white,borderTop:`1px solid ${BRAND.border}`,display:"flex",zIndex:100}}>
        {bottomTabs.map(t=>{
          const active=activeTab===t.id;
          return(
            <button key={t.id} onClick={()=>{setActiveTab(t.id);setMenuOpen(false);}}
              style={{flex:1,padding:"8px 2px",border:"none",cursor:"pointer",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:18}}>{t.icon}</span>
              <span style={{fontSize:9,fontWeight:active?800:500,color:active?BRAND.navy:BRAND.gray}}>{t.label}</span>
              {active&&<div style={{width:16,height:2,borderRadius:2,background:BRAND.navy,marginTop:1}}/>}
            </button>
          );
        })}
        <button onClick={()=>setMenuOpen(!menuOpen)}
          style={{flex:1,padding:"8px 2px",border:"none",cursor:"pointer",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontSize:18}}>•••</span>
          <span style={{fontSize:9,fontWeight:menuOpen?800:500,color:menuOpen?BRAND.navy:BRAND.gray}}>More</span>
          {menuOpen&&<div style={{width:16,height:2,borderRadius:2,background:BRAND.navy,marginTop:1}}/>}
        </button>
      </div>
    </div>
  );
}
