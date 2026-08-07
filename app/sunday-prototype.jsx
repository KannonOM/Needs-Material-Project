"use client";
import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  canEditPurchasingFields,
  canManageUsers,
  canManualRefresh,
  displayRole,
  initialsFromName,
  normalizeRole
} from "../lib/auth/permissions";
import AppHeader from "../components/dashboard/AppHeader";
import MetricCard from "../components/dashboard/MetricCard";
import RefreshStatusPanel, { RUNNING_STEPS } from "../components/dashboard/RefreshStatusPanel";
import ActiveOrdersBar from "../components/dashboard/ActiveOrdersBar";
import SearchFilters from "../components/dashboard/SearchFilters";
import WorkOrderTable from "../components/dashboard/WorkOrderTable";
import RefreshHistoryPage from "../components/dashboard/RefreshHistoryPage";
import SessionLoading from "../components/dashboard/SessionLoading";
import SessionError from "../components/dashboard/SessionError";
import LoadError from "../components/dashboard/LoadError";
import Button from "../components/ui/Button";

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

function formatDurationMs(ms){
  if(ms==null||!Number.isFinite(ms)||ms<0)return null;
  if(ms<1000)return`${Math.round(ms)}ms`;
  const sec=Math.round(ms/1000);
  if(sec<60)return`${sec}s`;
  const m=Math.floor(sec/60);
  const s=sec%60;
  return`${m}m ${s}s`;
}

function mapRefreshStatus(status){
  const value=String(status||"").toLowerCase();
  if(value==="success"||value==="completed"||value==="ok")return"success";
  if(value==="failed"||value==="error")return"failed";
  return"idle";
}

function parseRefreshMeta(data){
  const stats=data.refreshStats||null;
  return{
    sourceFilename:data.sourceFilename||null,
    lastRefreshLabel:data.lastRefreshAt
      ? new Date(data.lastRefreshAt).toLocaleString("en-US",{timeZone:"America/Chicago",dateStyle:"long",timeStyle:"short"})
      :"Not loaded yet",
    status:data.lastRefreshStatus!=null?mapRefreshStatus(data.lastRefreshStatus):null,
    stats:stats?{
      inserted:stats.inserted,
      updated:stats.updated,
      archived:stats.archived,
      activeDashboardCount:stats.activeDashboardCount
    }:null,
    durationLabel:stats?formatDurationMs(stats.durationMs):null,
    errorMessage:stats?.errorMessage
      ? friendlyError(stats.errorMessage,"Refresh failed. Please try again.")
      :""
  };
}

function friendlyError(message,fallback="Something went wrong. Please try again."){
  if(!message)return fallback;
  const text=String(message).replace(/\s+/g," ").trim();
  if(!text)return fallback;
  if(/secret|token|password|api[_ -]?key|bearer |authorization|stack|supabase|ENOENT|ECONN/i.test(text)){
    return fallback;
  }
  return text.length>220?`${text.slice(0,217)}…`:text;
}

