// src/App.tsx — Kleios Client Portal v2
// Layout en cards, sans onglets, header de bienvenue
import { useState, useEffect, useRef } from "react";
import { usePortalAuth }  from "./hooks/usePortalAuth";
import { usePortalData }  from "./hooks/usePortalData";

function formatVal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} M€`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)} k€`;
  return `${n} €`;
}
function parseVal(s: string): number {
  const v = parseFloat((s ?? "0").replace(/[^0-9.,]/g, "").replace(",", "."));
  return isNaN(v) ? 0 : v;
}
function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function civility(p: any): string {
  return `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim();
}
function greeting(p: any): string {
  const name = civility(p);
  if (!name) return "";
  const genre = (p?.gender ?? p?.civilite ?? "").toLowerCase();
  const prefix = genre.includes("f") || genre.includes("mme") || genre.includes("madame")
    ? "Mme" : genre.includes("m") || genre.includes("mr") || genre.includes("monsieur")
    ? "M." : "";
  return prefix ? `${prefix} ${name}` : name;
}
const CONTRACT_LABELS: Record<string, string> = {
  av: "Assurance-vie", per: "PER", pea: "PEA", cto: "Compte-titres",
  scpi: "SCPI", capitalisation: "Capitalisation", prevoyance: "Prévoyance",
  sante: "Santé", iard: "IARD", emprunteur: "Emprunteur",
  retraite_collective: "Retraite collective", autre: "Autre",
};
const CONTRACT_COLORS: Record<string, string> = {
  av: "#2563EB", per: "#7C3AED", pea: "#059669", cto: "#D97706",
  scpi: "#DC2626", capitalisation: "#0891B2", prevoyance: "#EA580C",
  sante: "#16A34A", iard: "#9333EA", emprunteur: "#0D9488",
  retraite_collective: "#7C3AED", autre: "#6B7280",
};
const CAT_ICONS: Record<string, string> = {
  lettre_mission: "📄", rapport_patrimonial: "📊", contrat: "📋",
  der: "✅", kyc: "🪪", autre: "📁",
};
const CAT_LABELS: Record<string, string> = {
  lettre_mission: "Lettre de mission", rapport_patrimonial: "Rapport patrimonial",
  contrat: "Contrat", der: "DER / Adéquation", kyc: "KYC / Identité", autre: "Autre",
};
const INP: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: "10px 14px",
  fontSize: 14, fontFamily: "inherit", outline: "none", background: "#F8F9FB",
  width: "100%", boxSizing: "border-box",
};
const centeredBox: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center",
  justifyContent: "center", background: "#F0F2F5",
};

function ActivatePage({ token }: { token: string }) {
  const [step,     setStep]     = useState<"loading"|"form"|"done"|"error">("loading");
  const [invEmail, setInvEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [busy,     setBusy]     = useState(false);
  const EDGE = import.meta.env.VITE_SUPABASE_URL + "/functions/v1/portal-invite";
  useEffect(() => {
    fetch(EDGE, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"validate",token}) })
      .then(r=>r.json()).then(d=>{ if(d.valid){setInvEmail(d.email);setStep("form");}else{setError(d.error);setStep("error");} })
      .catch(()=>{setError("Erreur réseau");setStep("error");});
  },[token]);
  const handleActivate=async()=>{
    if(password.length<8){setError("Minimum 8 caractères");return;}
    if(password!==confirm){setError("Les mots de passe ne correspondent pas");return;}
    setBusy(true);setError("");
    try{const r=await fetch(EDGE,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"activate",token,password})});const d=await r.json();if(d.success)setStep("done");else throw new Error(d.error);}
    catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  if(step==="loading") return <div style={centeredBox}><p style={{color:"#8FAAB6"}}>Vérification...</p></div>;
  if(step==="error")   return <div style={centeredBox}><p style={{color:"#991B1B",textAlign:"center"}}>⚠ {error||"Invitation invalide ou expirée"}</p></div>;
  if(step==="done")    return (<div style={centeredBox}><div style={{textAlign:"center"}}><div style={{fontSize:48,marginBottom:16}}>✅</div><p style={{fontSize:18,fontWeight:700,color:"#0B3040",marginBottom:8}}>Compte activé !</p><a href="/" style={{padding:"12px 28px",background:"#0B3040",color:"#C9A84C",borderRadius:10,textDecoration:"none",fontWeight:700}}>Accéder à mon espace</a></div></div>);
  return (
    <div style={centeredBox}>
      <div style={{background:"#fff",borderRadius:16,padding:"40px 36px",width:420,boxShadow:"0 8px 40px rgba(0,0,0,0.10)"}}>
        <div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:24,fontWeight:700,color:"#0B3040"}}>Activez votre espace</div><div style={{fontSize:13,color:"#8FAAB6",marginTop:6}}>{invEmail}</div></div>
        {error&&<div style={{padding:"10px 14px",background:"#FEF2F2",color:"#991B1B",borderRadius:9,fontSize:13,marginBottom:14,border:"1px solid #FECACA"}}>{error}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={{fontSize:12,fontWeight:600,color:"#8FAAB6",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4,display:"block"}}>Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="8 caractères minimum" style={INP}/></div>
          <div><label style={{fontSize:12,fontWeight:600,color:"#8FAAB6",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4,display:"block"}}>Confirmer</label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" style={INP} onKeyDown={e=>e.key==="Enter"&&handleActivate()}/></div>
          <button onClick={handleActivate} disabled={busy} style={{padding:"12px",borderRadius:10,border:"none",marginTop:4,background:!busy?"#0B3040":"#D1D5DB",color:!busy?"#C9A84C":"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{busy?"Activation...":"Activer mon espace"}</button>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (e:string,p:string)=>Promise<void> }) {
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const handle=async()=>{if(!email||!password)return;setBusy(true);setError("");try{await onLogin(email,password);}catch(e:any){setError(e.message??"Identifiants incorrects");}finally{setBusy(false);}};
  return (
    <div style={{...centeredBox,background:"linear-gradient(135deg,#0B3040 0%,#144260 100%)"}}>
      <div style={{background:"#fff",borderRadius:20,padding:"48px 40px",width:420,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{textAlign:"center",marginBottom:32}}><div style={{fontSize:13,fontWeight:600,color:"#8FAAB6",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Espace client sécurisé</div><div style={{fontSize:26,fontWeight:800,color:"#0B3040"}}>Connexion</div></div>
        {error&&<div style={{padding:"10px 14px",background:"#FEF2F2",color:"#991B1B",borderRadius:9,fontSize:13,marginBottom:16,border:"1px solid #FECACA"}}>{error}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={{fontSize:12,fontWeight:600,color:"#8FAAB6",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4,display:"block"}}>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.fr" style={INP} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
          <div><label style={{fontSize:12,fontWeight:600,color:"#8FAAB6",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4,display:"block"}}>Mot de passe</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={INP} onKeyDown={e=>e.key==="Enter"&&handle()}/></div>
          <button onClick={handle} disabled={busy||!email||!password} style={{padding:"13px",borderRadius:10,border:"none",marginTop:4,background:(!busy&&email&&password)?"#0B3040":"#D1D5DB",color:(!busy&&email&&password)?"#C9A84C":"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{busy?"Connexion...":"Se connecter"}</button>
        </div>
      </div>
    </div>
  );
}

function Card({children,style}:{children:React.ReactNode;style?:React.CSSProperties}){
  return <div style={{background:"#fff",borderRadius:16,boxShadow:"0 2px 12px rgba(11,48,64,0.07)",overflow:"hidden",...style}}>{children}</div>;
}
function CardHeader({title,subtitle,icon,color,action}:{title:string;subtitle?:string;icon:string;color:string;action?:React.ReactNode}){
  return (
    <div style={{padding:"18px 22px",borderBottom:"1px solid rgba(11,48,64,0.06)",display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:40,height:40,borderRadius:12,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
      <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:"#0B3040"}}>{title}</div>{subtitle&&<div style={{fontSize:12,color:"#8FAAB6",marginTop:2}}>{subtitle}</div>}</div>
      {action}
    </div>
  );
}

export default function App() {
  const { authState, portalUser, signIn, signOut } = usePortalAuth();
  const { theme, summary, documents, contracts, messages, loading, sendMessage, downloadDocument } = usePortalData(portalUser);
  const [msgInput,setMsgInput]=useState("");
  const [sendBusy,setSendBusy]=useState(false);
  const msgEndRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{ msgEndRef.current?.scrollIntoView({behavior:"smooth"}); },[messages.length]);

  const activateToken = window.location.pathname==="/activate" ? new URLSearchParams(window.location.search).get("token") : null;
  if(activateToken) return <ActivatePage token={activateToken}/>;
  if(authState==="loading") return <div style={centeredBox}><p style={{color:"#8FAAB6"}}>Chargement...</p></div>;
  if(authState==="unauthenticated") return <LoginPage onLogin={signIn}/>;

  const navy=theme?.colorNavy??"#0B3040";
  const gold=theme?.colorGold??"#C9A84C";
  const cabinetName=theme?.cabinetName??"Votre cabinet";
  const advisorName=theme?.advisorName??cabinetName;
  const p1=summary?.person1;
  const p2=summary?.person2;
  const clientGreeting=p1?greeting(p1):portalUser?.user.email??"";
  const epargneCt=contracts.filter(c=>["av","per","pea","cto","scpi","capitalisation"].includes(c.type));
  const prevCt=contracts.filter(c=>["prevoyance","sante","iard","emprunteur"].includes(c.type));
  const encours=epargneCt.reduce((s,c)=>s+parseVal(c.currentValue),0);
  const caPrev=prevCt.reduce((s,c)=>s+parseVal(c.annualPremium),0);
  const unreadCount=messages.filter(m=>m.from_role==="cgp"&&!m.read_at).length;

  const handleSend=async()=>{if(!msgInput.trim())return;setSendBusy(true);try{await sendMessage(msgInput);setMsgInput("");}finally{setSendBusy(false);}};

  return (
    <div style={{minHeight:"100vh",background:"#F0F2F5",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>

      {/* Header */}
      <header style={{background:`linear-gradient(135deg,${navy} 0%,#144260 100%)`,boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
        <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px"}}>
          {/* Logo + déco */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {theme?.logoSrc
                ? <img src={theme.logoSrc} alt={cabinetName} style={{height:32,objectFit:"contain"}}/>
                : <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{cabinetName}</div>}
            </div>
            <button onClick={signOut} style={{padding:"6px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.20)",background:"transparent",color:"rgba(255,255,255,0.65)",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Déconnexion</button>
          </div>
          {/* Bienvenue */}
          <div style={{padding:"24px 0 20px"}}>
            <div style={{fontSize:12,color:`${gold}99`,fontWeight:600,letterSpacing:0.6,textTransform:"uppercase",marginBottom:6}}>{cabinetName}</div>
            <h1 style={{fontSize:28,fontWeight:800,color:"#fff",margin:0,lineHeight:1.2}}>Bienvenue, {clientGreeting} 👋</h1>
            <p style={{fontSize:14,color:"rgba(255,255,255,0.55)",marginTop:6,marginBottom:0}}>
              Votre espace client · suivi par <strong style={{color:"rgba(255,255,255,0.80)"}}>{advisorName}</strong>
            </p>
          </div>
          {/* KPIs rapides */}
          {!loading&&(encours>0||contracts.length>0)&&(
            <div style={{display:"flex",gap:24,paddingBottom:20,flexWrap:"wrap"}}>
              {encours>0&&(<div><div style={{fontSize:22,fontWeight:800,color:gold}}>{formatVal(encours)}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Encours épargne</div></div>)}
              {caPrev>0&&(<div style={{paddingLeft:20,borderLeft:"1px solid rgba(255,255,255,0.12)"}}><div style={{fontSize:22,fontWeight:800,color:"rgba(255,255,255,0.80)"}}>{formatVal(caPrev)}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>CA prévoyance</div></div>)}
              {contracts.length>0&&(<div style={{paddingLeft:20,borderLeft:"1px solid rgba(255,255,255,0.12)"}}><div style={{fontSize:22,fontWeight:800,color:"rgba(255,255,255,0.80)"}}>{contracts.length}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>Contrat{contracts.length>1?"s":""}</div></div>)}
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main style={{maxWidth:960,margin:"0 auto",padding:"24px 20px 48px"}}>
        {loading ? (
          <div style={{textAlign:"center",padding:"60px 0",color:"#8FAAB6",fontSize:14}}>Chargement de votre espace...</div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:16,alignItems:"start"}}>

            {/* Colonne gauche */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

            {/* Profil */}
            {summary&&(p1||p2)&&(
              <Card>
                <CardHeader title="Votre profil" icon="👤" color="#0B3040" subtitle="Informations enregistrées"/>
                <div style={{padding:"20px 22px"}}>
                  <div style={{display:"grid",gridTemplateColumns:p2?"1fr 1fr":"1fr",gap:20}}>
                    {[p1,p2].filter(Boolean).map((p,i)=>p&&(
                      <div key={i}>
                        {p2&&<div style={{fontSize:11,fontWeight:700,color:"#8FAAB6",textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Personne {i+1}</div>}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 20px"}}>
                          {[{l:"Nom complet",v:civility(p)||"—"},{l:"Naissance",v:p.birthDate?fmtDate(p.birthDate):"—"},{l:"CSP",v:p.csp||"—"},{l:"Ville",v:p.city||"—"}].map(({l,v})=>(
                            <div key={l}><div style={{fontSize:11,color:"#8FAAB6",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>{l}</div><div style={{fontSize:14,color:"#0B3040",fontWeight:500}}>{v}</div></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Contrats */}
            <Card>
              <CardHeader title="Mes contrats" icon="📋" color="#2563EB" subtitle={contracts.length>0?`${contracts.length} contrat${contracts.length>1?"s":""} actif${contracts.length>1?"s":""}`:"Aucun contrat"}/>
              <div style={{padding:"16px 22px"}}>
                {contracts.length===0?(
                  <div style={{textAlign:"center",padding:"24px 0",color:"#9CA3AF",fontSize:14}}>Aucun contrat enregistré pour le moment.</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {contracts.map(c=>{
                      const val=parseVal(c.currentValue);const prem=parseVal(c.annualPremium);const color=CONTRACT_COLORS[c.type]??"#6B7280";
                      return (
                        <div key={c.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#F8F9FB",borderRadius:12,borderLeft:`3px solid ${color}`}}>
                          <div style={{width:44,height:44,borderRadius:12,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:12,fontWeight:800,color}}>{(c.type??"").toUpperCase().slice(0,3)}</span></div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:15,fontWeight:600,color:"#0B3040",marginBottom:2}}>{c.productName||CONTRACT_LABELS[c.type]||c.type}</div>
                            <div style={{fontSize:12,color:"#8FAAB6"}}>{c.insurer&&`${c.insurer} · `}{CONTRACT_LABELS[c.type]??c.type}{c.subscriptionDate&&` · Depuis ${fmtDate(c.subscriptionDate)}`}</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            {val>0&&<div style={{fontSize:18,fontWeight:800,color}}>{formatVal(val)}</div>}
                            {prem>0&&<div style={{fontSize:11,color:"#8FAAB6"}}>{formatVal(prem)}/an</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader title="Mes documents" icon="📁" color="#7C3AED" subtitle={documents.length>0?`${documents.length} document${documents.length>1?"s":""} disponible${documents.length>1?"s":""}`:"Aucun document"}/>
              <div style={{padding:"16px 22px"}}>
                {documents.length===0?(
                  <div style={{textAlign:"center",padding:"24px 0",color:"#9CA3AF",fontSize:14}}>Aucun document partagé pour le moment.</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {documents.map(doc=>(
                      <div key={doc.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#F8F9FB",borderRadius:10}}>
                        <div style={{width:38,height:38,borderRadius:10,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{CAT_ICONS[doc.category]??"📄"}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:600,color:"#0B3040",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{doc.name}</div>
                          <div style={{fontSize:12,color:"#8FAAB6"}}>{CAT_LABELS[doc.category]??doc.category} · {fmtDate(doc.uploadedAt)}{doc.expiresAt&&` · Expire le ${fmtDate(doc.expiresAt)}`}</div>
                        </div>
                        <button onClick={()=>downloadDocument(doc)} style={{padding:"7px 14px",borderRadius:8,border:"1px solid rgba(11,48,64,0.15)",background:"#fff",fontSize:13,color:"#0B3040",cursor:"pointer",fontFamily:"inherit",fontWeight:600,flexShrink:0}}>⬇ Télécharger</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            </div>

            {/* Colonne droite */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

            {/* Messagerie */}
            <Card>
              <CardHeader title="Messagerie" icon="💬" color="#059669" subtitle={`Échangez avec ${advisorName}`}
                action={unreadCount>0?(<span style={{padding:"3px 10px",borderRadius:20,background:"#EF4444",color:"#fff",fontSize:12,fontWeight:700}}>{unreadCount} non lu{unreadCount>1?"s":""}</span>):undefined}/>
              <div style={{display:"flex",flexDirection:"column",height:320}}>
                <div style={{flex:1,overflowY:"auto",padding:"16px 22px 8px"}}>
                  {messages.length===0?(
                    <div style={{textAlign:"center",padding:"30px 0",color:"#9CA3AF",fontSize:14}}>Aucun message. N'hésitez pas à écrire à votre conseiller !</div>
                  ):messages.map(m=>{
                    const isClient=m.from_role==="client";
                    return (
                      <div key={m.id} style={{display:"flex",justifyContent:isClient?"flex-end":"flex-start",marginBottom:12}}>
                        {!isClient&&(<div style={{width:32,height:32,borderRadius:"50%",background:navy,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:gold,fontWeight:700,flexShrink:0,marginRight:8,alignSelf:"flex-end"}}>{advisorName.slice(0,2).toUpperCase()}</div>)}
                        <div style={{maxWidth:"72%",padding:"10px 14px",lineHeight:1.5,fontSize:14,borderRadius:isClient?"14px 14px 2px 14px":"14px 14px 14px 2px",background:isClient?navy:"#F0F2F5",color:isClient?"#fff":"#0B3040"}}>
                          {!isClient&&<div style={{fontSize:10,fontWeight:700,color:gold,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>{advisorName}</div>}
                          {m.body}
                          <div style={{fontSize:10,opacity:0.5,marginTop:4,textAlign:"right"}}>{new Date(m.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})} {new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={msgEndRef}/>
                </div>
                <div style={{borderTop:"1px solid rgba(11,48,64,0.07)",padding:"14px 22px",display:"flex",gap:10}}>
                  <input value={msgInput} onChange={e=>setMsgInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder={`Écrire à ${advisorName}...`} style={{...INP,flex:1}}/>
                  <button onClick={handleSend} disabled={sendBusy||!msgInput.trim()} style={{padding:"10px 22px",borderRadius:10,border:"none",background:(!sendBusy&&msgInput.trim())?navy:"#D1D5DB",color:(!sendBusy&&msgInput.trim())?gold:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>{sendBusy?"...":"Envoyer"}</button>
                </div>
              </div>
            </Card>

            {/* Questionnaires */}
            <Card>
              <CardHeader title="Questionnaires réglementaires" icon="📋" color="#D97706" subtitle="Documents à compléter"/>
              <div style={{padding:"16px 22px"}}>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {[{id:"kyc",title:"Connaissance client (KYC)",desc:"Vérification d'identité et obligations réglementaires",icon:"🪪",color:"#7C3AED",bg:"#F5F3FF"},{id:"mif2",title:"Profil investisseur (MIF2)",desc:"Questionnaire d'adéquation et de connaissance financière",icon:"📊",color:"#059669",bg:"#ECFDF5"}].map(q=>(
                    <div key={q.id} style={{background:q.bg,borderRadius:12,padding:"20px",border:`1px solid ${q.color}18`}}>
                      <div style={{width:48,height:48,borderRadius:12,background:`${q.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:12}}>{q.icon}</div>
                      <div style={{fontSize:15,fontWeight:700,color:"#0B3040",marginBottom:4}}>{q.title}</div>
                      <div style={{fontSize:12,color:"#8FAAB6",marginBottom:14,lineHeight:1.5}}>{q.desc}</div>
                      <div style={{fontSize:11,fontWeight:600,padding:"5px 12px",borderRadius:20,background:"#F3F4F6",color:"#9CA3AF",display:"inline-block"}}>Disponible prochainement</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{background:"#fff",borderTop:"1px solid rgba(11,48,64,0.06)",padding:"16px 20px",textAlign:"center"}}>
        <div style={{fontSize:12,color:"#9CA3AF"}}>{cabinetName} · Espace client sécurisé · <span style={{opacity:0.6}}>Propulsé par Kleios</span></div>
      </footer>
    </div>
  );
}
