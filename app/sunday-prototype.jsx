"use client";
import { useEffect, useMemo, useState } from "react";

const seedUsers=[
  {name:"Chris Vieux",email:"cvieux@kannonmfg.com",role:"Administrator",status:"Active",last:"Today"},
  {name:"Demo Buyer",email:"buyer@kannonmfg.com",role:"Purchasing",status:"Active",last:"Yesterday"},
  {name:"Demo Manager",email:"manager@kannonmfg.com",role:"Viewer",status:"Pending",last:"Never"}
];

const MATERIAL_LINE_STATUSES=[
  "Not Ordered",
  "Quote Requested",
  "PO Issued",
  "Supplier Confirmed",
  "In Transit",
  "Partially Received",
  "Received",
  "Problem / Escalation"
];
const DEFAULT_MATERIAL_LINE_STATUS="Not Ordered";

const TABLE_COLUMNS=[
  {key:"work_order",label:"WO"},
  {key:"customer_po",label:"Customer PO"},
  {key:"customer",label:"Customer"},
  {key:"due_date",label:"Due Date"},
  {key:"part_number",label:"Part Number"},
  {key:"quantity",label:"Qty"},
  {key:"flats",label:"Flats"},
  {key:"shapes",label:"Shapes"},
  {key:"owner",label:"Owner"}
];

function todayYmd(){
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/Chicago",
    year:"numeric",
    month:"2-digit",
    day:"2-digit"
  }).format(new Date());
}

function daysUntilDue(dueDate){
  if(!dueDate)return null;
  const today=todayYmd();
  const a=new Date(`${today}T12:00:00`);
  const b=new Date(`${dueDate}T12:00:00`);
  return Math.ceil((b-a)/86400000);
}

function normalizeMaterialStatus(status,legacyHeaderStatus){
  if(status&&MATERIAL_LINE_STATUSES.includes(status))return status;
  const legacyMap={
    "Not ordered":"Not Ordered",
    "Quote requested":"Quote Requested",
    "PO issued":"PO Issued",
    "Supplier confirmed":"Supplier Confirmed",
    "In transit":"In Transit",
    "Partially received":"Partially Received",
    "Received":"Received",
    "Problem / escalation":"Problem / Escalation"
  };
  if(status&&legacyMap[status])return legacyMap[status];
  if(legacyHeaderStatus&&MATERIAL_LINE_STATUSES.includes(legacyHeaderStatus))return legacyHeaderStatus;
  if(legacyHeaderStatus&&legacyMap[legacyHeaderStatus])return legacyMap[legacyHeaderStatus];
  return DEFAULT_MATERIAL_LINE_STATUS;
}

function normalizeRow(r){
  if(Array.isArray(r.material_lines)){
    return {
      ...r,
      active:r.active!==false,
      production_status:r.production_status||"Need Material",
      customer_po:r.customer_po||"",
      material_lines:r.material_lines.map((line,i)=>({
        id:line.id||`line-${r.id}-${i+1}`,
        material_category:line.material_category==="Shapes"?"Shapes":"Flats",
        material_type:line.material_type||"",
        supplier:line.supplier||"",
        material_po:line.material_po||"",
        ead:line.ead||"",
        status:normalizeMaterialStatus(line.status,r.material_status),
        sort_order:line.sort_order??i
      }))
    };
  }
  const lines=[];
  if(r.material_needed||r.supplier||r.material_po||r.expected_arrival||r.material_status){
    lines.push({
      id:`legacy-${r.id}-1`,
      material_category:"Flats",
      material_type:r.material_needed||"",
      supplier:r.supplier||"",
      material_po:r.material_po||"",
      ead:r.expected_arrival||"",
      status:normalizeMaterialStatus(null,r.material_status),
      sort_order:0
    });
  }
  return {
    id:r.id,
    work_order:r.work_order,
    customer_po:r.customer_po||"",
    customer:r.customer,
    order_date:r.order_date||"",
    due_date:r.due_date,
    esd:r.esd||"",
    part_number:r.part_number,
    description:r.description,
    quantity:r.quantity,
    production_status:r.production_status||"Need Material",
    owner:r.owner,
    follow_up_notes:r.follow_up_notes||"",
    active:r.active!==false,
    material_lines:lines
  };
}