export default function SundayPrototype(){
  const {data:session,status:sessionStatus}=useSession();
  const signedIn=Boolean(session?.user?.email&&session?.user?.role);
  const role=normalizeRole(session?.user?.role);
  const canEdit=canEditPurchasingFields(role);
  const canAdmin=canManageUsers(role);
  const canRefresh=canManualRefresh(role);
  const userName=session?.user?.name||session?.user?.email||"";
  const userRoleLabel=displayRole(role);

  const [page,setPage]=useState("dashboard");
  const [rows,setRows]=useState([]);
  const [loadingRows,setLoadingRows]=useState(false);
  const [savingEdit,setSavingEdit]=useState(false);
  const [users,setUsers]=useState([]);
  const [loadingUsers,setLoadingUsers]=useState(false);
  const [search,setSearch]=useState("");
  const [kpiFilter,setKpiFilter]=useState("all");
  const [sortKey,setSortKey]=useState("due_date");
  const [sortDir,setSortDir]=useState("asc");
  const [edit,setEdit]=useState(null);
  const [invite,setInvite]=useState(false);
  const [toast,setToast]=useState("");
  const [lastRefresh,setLastRefresh]=useState("Not loaded yet");
  const [sourceFilename,setSourceFilename]=useState("Production Scheduler - 2026.xlsx");
  const [refreshing,setRefreshing]=useState(false);
  const [refreshStatus,setRefreshStatus]=useState("idle");
  const [refreshStats,setRefreshStats]=useState(null);
  const [refreshDurationLabel,setRefreshDurationLabel]=useState(null);
  const [refreshError,setRefreshError]=useState("");
  const [runningStepIndex,setRunningStepIndex]=useState(0);
  const [loadError,setLoadError]=useState("");
  const [sessionTimedOut,setSessionTimedOut]=useState(false);
  const [historyRows,setHistoryRows]=useState([]);
  const [loadingHistory,setLoadingHistory]=useState(false);
  const [historyError,setHistoryError]=useState("");

  const notify=msg=>{setToast(msg);setTimeout(()=>setToast(""),3200)};

  function formatRefreshTime(iso){
    if(!iso)return "Not loaded yet";
    return new Date(iso).toLocaleString("en-US",{timeZone:"America/Chicago",dateStyle:"long",timeStyle:"short"});
  }

  function applyParsedRefreshMeta(meta){
    if(meta.sourceFilename)setSourceFilename(meta.sourceFilename);
    setLastRefresh(meta.lastRefreshLabel);
    if(meta.status!=null)setRefreshStatus(meta.status);
    if(meta.stats){
      setRefreshStats(meta.stats);
      setRefreshDurationLabel(meta.durationLabel);
      setRefreshError(meta.errorMessage||"");
    }
  }

  async function loadRowsFromApi({silent=false}={}){
    if(!silent)setLoadingRows(true);
    if(!silent)setLoadError("");
    try{
      const res=await fetch("/api/needs-material",{cache:"no-store"});
      const data=await res.json();
      if(res.status===401){
        await signOut({callbackUrl:"/"});
        throw new Error("Session expired. Sign in again.");
      }
      if(!res.ok)throw new Error(data.error||"Failed to load work orders");
      setRows((data.rows||[]).map(normalizeRow));
      applyParsedRefreshMeta(parseRefreshMeta(data));
      setLoadError("");
      if(!silent)notify("Loaded work orders from Supabase.");
      return true;
    }catch(error){
      console.error(error);
      const message=friendlyError(error.message,"Could not load work orders");
      if(!silent)setLoadError(message);
      notify(message);
      return false;
    }finally{
      setLoadingRows(false);
    }
  }

  async function loadRefreshHistory(){
    setLoadingHistory(true);
    setHistoryError("");
    try{
      const res=await fetch("/api/refresh/history",{cache:"no-store"});
      const data=await res.json();
      if(res.status===401){
        await signOut({callbackUrl:"/"});
        throw new Error("Session expired. Sign in again.");
      }
      if(!res.ok)throw new Error(data.error||"Failed to load refresh history");
      setHistoryRows(data.rows||[]);
      return true;
    }catch(error){
      console.error(error);
      const message=friendlyError(error.message,"Could not load refresh history");
      setHistoryError(message);
      notify(message);
      return false;
    }finally{
      setLoadingHistory(false);
    }
  }

  async function refreshFromSharePoint(){
    if(refreshing)return;
    setRefreshing(true);
    setRefreshError("");
    setRunningStepIndex(0);
    const started=Date.now();
    setLoadingRows(true);
    try{
      const res=await fetch("/api/refresh",{method:"POST"});
      const data=await res.json();
      if(res.status===401){
        await signOut({callbackUrl:"/"});
        throw new Error("Session expired. Sign in again.");
      }
      if(!res.ok||!data.ok)throw new Error(data.error||"SharePoint refresh failed");
      if(data.sourceFilename)setSourceFilename(data.sourceFilename);
      if(data.lastRefreshAt)setLastRefresh(formatRefreshTime(data.lastRefreshAt));
      const stats=data.stats||{};
      setRefreshStats({
        inserted:stats.inserted??0,
        updated:stats.updated??0,
        archived:stats.archived??0,
        activeDashboardCount:stats.activeDashboardCount??null
      });
      setRefreshDurationLabel(formatDurationMs(Date.now()-started));
      setRefreshStatus("success");
      setRefreshError("");
      notify(`Refresh complete: ${stats.distinctWorkOrders??0} WO, ${stats.inserted??0} new, ${stats.updated??0} updated, ${stats.archived??0} archived`);
      await loadRowsFromApi({silent:true});
      if(page==="history")await loadRefreshHistory();
    }catch(error){
      console.error(error);
      const message=friendlyError(error.message,"SharePoint refresh failed");
      setRefreshStatus("failed");
      setRefreshError(message);
      setRefreshDurationLabel(formatDurationMs(Date.now()-started));
      notify(message);
      setLoadingRows(false);
    }finally{
      setRefreshing(false);
    }
  }

  useEffect(()=>{
    if(sessionStatus!=="loading"){
      setSessionTimedOut(false);
      return;
    }
    const timer=setTimeout(()=>setSessionTimedOut(true),5000);
    return()=>clearTimeout(timer);
  },[sessionStatus]);

  useEffect(()=>{
    if(!signedIn)return;
    let cancelled=false;
    (async()=>{
      setLoadingRows(true);
      setLoadError("");
      try{
        const res=await fetch("/api/needs-material",{cache:"no-store"});
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||"Failed to load work orders");
        if(cancelled)return;
        setRows((data.rows||[]).map(normalizeRow));
        const meta=parseRefreshMeta(data);
        if(meta.sourceFilename)setSourceFilename(meta.sourceFilename);
        setLastRefresh(meta.lastRefreshLabel);
        if(meta.status!=null)setRefreshStatus(meta.status);
        if(meta.stats){
          setRefreshStats(meta.stats);
          setRefreshDurationLabel(meta.durationLabel);
          setRefreshError(meta.errorMessage||"");
        }
        setLoadError("");
      }catch(error){
        console.error(error);
        if(!cancelled){
          const message=friendlyError(error.message,"Could not load work orders");
          setLoadError(message);
          notify(message);
        }
      }finally{
        if(!cancelled)setLoadingRows(false);
      }
    })();
    return()=>{cancelled=true};
  },[signedIn]);

  useEffect(()=>{
    if(!(signedIn&&page==="history"))return;
    let cancelled=false;
    (async()=>{
      setLoadingHistory(true);
      setHistoryError("");
      try{
        const res=await fetch("/api/refresh/history",{cache:"no-store"});
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||"Failed to load refresh history");
        if(!cancelled)setHistoryRows(data.rows||[]);
      }catch(error){
        console.error(error);
        if(!cancelled){
          const message=friendlyError(error.message,"Could not load refresh history");
          setHistoryError(message);
        }
      }finally{
        if(!cancelled)setLoadingHistory(false);
      }
    })();
    return()=>{cancelled=true};
  },[signedIn,page]);

  useEffect(()=>{
    if(!refreshing){
      setRunningStepIndex(0);
      return;
    }
    setRunningStepIndex(0);
    const id=setInterval(()=>{
      setRunningStepIndex(i=>Math.min(i+1,RUNNING_STEPS.length-1));
    },1400);
    return()=>clearInterval(id);
  },[refreshing]);

  useEffect(()=>{
    if(!(signedIn&&canAdmin&&page==="admin"))return;
    let cancelled=false;
    (async()=>{
      setLoadingUsers(true);
      try{
        const res=await fetch("/api/allowed-users",{cache:"no-store"});
        const data=await res.json();
        if(!res.ok)throw new Error(data.error||"Failed to load users");
        if(!cancelled)setUsers(data.users||[]);
      }catch(error){
        console.error(error);
        if(!cancelled)notify(error.message||"Could not load allowlist users");
      }finally{
        if(!cancelled)setLoadingUsers(false);
      }
    })();
    return()=>{cancelled=true};
  },[signedIn,canAdmin,page]);

  useEffect(()=>{
    if(!canAdmin&&page==="admin")setPage("dashboard");
  },[canAdmin,page]);

  async function saveWorkOrder(updated){
    if(!canEdit){
      notify("Your role is read-only.");
      return;
    }
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
      if(res.status===401){
        await signOut({callbackUrl:"/"});
        throw new Error("Session expired. Sign in again.");
      }
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

  async function inviteUser(payload){
    try{
      const res=await fetch("/api/allowed-users",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Invite failed");
      setUsers(prev=>[...prev,data.user].sort((a,b)=>a.name.localeCompare(b.name)));
      setInvite(false);
      notify(data.note||`Invitation queued for ${data.user.email}`);
    }catch(error){
      console.error(error);
      notify(error.message||"Invite failed");
    }
  }

  async function toggleUserStatus(user){
    const current=String(user.statusKey||user.status).toLowerCase();
    const nextStatus=current==="active"?"disabled":"active";
    try{
      const res=await fetch(`/api/allowed-users/${user.id}`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({status:nextStatus})
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Update failed");
      setUsers(prev=>prev.map(u=>u.id===data.user.id?data.user:u));
      notify(`${data.user.name} is now ${data.user.status}`);
    }catch(error){
      console.error(error);
      notify(error.message||"Update failed");
    }
  }

  async function removeUser(user){
    if(user.email==="cvieux@kannonmfg.com")return notify("The primary administrator cannot be removed.");
    try{
      const res=await fetch(`/api/allowed-users/${user.id}`,{method:"DELETE"});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Remove failed");
      setUsers(prev=>prev.filter(u=>u.id!==user.id));
      notify("User removed");
    }catch(error){
      console.error(error);
      notify(error.message||"Remove failed");
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

  if(sessionStatus==="loading"){
    if(sessionTimedOut){
      return <SessionError
        onRetry={()=>{setSessionTimedOut(false);window.location.reload();}}
        onSignIn={()=>signIn("microsoft-entra-id")}
      />;
    }
    return <SessionLoading/>;
  }

  if(!signedIn)return <Login onSignIn={()=>signIn("microsoft-entra-id")}/>;

  const panelActiveCount=
    refreshStats?.activeDashboardCount!=null
      ? refreshStats.activeDashboardCount
      : activeRows.length;

  return <div className="shell">
    <AppHeader
      page={page}
      setPage={setPage}
      canAdmin={canAdmin}
      userName={userName}
      userRoleLabel={userRoleLabel}
      initials={initialsFromName(userName)}
      onSignOut={()=>signOut({callbackUrl:"/"})}
      onRefreshHistory={()=>setPage("history")}
    />
    <main className="content">
      {page==="dashboard"&&(
        loadError&&!rows.length&&!loadingRows?
          <LoadError
            title="Could not load work orders"
            message={loadError}
            onRetry={()=>loadRowsFromApi()}
          />:
          <Dashboard
            kpis={kpis}
            kpiFilter={kpiFilter}
            setKpiFilter={setKpiFilter}
            search={search}
            setSearch={setSearch}
            visibleRows={visibleRows}
            activeCount={activeRows.length}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            lastRefresh={lastRefresh}
            sourceFilename={sourceFilename}
            loadingRows={loadingRows||refreshing}
            refreshing={refreshing}
            refreshStatus={refreshStatus}
            refreshStats={refreshStats}
            refreshDurationLabel={refreshDurationLabel}
            refreshError={refreshError}
            runningStepIndex={runningStepIndex}
            panelActiveCount={panelActiveCount}
            loadError={loadError}
            onRetryLoad={()=>loadRowsFromApi()}
            canEdit={canEdit}
            canRefresh={canRefresh}
            refresh={refreshFromSharePoint}
            onEdit={row=>setEdit(normalizeRow({...row,material_lines:(row.material_lines||[]).map(l=>({...l}))}))}
          />
      )}
      {page==="history"&&(
        <RefreshHistoryPage
          rows={historyRows}
          loading={loadingHistory}
          error={historyError}
          onRetry={loadRefreshHistory}
          onBack={()=>setPage("dashboard")}
        />
      )}
      {page==="admin"&&(
        <Admin
          users={users}
          loading={loadingUsers}
          onInvite={()=>setInvite(true)}
          onToggle={toggleUserStatus}
          onRemove={removeUser}
        />
      )}
    </main>
    {edit&&<EditModal
      row={edit}
      saving={savingEdit}
      readOnly={!canEdit}
      onClose={()=>!savingEdit&&setEdit(null)}
      onSave={saveWorkOrder}
    />}
    {invite&&canAdmin&&<InviteModal
      onClose={()=>setInvite(false)}
      onSave={inviteUser}
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
      <small>Sign in with your Kannon Microsoft 365 account. Access requires an active allowlist entry.</small>
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
        <div className="demo-note"><b>Microsoft 365:</b> After Entra sign-in, access is granted only when your email is Active in the dashboard allowlist.</div>
      </div>
    </section>
  </div>;
}

function Dashboard({
  kpis,
  kpiFilter,
  setKpiFilter,
  search,
  setSearch,
  visibleRows,
  activeCount,
  sortKey,
  sortDir,
  onSort,
  lastRefresh,
  sourceFilename,
  loadingRows,
  refreshing,
  refreshStatus,
  refreshStats,
  refreshDurationLabel,
  refreshError,
  runningStepIndex,
  panelActiveCount,
  loadError,
  onRetryLoad,
  refresh,
  onEdit,
  canEdit,
  canRefresh
}){
  return <section className="dashboard-stack">
    {loadError&&(
      <LoadError
        title="Dashboard data may be out of date"
        message={loadError}
        onRetry={onRetryLoad}
      />
    )}

    <div className="metric-cards">
      {kpis.map(card=>(
        <MetricCard
          key={card.id}
          label={card.label}
          value={loadingRows&&!refreshing?"…":card.value}
          hint={card.hint}
          active={kpiFilter===card.id}
          onClick={()=>setKpiFilter(prev=>prev===card.id?"all":card.id)}
        />
      ))}
    </div>

    <RefreshStatusPanel
      status={refreshStatus}
      sourceFilename={sourceFilename}
      lastRefresh={loadingRows&&!refreshing?"Loading…":lastRefresh}
      activeCount={panelActiveCount}
      stats={refreshStats}
      durationLabel={refreshDurationLabel}
      errorMessage={refreshError}
      canRefresh={canRefresh}
      refreshing={refreshing}
      runningStepIndex={runningStepIndex}
      onRefresh={refresh}
    />

    <ActiveOrdersBar count={activeCount} />

    <SearchFilters
      search={search}
      setSearch={setSearch}
      kpiFilter={kpiFilter}
      setKpiFilter={setKpiFilter}
    />

    <WorkOrderTable
      columns={TABLE_COLUMNS}
      visibleRows={visibleRows}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      loadingRows={loadingRows}
      canEdit={canEdit}
      onEdit={onEdit}
      categorySummary={categorySummary}
    />
  </section>;
}

function Admin({users,loading,onInvite,onToggle,onRemove}){
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
        <div className="panel-head"><h2>Authorized Users</h2><span>{loading?"Loading…":`${users.length} users`}</span></div>
        <div className="tablewrap">
          <table className="table users-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {loading?<tr><td colSpan="5" className="empty">Loading allowlist…</td></tr>:users.map(u=>(
                <tr key={u.id||u.email}>
                  <td><b>{u.name}</b><br/><span className="muted">{u.email}</span></td>
                  <td><span className="role">{u.role}</span></td>
                  <td><span className={`status ${u.status==="Pending"?"pending":""}`}>{u.status}</span></td>
                  <td>{u.last}</td>
                  <td>
                    <button className="btn" onClick={()=>onToggle(u)}>{String(u.status).toLowerCase()==="disabled"?"Enable":"Disable"}</button>{" "}
                    <button className="btn danger" onClick={()=>onRemove(u)}>Remove</button>
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

function EditModal({row,onClose,onSave,saving,readOnly=false}){
  const [v,setV]=useState(()=>normalizeRow(row));
  const lines=materialLines(v);
  const flats=lines.filter(l=>l.material_category==="Flats");
  const shapes=lines.filter(l=>l.material_category==="Shapes");
  const locked=saving||readOnly;
  const updateLine=(id,patch)=>{if(readOnly)return;setV({...v,material_lines:lines.map(l=>l.id===id?{...l,...patch}:l)});};
  const addLine=category=>{if(readOnly)return;setV({...v,material_lines:[...lines,newMaterialLine(category)]});};
  const removeLine=id=>{
    if(readOnly)return;
    if(!window.confirm("Remove this material line?"))return;
    setV({...v,material_lines:lines.filter(l=>l.id!==id)});
  };
  return <div className="modal-back">
    <div className="modal modal-wide">
      <div className="modal-head">
        <div>
          <h2>{readOnly?"View":"Edit"} {row.work_order}</h2>
          <p className="modal-subtitle">{row.customer||"Work order details"}</p>
        </div>
        <button className="x" onClick={onClose} disabled={saving} aria-label="Close">×</button>
      </div>
      <div className="modal-body">
        <div className="edit-grid">
          <div className="field readonly-field">
            <label>Customer PO</label>
            <input value={v.customer_po||""} readOnly disabled/>
          </div>
          <div className="field">
            <label>Owner</label>
            <select value={v.owner} onChange={e=>setV({...v,owner:e.target.value})} disabled={locked}>
              <option>Chris Vieux</option>
              <option>Buyer 1</option>
              <option>Unassigned</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={v.follow_up_notes} onChange={e=>setV({...v,follow_up_notes:e.target.value})} disabled={locked} placeholder={readOnly?"":"Follow-up notes for purchasing"}/>
        </div>
        <MaterialSection title="Flats" lines={flats} onAdd={()=>addLine("Flats")} onChange={updateLine} onRemove={removeLine} disabled={locked} readOnly={readOnly}/>
        <MaterialSection title="Shapes" lines={shapes} onAdd={()=>addLine("Shapes")} onChange={updateLine} onRemove={removeLine} disabled={locked} readOnly={readOnly}/>
      </div>
      <div className="modal-foot">
        <Button onClick={onClose} disabled={saving}>{readOnly?"Close":"Cancel"}</Button>
        {!readOnly&&<Button variant="primary" onClick={()=>onSave(v)} disabled={saving}>{saving?"Saving…":"Save changes"}</Button>}
      </div>
    </div>
  </div>;
}

function MaterialSection({title,lines,onAdd,onChange,onRemove,disabled,readOnly=false}){
  return <div className="material-section">
    <div className="material-section-head">
      <h3>{title}</h3>
      {!readOnly&&<Button type="button" onClick={onAdd} disabled={disabled}>+ Add {title} Material</Button>}
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
        {!readOnly&&<div className="material-line-actions">
          <Button type="button" variant="danger" onClick={()=>onRemove(line.id)} disabled={disabled}>Remove</Button>
        </div>}
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
  const [saving,setSaving]=useState(false);
  async function submit(){
    if(!name||!email.includes("@")||saving)return;
    setSaving(true);
    try{
      await onSave({name,email,role});
    }finally{
      setSaving(false);
    }
  }
  return <div className="modal-back">
    <div className="modal">
      <div className="modal-head"><h2>Invite User</h2><button className="x" onClick={onClose} disabled={saving}>×</button></div>
      <div className="modal-body">
        <Field label="Name" value={name} set={setName} disabled={saving}/>
        <Field label="Kannon Email" value={email} set={setEmail} type="email" disabled={saving}/>
        <div className="field">
          <label>Role</label>
          <select value={role} onChange={e=>setRole(e.target.value)} disabled={saving}>
            <option>Viewer</option>
            <option>Purchasing</option>
            <option>Scheduler</option>
            <option>Administrator</option>
          </select>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving}>{saving?"Saving…":"Send Invitation"}</button>
      </div>
    </div>
  </div>;
}
