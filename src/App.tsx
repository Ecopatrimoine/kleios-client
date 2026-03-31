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
  livret: "Livret", cel: "CEL", pel: "PEL",
};
const CONTRACT_COLORS: Record<string, string> = {
  av: "#2563EB", per: "#7C3AED", pea: "#059669", cto: "#D97706",
  scpi: "#DC2626", capitalisation: "#0891B2", prevoyance: "#EA580C",
  sante: "#16A34A", iard: "#9333EA", emprunteur: "#0D9488",
  retraite_collective: "#7C3AED", livret: "#0891B2", cel: "#0891B2", pel: "#0891B2", autre: "#6B7280",
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
  const { theme, summary, documents, contracts, messages, loading, sendMessage, downloadDocument, uploadDocument, submitQuestionnaire } = usePortalData(portalUser);
  const [msgInput,setMsgInput]=useState("");
  const [sendBusy,setSendBusy]=useState(false);
  const msgEndRef=useRef<HTMLDivElement>(null);

  // ── Upload document ──────────────────────────────────────────────────────
  const [showUpload,setShowUpload]=useState(false);
  const [uploadFile,setUploadFile]=useState<File|null>(null);
  const [uploadName,setUploadName]=useState("");
  const [uploadCat,setUploadCat]=useState("autre");
  const [uploadNotes,setUploadNotes]=useState("");
  const [uploading,setUploading]=useState(false);
  const [uploadErr,setUploadErr]=useState<string|null>(null);
  const uploadRef=useRef<HTMLInputElement>(null);

  const handleUpload=async()=>{
    if(!uploadFile)return;
    setUploading(true);setUploadErr(null);
    try{
      await uploadDocument(uploadFile,{category:uploadCat,name:uploadName||uploadFile.name,notes:uploadNotes});
      setShowUpload(false);setUploadFile(null);setUploadName("");setUploadCat("autre");setUploadNotes("");
    }catch(e:any){setUploadErr(e.message??"Erreur upload");}
    setUploading(false);
  };

  // ── Questionnaires ───────────────────────────────────────────────────────
  const [activeQ,setActiveQ]=useState<"kyc"|"mif2"|null>(null);
  const [qSaving,setQSaving]=useState(false);
  const [qDone,setQDone]=useState<"kyc"|"mif2"|null>(null);

  // KYC state
  const [kyc,setKyc]=useState({idType:"",idNumber:"",idExpiry:"",isPPE:false,isFATCA:false,isResidentFiscalUS:false,originFunds:""});
  // MIF2 state
  const [mif2,setMif2]=useState({
    attitude:0 as 0|8|12|18, reactionBaisse:0 as 0|6|12|18,
    connaitFondsEuros:false,investiFondsEuros:false,
    connaitActions:false,investiActions:false,
    connaitOPCVM:false,investiOPCVM:false,
    connaitImmo:false,investiImmo:false,
    connaitTrackers:false,investiTrackers:false,
    connaitStructures:false,investiStructures:false,
    aSubiPertes:false,ampleurPertes:"" as ""|-5|-10|-20|-99,reactionPertes:0 as 0|1|2|3,
    aRealiseGains:false,ampleurGains:"" as ""|5|10|20|99,reactionGains:0 as 0|1|2|3,
    modeGestion:"" as ""|"pilote"|"libre",
    savoirUCRisque:false,savoirHorizonUC:false,savoirRisqueRendement:false,
    horizon:"" as ""|"0-4"|"5-8"|"9-15"|"15+",
  });

  const handleSubmitQ=async(type:"kyc"|"mif2")=>{
    setQSaving(true);
    try{
      await submitQuestionnaire(type, type==="kyc" ? kyc : {...mif2,completedDate:new Date().toISOString().slice(0,10)});
      setQDone(type);setActiveQ(null);
    }catch(e:any){alert("Erreur : "+(e.message??"Veuillez réessayer."));}
    setQSaving(false);
  };

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
      <header style={{background:`linear-gradient(160deg,${navy} 0%,#0d3d5c 50%,#144260 100%)`,position:"relative",overflow:"hidden"}}>
        {/* Formes géométriques décoratives */}
        <div style={{position:"absolute",top:-60,right:-60,width:300,height:300,borderRadius:"50%",background:`rgba(255,255,255,0.03)`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-80,right:120,width:200,height:200,borderRadius:"50%",background:`${gold}08`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:20,left:"40%",width:1,height:"80%",background:"rgba(255,255,255,0.04)",pointerEvents:"none"}}/>

        <div style={{maxWidth:960,margin:"0 auto",padding:"0 20px",position:"relative",zIndex:1}}>

          {/* Barre top : déconnexion */}
          <div style={{display:"flex",justifyContent:"flex-end",padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <button onClick={signOut} style={{padding:"5px 12px",borderRadius:20,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.50)",fontSize:11,cursor:"pointer",fontFamily:"inherit",letterSpacing:0.3}}>
              Déconnexion
            </button>
          </div>

          {/* Zone principale du header */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,padding:"28px 0 24px",alignItems:"center"}}>

            {/* Gauche : Logo + bienvenue */}
            <div>
              {/* Logo cabinet */}
              {theme?.logoSrc ? (
                <div style={{marginBottom:20,display:"inline-block",background:"rgba(255,255,255,0.95)",borderRadius:12,padding:"8px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.15)"}}>
                  <img src={theme.logoSrc} alt={cabinetName}
                    style={{maxHeight:48,maxWidth:200,objectFit:"contain",display:"block"}}/>
                </div>
              ) : (
                <div style={{marginBottom:20,display:"inline-flex",alignItems:"center",gap:10,padding:"10px 16px",borderRadius:12,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)"}}>
                  <div style={{width:36,height:36,borderRadius:9,background:gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:navy}}>
                    {cabinetName.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{cabinetName}</div>
                </div>
              )}

              {/* Bienvenue */}
              <div style={{fontSize:11,color:`${gold}CC`,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>
                Votre espace client
              </div>
              <h1 style={{fontSize:30,fontWeight:800,color:"#fff",margin:"0 0 8px",lineHeight:1.15}}>
                Bienvenue,<br/>{clientGreeting} 👋
              </h1>
              <p style={{fontSize:13,color:"rgba(255,255,255,0.45)",margin:0,lineHeight:1.5}}>
                Suivi par <span style={{color:"rgba(255,255,255,0.75)",fontWeight:600}}>{advisorName}</span>
                {summary?.coupleStatus && (
                  <span style={{marginLeft:8,padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,0.08)",fontSize:11}}>
                    {summary.coupleStatus === "married" ? "👫 Marié(e)" : summary.coupleStatus === "pacs" ? "💑 Pacsé(e)" : ""}
                  </span>
                )}
              </p>
            </div>

            {/* Droite : KPIs encours */}
            {!loading && (encours > 0 || contracts.length > 0) && (
              <div style={{display:"flex",flexDirection:"column",gap:14,alignItems:"flex-end"}}>
                {encours > 0 && (
                  <div style={{textAlign:"right",padding:"16px 20px",borderRadius:14,background:"rgba(255,255,255,0.06)",border:`1px solid ${gold}25`,backdropFilter:"blur(4px)"}}>
                    <div style={{fontSize:32,fontWeight:800,color:gold,lineHeight:1}}>{formatVal(encours)}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.6,marginTop:4}}>Encours total épargne</div>
                  </div>
                )}
                <div style={{display:"flex",gap:12}}>
                  {caPrev > 0 && (
                    <div style={{textAlign:"center",padding:"10px 16px",borderRadius:10,background:"rgba(255,255,255,0.05)"}}>
                      <div style={{fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{formatVal(caPrev)}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>Prévoyance/an</div>
                    </div>
                  )}
                  {contracts.length > 0 && (
                    <div style={{textAlign:"center",padding:"10px 16px",borderRadius:10,background:"rgba(255,255,255,0.05)"}}>
                      <div style={{fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{contracts.length}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,marginTop:2}}>Contrat{contracts.length>1?"s":""}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
                            <div style={{fontSize:15,fontWeight:600,color:"#0B3040",marginBottom:2}}>{c.productName||c.type}</div>
                            <div style={{fontSize:12,color:"#8FAAB6"}}>{c.insurer&&`${c.insurer} · `}{CONTRACT_LABELS[c.type]??c.type}{c.subscriptionDate&&` · Depuis ${fmtDate(c.subscriptionDate)}`}</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            {val>0&&<div style={{fontSize:18,fontWeight:800,color}}>{formatVal(val)}</div>}
                            {prem>0&&<div style={{fontSize:11,color:"#8FAAB6"}}>{formatVal(prem)}/an</div>}
                          {c.ucRatio&&c.ucRatio!=="0"&&c.ucRatio!==""&&<div style={{fontSize:11,color:"#8FAAB6"}}>{c.ucRatio}% UC</div>}
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
              <CardHeader title="Mes documents" icon="📁" color="#7C3AED"
                subtitle={documents.length>0?`${documents.length} document${documents.length>1?"s":""}`:"Aucun document"}
                action={<button onClick={()=>setShowUpload(v=>!v)} style={{padding:"7px 14px",borderRadius:8,border:"none",background:"#7C3AED",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>+ Envoyer</button>}
              />

              {/* Zone upload */}
              {showUpload&&(
                <div style={{padding:"16px 22px",background:"#F5F3FF",borderBottom:"1px solid rgba(124,58,237,0.12)"}}>
                  <div style={{fontSize:14,fontWeight:600,color:"#4C1D95",marginBottom:12}}>Envoyer un document à votre conseiller</div>
                  {/* Sélection fichier */}
                  <input ref={uploadRef} type="file" style={{display:"none"}}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
                    onChange={e=>{const f=e.target.files?.[0];if(f){setUploadFile(f);setUploadName(f.name.replace(/\.[^.]+$/,""));}}}/>
                  <div onClick={()=>uploadRef.current?.click()} style={{border:"2px dashed rgba(124,58,237,0.3)",borderRadius:12,padding:"20px",textAlign:"center",cursor:"pointer",background:"#fff",marginBottom:12}}>
                    {uploadFile?(
                      <div style={{fontSize:14,color:"#4C1D95",fontWeight:500}}>📄 {uploadFile.name} <span style={{color:"#8FAAB6",fontWeight:400}}>({(uploadFile.size/1024).toFixed(0)} Ko)</span></div>
                    ):(
                      <div style={{fontSize:13,color:"#8FAAB6"}}>Cliquez pour sélectionner un fichier<br/><span style={{fontSize:11}}>PDF, Word, Image — 10 Mo max</span></div>
                    )}
                  </div>
                  {uploadFile&&(<>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                      <div>
                        <label style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:0.4,display:"block",marginBottom:3}}>Nom du document</label>
                        <input value={uploadName} onChange={e=>setUploadName(e.target.value)} placeholder="ex: Pièce d'identité" style={{...INP,fontSize:13}}/>
                      </div>
                      <div>
                        <label style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:0.4,display:"block",marginBottom:3}}>Catégorie</label>
                        <select value={uploadCat} onChange={e=>setUploadCat(e.target.value)} style={{...INP,fontSize:13}}>
                          <option value="kyc">🪪 KYC / Identité</option>
                          <option value="contrat">📋 Contrat</option>
                          <option value="autre">📁 Autre</option>
                        </select>
                      </div>
                      <div style={{gridColumn:"span 2"}}>
                        <label style={{fontSize:11,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:0.4,display:"block",marginBottom:3}}>Note (optionnel)</label>
                        <input value={uploadNotes} onChange={e=>setUploadNotes(e.target.value)} placeholder="Précision pour votre conseiller..." style={{...INP,fontSize:13}}/>
                      </div>
                    </div>
                    {uploadErr&&<div style={{padding:"8px 12px",background:"#FEF2F2",color:"#991B1B",borderRadius:8,fontSize:13,marginBottom:10}}>{uploadErr}</div>}
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button onClick={()=>{setShowUpload(false);setUploadFile(null);}} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #D1D5DB",background:"#fff",color:"#6B7280",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
                      <button onClick={handleUpload} disabled={uploading} style={{padding:"8px 20px",borderRadius:8,border:"none",background:uploading?"#D1D5DB":"#7C3AED",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{uploading?"Envoi...":"Envoyer"}</button>
                    </div>
                  </>)}
                </div>
              )}

              <div style={{padding:"16px 22px"}}>
                {documents.length===0?(
                  <div style={{textAlign:"center",padding:"24px 0",color:"#9CA3AF",fontSize:14}}>Aucun document partagé pour le moment.</div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {documents.map(doc=>(
                      <div key={doc.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#F8F9FB",borderRadius:10}}>
                        <div style={{width:38,height:38,borderRadius:10,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{CAT_ICONS[doc.category]??"📄"}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <div style={{fontSize:14,fontWeight:600,color:"#0B3040",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{doc.name}</div>
                            {(doc as any).uploadedByClient&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"#EDE9FE",color:"#7C3AED"}}>⬆ Envoyé par vous</span>}
                          </div>
                          <div style={{fontSize:12,color:"#8FAAB6"}}>{CAT_LABELS[doc.category]??doc.category} · {fmtDate(doc.uploadedAt)}{doc.expiresAt&&` · Expire le ${fmtDate(doc.expiresAt)}`}</div>
                        </div>
                        {!(doc as any).uploadedByClient&&(
                          <button onClick={()=>downloadDocument(doc)} style={{padding:"7px 14px",borderRadius:8,border:"1px solid rgba(11,48,64,0.15)",background:"#fff",fontSize:13,color:"#0B3040",cursor:"pointer",fontFamily:"inherit",fontWeight:600,flexShrink:0}}>⬇ Télécharger</button>
                        )}
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

                {/* Modal KYC */}
                {activeQ==="kyc"&&(
                  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                    <div style={{background:"#fff",borderRadius:16,padding:"28px 32px",maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
                      <div style={{fontSize:18,fontWeight:700,color:"#0B3040",marginBottom:4}}>🪪 Connaissance client (KYC)</div>
                      <div style={{fontSize:13,color:"#8FAAB6",marginBottom:20}}>Ces informations sont requises par la réglementation pour votre suivi patrimonial.</div>

                      <div style={{display:"flex",flexDirection:"column",gap:14}}>
                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:0.4,display:"block",marginBottom:4}}>Pièce d'identité</label>
                          <select value={kyc.idType} onChange={e=>setKyc(p=>({...p,idType:e.target.value}))} style={INP}>
                            <option value="">Sélectionner...</option>
                            <option value="CNI">Carte nationale d'identité</option>
                            <option value="passeport">Passeport</option>
                            <option value="titre_sejour">Titre de séjour</option>
                            <option value="permis">Permis de conduire</option>
                          </select>
                        </div>
                        {kyc.idType&&(<>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                            <div><label style={{fontSize:12,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:0.4,display:"block",marginBottom:4}}>Numéro de pièce</label><input value={kyc.idNumber} onChange={e=>setKyc(p=>({...p,idNumber:e.target.value}))} placeholder="ex: 09AX12345" style={INP}/></div>
                            <div><label style={{fontSize:12,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:0.4,display:"block",marginBottom:4}}>Date d'expiration</label><input type="date" value={kyc.idExpiry} onChange={e=>setKyc(p=>({...p,idExpiry:e.target.value}))} style={INP}/></div>
                          </div>
                        </>)}

                        <div style={{background:"#FFFBEB",borderRadius:10,padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
                          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                            <div onClick={()=>setKyc(p=>({...p,isPPE:!p.isPPE}))} style={{width:42,height:24,borderRadius:12,position:"relative",background:kyc.isPPE?"#0B3040":"#D1D5DB",transition:"background 0.2s",flexShrink:0}}>
                              <div style={{position:"absolute",top:3,left:kyc.isPPE?20:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                            </div>
                            <span style={{fontSize:14,color:"#374151"}}>Je suis une Personne Politiquement Exposée (PPE)</span>
                          </label>
                          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                            <div onClick={()=>setKyc(p=>({...p,isFATCA:!p.isFATCA}))} style={{width:42,height:24,borderRadius:12,position:"relative",background:kyc.isFATCA?"#0B3040":"#D1D5DB",transition:"background 0.2s",flexShrink:0}}>
                              <div style={{position:"absolute",top:3,left:kyc.isFATCA?20:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                            </div>
                            <span style={{fontSize:14,color:"#374151"}}>Je suis concerné par la réglementation FATCA (lien avec les USA)</span>
                          </label>
                          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                            <div onClick={()=>setKyc(p=>({...p,isResidentFiscalUS:!p.isResidentFiscalUS}))} style={{width:42,height:24,borderRadius:12,position:"relative",background:kyc.isResidentFiscalUS?"#0B3040":"#D1D5DB",transition:"background 0.2s",flexShrink:0}}>
                              <div style={{position:"absolute",top:3,left:kyc.isResidentFiscalUS?20:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                            </div>
                            <span style={{fontSize:14,color:"#374151"}}>J'ai une résidence fiscale aux États-Unis</span>
                          </label>
                        </div>

                        <div>
                          <label style={{fontSize:12,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:0.4,display:"block",marginBottom:4}}>Origine principale des fonds</label>
                          <select value={kyc.originFunds} onChange={e=>setKyc(p=>({...p,originFunds:e.target.value}))} style={INP}>
                            <option value="">Sélectionner...</option>
                            <option value="salaires">Salaires et revenus professionnels</option>
                            <option value="epargne">Épargne personnelle</option>
                            <option value="heritage">Héritage / Donation</option>
                            <option value="cession">Cession d'entreprise ou d'actifs</option>
                            <option value="retraite">Pensions et retraite</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                      </div>

                      <div style={{display:"flex",gap:10,marginTop:24,justifyContent:"flex-end"}}>
                        <button onClick={()=>setActiveQ(null)} style={{padding:"10px 20px",borderRadius:10,border:"1px solid #D1D5DB",background:"#fff",color:"#6B7280",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
                        <button onClick={()=>handleSubmitQ("kyc")} disabled={!kyc.idType||qSaving} style={{padding:"10px 24px",borderRadius:10,border:"none",background:(!kyc.idType||qSaving)?"#D1D5DB":"#0B3040",color:(!kyc.idType||qSaving)?"#fff":"#C9A84C",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{qSaving?"Envoi...":"Envoyer mes réponses"}</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal MIF2 */}
                {activeQ==="mif2"&&(
                  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                    <div style={{background:"#fff",borderRadius:16,padding:"28px 32px",maxWidth:580,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
                      <div style={{fontSize:18,fontWeight:700,color:"#0B3040",marginBottom:4}}>📊 Profil investisseur (MIF2)</div>
                      <div style={{fontSize:13,color:"#8FAAB6",marginBottom:20}}>Ce questionnaire permet à votre conseiller d'évaluer votre profil d'investisseur et de vous proposer des placements adaptés.</div>

                      <div style={{display:"flex",flexDirection:"column",gap:20}}>
                        {/* Q1 — Attitude risque */}
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:"#0B3040",marginBottom:10}}>Q1 — Quelle est votre attitude face aux risques ?</div>
                          {[{v:0,l:"Je privilégie la sécurité, même si le rendement est faible"},{v:8,l:"J'accepte un risque limité pour améliorer légèrement le rendement"},{v:12,l:"J'accepte des fluctuations importantes pour un meilleur rendement"},{v:18,l:"Je recherche le rendement maximal, quitte à risquer de perdre une partie du capital"}].map(o=>(
                            <div key={o.v} onClick={()=>setMif2(p=>({...p,attitude:o.v as 0|8|12|18}))} style={{padding:"12px 14px",borderRadius:10,border:`2px solid ${mif2.attitude===o.v?"#0B3040":"#E2E5EC"}`,background:mif2.attitude===o.v?"rgba(11,48,64,0.04)":"#fff",cursor:"pointer",marginBottom:6,fontSize:14,color:"#374151"}}>
                              {mif2.attitude===o.v?"🔵":"⚪"} {o.l}
                            </div>
                          ))}
                        </div>

                        {/* Q2 — Réaction baisse */}
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:"#0B3040",marginBottom:10}}>Q2 — Face à une baisse de 20% de vos placements, vous…</div>
                          {[{v:0,l:"Vendez immédiatement pour limiter les pertes"},{v:6,l:"Attendez que ça remonte sans rien faire"},{v:12,l:"Profitez de la baisse pour réinvestir prudemment"},{v:18,l:"Investissez davantage, c'est une opportunité"}].map(o=>(
                            <div key={o.v} onClick={()=>setMif2(p=>({...p,reactionBaisse:o.v as 0|6|12|18}))} style={{padding:"12px 14px",borderRadius:10,border:`2px solid ${mif2.reactionBaisse===o.v?"#0B3040":"#E2E5EC"}`,background:mif2.reactionBaisse===o.v?"rgba(11,48,64,0.04)":"#fff",cursor:"pointer",marginBottom:6,fontSize:14,color:"#374151"}}>
                              {mif2.reactionBaisse===o.v?"🔵":"⚪"} {o.l}
                            </div>
                          ))}
                        </div>

                        {/* Q3 — Connaissances */}
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:"#0B3040",marginBottom:10}}>Q3 — Vos connaissances et expériences en placements</div>
                          <div style={{overflowX:"auto"}}>
                            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                              <thead><tr style={{background:"#F8F9FB"}}><th style={{padding:"8px 12px",textAlign:"left",color:"#6B7280",fontWeight:600}}>Produit</th><th style={{padding:"8px 12px",textAlign:"center",color:"#6B7280",fontWeight:600}}>Je connais</th><th style={{padding:"8px 12px",textAlign:"center",color:"#6B7280",fontWeight:600}}>J'ai déjà investi</th></tr></thead>
                              <tbody>
                                {[
                                  {k:"connaitFondsEuros",i:"investiFondsEuros",l:"Fonds euros / Livrets"},
                                  {k:"connaitActions",i:"investiActions",l:"Actions / Bourse"},
                                  {k:"connaitOPCVM",i:"investiOPCVM",l:"OPCVM / Fonds"},
                                  {k:"connaitImmo",i:"investiImmo",l:"Immobilier / SCPI"},
                                  {k:"connaitTrackers",i:"investiTrackers",l:"ETF / Trackers"},
                                  {k:"connaitStructures",i:"investiStructures",l:"Produits structurés"},
                                ].map(row=>(
                                  <tr key={row.k} style={{borderBottom:"1px solid #F0F2F6"}}>
                                    <td style={{padding:"10px 12px",color:"#374151"}}>{row.l}</td>
                                    <td style={{padding:"10px 12px",textAlign:"center"}}><input type="checkbox" checked={(mif2 as any)[row.k]} onChange={e=>setMif2(p=>({...p,[row.k]:e.target.checked,...(!e.target.checked?{[row.i]:false}:{})}))} style={{width:18,height:18,cursor:"pointer"}}/></td>
                                    <td style={{padding:"10px 12px",textAlign:"center"}}><input type="checkbox" checked={(mif2 as any)[row.i]} disabled={!(mif2 as any)[row.k]} onChange={e=>setMif2(p=>({...p,[row.i]:e.target.checked}))} style={{width:18,height:18,cursor:(mif2 as any)[row.k]?"pointer":"not-allowed",opacity:(mif2 as any)[row.k]?1:0.3}}/></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Q5 — Mode gestion */}
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:"#0B3040",marginBottom:10}}>Q4 — Votre mode de gestion préféré</div>
                          {[{v:"pilote",l:"Gestion pilotée — je délègue les décisions à un professionnel"},{v:"libre",l:"Gestion libre — je prends mes propres décisions d'investissement"}].map(o=>(
                            <div key={o.v} onClick={()=>setMif2(p=>({...p,modeGestion:o.v as "pilote"|"libre"}))} style={{padding:"12px 14px",borderRadius:10,border:`2px solid ${mif2.modeGestion===o.v?"#0B3040":"#E2E5EC"}`,background:mif2.modeGestion===o.v?"rgba(11,48,64,0.04)":"#fff",cursor:"pointer",marginBottom:6,fontSize:14,color:"#374151"}}>
                              {mif2.modeGestion===o.v?"🔵":"⚪"} {o.l}
                            </div>
                          ))}
                        </div>

                        {/* Q6 — Théorie */}
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:"#0B3040",marginBottom:10}}>Q5 — Vrai ou faux ?</div>
                          {[
                            {k:"savoirUCRisque",l:"Les unités de compte présentent un risque de perte en capital"},
                            {k:"savoirHorizonUC",l:"Un horizon de placement long réduit le risque global"},
                            {k:"savoirRisqueRendement",l:"Plus le risque est élevé, plus le rendement potentiel est élevé"},
                          ].map(q=>(
                            <label key={q.k} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:10}}>
                              <input type="checkbox" checked={(mif2 as any)[q.k]} onChange={e=>setMif2(p=>({...p,[q.k]:e.target.checked}))} style={{width:18,height:18,marginTop:1,cursor:"pointer",flexShrink:0}}/>
                              <span style={{fontSize:14,color:"#374151",lineHeight:1.4}}>{q.l} <span style={{fontSize:12,color:"#10B981",fontWeight:600}}>(Vrai)</span></span>
                            </label>
                          ))}
                        </div>

                        {/* Horizon */}
                        <div>
                          <div style={{fontSize:14,fontWeight:700,color:"#0B3040",marginBottom:10}}>Q6 — Votre horizon de placement</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                            {[{v:"0-4",l:"Court terme",s:"0–4 ans"},{v:"5-8",l:"Moyen terme",s:"5–8 ans"},{v:"9-15",l:"Long terme",s:"9–15 ans"},{v:"15+",l:"Très long terme",s:"+15 ans"}].map(o=>(
                              <div key={o.v} onClick={()=>setMif2(p=>({...p,horizon:o.v as "0-4"|"5-8"|"9-15"|"15+"}))} style={{padding:"14px",borderRadius:12,border:`2px solid ${mif2.horizon===o.v?"#0B3040":"#E2E5EC"}`,background:mif2.horizon===o.v?"rgba(11,48,64,0.04)":"#fff",cursor:"pointer",textAlign:"center"}}>
                                <div style={{fontSize:14,fontWeight:700,color:"#0B3040"}}>{o.l}</div>
                                <div style={{fontSize:12,color:"#8FAAB6",marginTop:2}}>{o.s}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{display:"flex",gap:10,marginTop:24,justifyContent:"flex-end"}}>
                        <button onClick={()=>setActiveQ(null)} style={{padding:"10px 20px",borderRadius:10,border:"1px solid #D1D5DB",background:"#fff",color:"#6B7280",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
                        <button onClick={()=>handleSubmitQ("mif2")} disabled={!mif2.attitude||!mif2.reactionBaisse||!mif2.modeGestion||!mif2.horizon||qSaving} style={{padding:"10px 24px",borderRadius:10,border:"none",background:(!mif2.attitude||!mif2.reactionBaisse||!mif2.modeGestion||!mif2.horizon||qSaving)?"#D1D5DB":"#0B3040",color:"#C9A84C",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{qSaving?"Envoi...":"Envoyer mes réponses"}</button>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {[
                    {id:"kyc" as const,title:"Connaissance client (KYC)",desc:"Vérification d'identité et obligations réglementaires",icon:"🪪",color:"#7C3AED",bg:"#F5F3FF"},
                    {id:"mif2" as const,title:"Profil investisseur (MIF2)",desc:"Questionnaire d'adéquation et de connaissance financière",icon:"📊",color:"#059669",bg:"#ECFDF5"},
                  ].map(q=>{
                    const done=qDone===q.id;
                    return (
                      <div key={q.id} style={{background:q.bg,borderRadius:12,padding:"20px",border:`1px solid ${q.color}18`}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                          <div style={{width:48,height:48,borderRadius:12,background:`${q.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{q.icon}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:15,fontWeight:700,color:"#0B3040",marginBottom:3}}>{q.title}</div>
                            <div style={{fontSize:12,color:"#8FAAB6",marginBottom:12,lineHeight:1.5}}>{q.desc}</div>
                            {done?(
                              <div style={{fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20,background:"#ECFDF5",color:"#065F46",display:"inline-flex",alignItems:"center",gap:5}}>✓ Réponses envoyées — Merci !</div>
                            ):(
                              <button onClick={()=>setActiveQ(q.id)} style={{fontSize:13,fontWeight:600,padding:"8px 18px",borderRadius:20,border:"none",background:q.color,color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>Compléter le questionnaire →</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