function materialLines(r){return Array.isArray(r.material_lines)?r.material_lines:[];}

function isActiveNeedMaterial(r){
  return r.active!==false&&r.production_status==="Need Material";
}

function isLateLine(line,today=todayYmd()){
  return Boolean(line.ead&&line.ead<today&&line.status!=="Received");
}

function hasLateLines(r){
  const today=todayYmd();
  return materialLines(r).some(l=>isLateLine(l,today));
}

function lateLineCount(r){
  const today=todayYmd();
  return materialLines(r).filter(l=>isLateLine(l,today)).length;
}

function categorySummary(r,category){
  const lines=materialLines(r).filter(l=>l.material_category===category);
  if(!lines.length)return"None";
  if(lines.every(l=>l.status==="Received"))return"Complete";
  const today=todayYmd();
  const late=lines.filter(l=>isLateLine(l,today)).length;
  if(late>0)return`${late} Late`;
  const open=lines.filter(l=>l.status!=="Received").length;
  return`${open} Open`;
}

function newMaterialLine(category){
  return{
    id:`line-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    material_category:category,
    material_type:"",
    supplier:"",
    material_po:"",
    ead:"",
    status:DEFAULT_MATERIAL_LINE_STATUS,
    sort_order:0
  };
}

function compareValues(a,b,key){
  if(key==="flats")return categorySummary(a,"Flats").localeCompare(categorySummary(b,"Flats"));
  if(key==="shapes")return categorySummary(a,"Shapes").localeCompare(categorySummary(b,"Shapes"));
  if(key==="quantity")return(Number(a.quantity)||0)-(Number(b.quantity)||0);
  const av=(a[key]??"").toString();
  const bv=(b[key]??"").toString();
  if(key==="due_date")return av.localeCompare(bv);
  return av.localeCompare(bv,undefined,{numeric:true,sensitivity:"base"});
}

export default function SundayPrototype(){
  const [signedIn,setSignedIn]=useState(false);
  const [page,setPage]=useState("dashboard");
  const [rows,setRows]=useState([]);
  const [loadingRows,setLoadingRows]=useState(true);
  const [savingEdit,setSavingEdit]=useState(false);
  const [users,setUsers]=useState(seedUsers);
  const [search,setSearch]=useState("");
  const [kpiFilter,setKpiFilter]=useState("all");
  const [sortKey,setSortKey]=useState("due_date");
  const [sortDir,setSortDir]=useState("asc");
  const [edit,setEdit]=useState(null);
  const [invite,setInvite]=useState(false);
  const [toast,setToast]=useState("");
  const [lastRefresh,setLastRefresh]=useState("Not loaded yet");

  const notify=msg=>{setToast(msg);setTimeout(()=>setToast(""),3200)};
  const saveUsers=next=>{setUsers(next);localStorage.setItem("kannonPrototypeUsers",JSON.stringify(next));};

  async function loadRowsFromApi({silent=false}={}){
    if(!silent)setLoadingRows(true);
    try{
      const res=await fetch("/api/needs-material",{cache:"no-store"});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Failed to load work orders");
      setRows((data.rows||[]).map(normalizeRow));
      setLastRefresh(new Date().toLocaleString("en-US",{timeZone:"America/Chicago",dateStyle:"long",timeStyle:"short"}));
      if(data.seeded)notify("Sample data seeded to Supabase once.");
      else if(!silent)notify("Loaded work orders from Supabase.");
      return true;
    }catch(error){
      console.error(error);
      notify(error.message||"Could not load Supabase data");
      return false;
    }finally{
      setLoadingRows(false);
    }
  }

  useEffect(()=>{
    try{
      const u=localStorage.getItem("kannonPrototypeUsers");
      if(u)setUsers(JSON.parse(u));
    }catch{}
    let cancelled=false;
    (async()=>{
      setLoadingRows(true);
      try{
        const res=await fetch("/api/needs-material",{cache:"no-store"});
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||"Failed to load work orders");
        if(cancelled)return;
        setRows((data.rows||[]).map(normalizeRow));
        setLastRefresh(new Date().toLocaleString("en-US",{timeZone:"America/Chicago",dateStyle:"long",timeStyle:"short"}));
        if(data.seeded)notify("Sample data seeded to Supabase once.");
      }catch(error){
        console.error(error);
        if(!cancelled)notify(error.message||"Could not load Supabase data");
      }finally{
        if(!cancelled)setLoadingRows(false);
      }
    })();
    return()=>{cancelled=true};
  },[]);

  async function saveWorkOrder(updated){
    setSavingEdit(true);
    try{
      const res=await fetch(`/api/needs-material/${updated.id}`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          owner:updated.owner,
          follow_up_notes:updated.follow_up_notes,
          material_lines:updated.material_lines||[]
        })
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Failed to save work order");
      const saved=normalizeRow(data.row);
      setRows(prev=>prev.map(r=>r.id===saved.id?saved:r));
      setEdit(null);
      notify(`${saved.work_order} saved to Supabase`);
    }catch(error){
      console.error(error);
      notify(error.message||"Save failed");
    }finally{
      setSavingEdit(false);
    }
  }

  const activeRows=useMemo(()=>rows.filter(isActiveNeedMaterial),[rows]);

  const kpis=useMemo(()=>{
    const openWo=activeRows.length;
    const overdueEad=activeRows.filter(hasLateLines).length;
    const dueThisWeek=activeRows.filter(r=>{
      const d=daysUntilDue(r.due_date);
      return d!==null&&d>=0&&d<=7;
    }).length;
    const waitingOnQuote=activeRows.filter(r=>materialLines(r).some(l=>l.status==="Quote Requested")).length;
    const lateSuppliers=activeRows.reduce((n,r)=>n+lateLineCount(r),0);
    return[
      {id:"all",label:"Open WO",value:openWo,hint:"Active Need Material orders"},
      {id:"overdue_ead",label:"Overdue EAD",value:overdueEad,hint:"Lines past EAD, not received"},
      {id:"due_this_week",label:"Due This Week",value:dueThisWeek,hint:"Due in the next 7 days"},
      {id:"waiting_quote",label:"Waiting on Quote",value:waitingOnQuote,hint:"Quote requested on a line"},
      {id:"late_suppliers",label:"Late Suppliers",value:lateSuppliers,hint:"Late material lines"}
    ];
  },[activeRows]);

  const visibleRows=useMemo(()=>{
    const q=search.trim().toLowerCase();
    let list=activeRows.filter(r=>{
      if(kpiFilter==="overdue_ead"||kpiFilter==="late_suppliers")return hasLateLines(r);
      if(kpiFilter==="due_this_week"){
        const d=daysUntilDue(r.due_date);
        return d!==null&&d>=0&&d<=7;
      }
      if(kpiFilter==="waiting_quote")return materialLines(r).some(l=>l.status==="Quote Requested");
      return true;
    });
    if(q){
      list=list.filter(r=>{
        const hay=[
          r.work_order,r.customer_po,r.customer,r.due_date,r.part_number,r.quantity,
          r.owner,r.follow_up_notes,categorySummary(r,"Flats"),categorySummary(r,"Shapes"),
          ...materialLines(r).flatMap(l=>[l.material_type,l.supplier,l.material_po,l.ead,l.status])
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted=[...list].sort((a,b)=>{
      const cmp=compareValues(a,b,sortKey);
      return sortDir==="asc"?cmp:-cmp;
    });
    return sorted;
  },[activeRows,search,kpiFilter,sortKey,sortDir]);

  const toggleSort=key=>{
    if(sortKey===key)setSortDir(d=>d==="asc"?"desc":"asc");
    else{setSortKey(key);setSortDir(key==="due_date"?"asc":"asc");}
  };

  if(!signedIn)return <Login onSignIn={()=>setSignedIn(true)}/>;

  return <div className="shell">
    <header className="topbar">
      <div className="brand">KANNON MFG</div>
      <nav className="nav">
        <button className={page==="dashboard"?"active":""} onClick={()=>setPage("dashboard")}>Dashboard</button>
        <button className={page==="admin"?"active":""} onClick={()=>setPage("admin")}>Administration</button>
      </nav>
      <div className="top-actions">
        <div className="avatar">CV</div>
        <div className="user-menu"><b>Chris Vieux</b><span>Administrator</span></div>
        <button className="btn top-signout" onClick={()=>setSignedIn(false)}>Sign out</button>
      </div>
    </header>
    <main className="content">
      {page==="dashboard"?
        <Dashboard
          kpis={kpis}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          search={search}
          setSearch={setSearch}
          visibleRows={visibleRows}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          lastRefresh={lastRefresh}
          loadingRows={loadingRows}
          refresh={()=>loadRowsFromApi()}
          onEdit={row=>setEdit(normalizeRow({...row,material_lines:(row.material_lines||[]).map(l=>({...l}))}))}
        />:
        <Admin
          users={users}
          onInvite={()=>setInvite(true)}
          onToggle={i=>{
            const n=[...users];
            n[i]={...n[i],status:n[i].status==="Disabled"?"Active":"Disabled"};
            saveUsers(n);
            notify(`${n[i].name} is now ${n[i].status}`);
          }}
          onRemove={i=>{
            if(users[i].email==="cvieux@kannonmfg.com")return notify("The primary administrator cannot be removed.");
            saveUsers(users.filter((_,x)=>x!==i));
            notify("User removed");
          }}
        />
      }
    </main>
    {edit&&<EditModal
      row={edit}
      saving={savingEdit}
      onClose={()=>!savingEdit&&setEdit(null)}
      onSave={saveWorkOrder}
    />}
    {invite&&<InviteModal
      onClose={()=>setInvite(false)}
      onSave={u=>{saveUsers([...users,u]);setInvite(false);notify(`Invitation queued for ${u.email}`);}}
    />}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function Login({onSignIn}){
  return <div className="login">
    <section className="login-hero">
      <div className="brand">KANNON MFG</div>
      <div className="hero-copy">
        <h1>Needs Material Dashboard</h1>
        <p>Purchasing Work Queue</p>
        <div className="hero-points">
          <div className="hero-point"><span className="check">✓</span>Uses Kannon Microsoft 365 identities</div>
          <div className="hero-point"><span className="check">✓</span>Refreshes from the SharePoint scheduler at 10:00 AM</div>
          <div className="hero-point"><span className="check">✓</span>Role-controlled access and audit history</div>
        </div>
      </div>
      <small>Baseline application — production credentials are not configured yet.</small>
    </section>
    <section className="login-panel">
      <div className="login-card">
        <div className="brand login-brand">KANNON MFG</div>
        <h2>Welcome back</h2>
        <p>Use your Kannon Microsoft account to access the Needs Material Dashboard.</p>
        <button className="ms-button" onClick={onSignIn}>
          <span className="ms-logo"><i/><i/><i/><i/></span>
          Sign in with Microsoft
        </button>
        <div className="demo-note"><b>Baseline mode:</b> This button signs you in locally as Chris Vieux, Administrator. Cursor will replace this authentication without changing the screen.</div>
      </div>
    </section>
  </div>;
}

function Dashboard({kpis,kpiFilter,setKpiFilter,search,setSearch,visibleRows,sortKey,sortDir,onSort,lastRefresh,loadingRows,refresh,onEdit}){
  return <section>
    <div className="page-head">
      <div>
        <h1>Needs Material Dashboard</h1>
        <p>Purchasing Work Queue</p>
        <div className="header-meta">
          <div className="refresh-note"><span className="dot"/>Last Refresh: {loadingRows?"Loading…":lastRefresh}</div>
          <div className="source-note">Source: Production Scheduler - 2026.xlsx</div>
        </div>
      </div>
      <div className="actions">
        <button className="btn" onClick={()=>window.print()}>Export</button>
        <button className="btn primary" onClick={refresh} disabled={loadingRows}>Refresh Now</button>
      </div>
    </div>

    <div className="filters filters-search">
      <input
        className="control"
        placeholder="Search WO, customer PO, customer, part, material, owner, or notes"
        value={search}
        onChange={e=>setSearch(e.target.value)}
      />
      {kpiFilter!=="all"&&(
        <button type="button" className="btn" onClick={()=>setKpiFilter("all")}>Clear KPI filter</button>
      )}
    </div>

    <div className="cards cards-5">
      {kpis.map(card=>(
        <button
          type="button"
          className={`card card-button${kpiFilter===card.id?" active":""}`}
          key={card.id}
          onClick={()=>setKpiFilter(prev=>prev===card.id?"all":card.id)}
        >
          <label>{card.label}</label>
          <strong>{card.value}</strong>
          <small>{card.hint}</small>
        </button>
      ))}
    </div>

    <div className="panel table-panel">
      <div className="panel-head">
        <h2>Active Needs Material</h2>
        <span>{visibleRows.length} records shown</span>
      </div>
      <div className="tablewrap tablewrap-scroll">
        <table className="table">
          <thead>
            <tr>
              {TABLE_COLUMNS.map(col=>(
                <th key={col.key}>
                  <button type="button" className="th-sort" onClick={()=>onSort(col.key)}>
                    {col.label}
                    <span className="sort-indicator">{sortKey===col.key?(sortDir==="asc"?"▲":"▼"):""}</span>
                  </button>
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loadingRows?<tr><td colSpan="10" className="empty">Loading work orders…</td></tr>:visibleRows.length?visibleRows.map(r=>(
              <tr key={r.id}>
                <td className="mono">{r.work_order}</td>
                <td className="mono">{r.customer_po||"—"}</td>
                <td>{r.customer}</td>
                <td>{r.due_date}</td>
                <td className="mono">{r.part_number}</td>
                <td>{r.quantity}</td>
                <td>{categorySummary(r,"Flats")}</td>
                <td>{categorySummary(r,"Shapes")}</td>
                <td>{r.owner}</td>
                <td><button className="btn" onClick={()=>onEdit(r)}>Edit</button></td>
              </tr>
            )):<tr><td colSpan="10" className="empty">No matching Need Material orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
}

function Admin({users,onInvite,onToggle,onRemove}){
  return <section>
    <div className="page-head">
      <div>
        <h1>Administration</h1>
        <p>Manage dashboard users and their access.</p>
      </div>
      <div className="actions"><button className="btn primary" onClick={onInvite}>Invite User</button></div>
    </div>
    <div className="admin-grid">
      <div className="panel table-panel">
        <div className="panel-head"><h2>Authorized Users</h2><span>{users.length} users</span></div>
        <div className="tablewrap">
          <table className="table users-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u,i)=>(
                <tr key={u.email}>
                  <td><b>{u.name}</b><br/><span className="muted">{u.email}</span></td>
                  <td><span className="role">{u.role}</span></td>
                  <td><span className={`status ${u.status==="Pending"?"pending":""}`}>{u.status}</span></td>
                  <td>{u.last}</td>
                  <td>
                    <button className="btn" onClick={()=>onToggle(i)}>{u.status==="Disabled"?"Enable":"Disable"}</button>{" "}
                    <button className="btn danger" onClick={()=>onRemove(i)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="side-card">
        <h3>How access works</h3>
        <ol>
          <li>You invite a Kannon employee.</li>
          <li>Their Microsoft 365 email is added to the allowlist.</li>
          <li>They sign in with Microsoft.</li>
          <li>The dashboard applies the role you assigned.</li>
        </ol>
      </aside>
    </div>
  </section>;
}

function EditModal({row,onClose,onSave,saving}){
  const [v,setV]=useState(()=>normalizeRow(row));
  const lines=materialLines(v);
  const flats=lines.filter(l=>l.material_category==="Flats");
  const shapes=lines.filter(l=>l.material_category==="Shapes");
  const updateLine=(id,patch)=>setV({...v,material_lines:lines.map(l=>l.id===id?{...l,...patch}:l)});
  const addLine=category=>setV({...v,material_lines:[...lines,newMaterialLine(category)]});
  const removeLine=id=>{
    if(!window.confirm("Remove this material line?"))return;
    setV({...v,material_lines:lines.filter(l=>l.id!==id)});
  };
  return <div className="modal-back">
    <div className="modal modal-wide">
      <div className="modal-head"><h2>Edit {row.work_order}</h2><button className="x" onClick={onClose} disabled={saving}>×</button></div>
      <div className="modal-body">
        <div className="field readonly-field">
          <label>Customer PO</label>
          <input value={v.customer_po||""} readOnly disabled/>
        </div>
        <div className="field">
          <label>Owner</label>
          <select value={v.owner} onChange={e=>setV({...v,owner:e.target.value})} disabled={saving}>
            <option>Chris Vieux</option>
            <option>Buyer 1</option>
            <option>Unassigned</option>
          </select>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={v.follow_up_notes} onChange={e=>setV({...v,follow_up_notes:e.target.value})} disabled={saving}/>
        </div>
        <MaterialSection title="Flats" lines={flats} onAdd={()=>addLine("Flats")} onChange={updateLine} onRemove={removeLine} disabled={saving}/>
        <MaterialSection title="Shapes" lines={shapes} onAdd={()=>addLine("Shapes")} onChange={updateLine} onRemove={removeLine} disabled={saving}/>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={()=>onSave(v)} disabled={saving}>{saving?"Saving…":"Save"}</button>
      </div>
    </div>
  </div>;
}

function MaterialSection({title,lines,onAdd,onChange,onRemove,disabled}){
  return <div className="material-section">
    <div className="material-section-head">
      <h3>{title}</h3>
      <button type="button" className="btn" onClick={onAdd} disabled={disabled}>+ Add {title} Material</button>
    </div>
    {lines.length===0?<p className="material-empty">No {title.toLowerCase()} material lines yet.</p>:
      lines.map(line=><div className="material-line" key={line.id}>
        <div className="material-line-grid">
          <Field label="Material Type" value={line.material_type} set={x=>onChange(line.id,{material_type:x})} disabled={disabled}/>
          <Field label="Supplier" value={line.supplier} set={x=>onChange(line.id,{supplier:x})} disabled={disabled}/>
          <Field label="Material PO" value={line.material_po} set={x=>onChange(line.id,{material_po:x})} disabled={disabled}/>
          <Field label="EAD" type="date" value={line.ead} set={x=>onChange(line.id,{ead:x})} disabled={disabled}/>
          <div className="field">
            <label>Status</label>
            <select value={line.status||DEFAULT_MATERIAL_LINE_STATUS} onChange={e=>onChange(line.id,{status:e.target.value})} disabled={disabled}>
              {MATERIAL_LINE_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="material-line-actions">
          <button type="button" className="btn danger" onClick={()=>onRemove(line.id)} disabled={disabled}>Remove</button>
        </div>
      </div>)}
  </div>;
}

function Field({label,value,set,type="text",disabled}){
  return <div className="field"><label>{label}</label><input type={type} value={value||""} onChange={e=>set(e.target.value)} disabled={disabled}/></div>;
}

function InviteModal({onClose,onSave}){
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [role,setRole]=useState("Purchasing");
  return <div className="modal-back">
    <div className="modal">
      <div className="modal-head"><h2>Invite User</h2><button className="x" onClick={onClose}>×</button></div>
      <div className="modal-body">
        <Field label="Name" value={name} set={setName}/>
        <Field label="Kannon Email" value={email} set={setEmail} type="email"/>
        <div className="field">
          <label>Role</label>
          <select value={role} onChange={e=>setRole(e.target.value)}>
            <option>Viewer</option>
            <option>Purchasing</option>
            <option>Scheduler</option>
            <option>Administrator</option>
          </select>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={()=>name&&email.includes("@")&&onSave({name,email,role,status:"Pending",last:"Never"})}>Send Invitation</button>
      </div>
    </div>
  </div>;
}
