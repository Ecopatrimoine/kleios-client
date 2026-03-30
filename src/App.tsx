// src/App.tsx — Kleios Client Portal
import { useState, useEffect } from "react";
import { usePortalAuth }  from "./hooks/usePortalAuth";
import { usePortalData }  from "./hooks/usePortalData";
import { supabase }       from "./lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────
type View = "accueil" | "documents" | "messagerie" | "questionnaires";

// ── Helpers ────────────────────────────────────────────────────────────────
function formatVal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} k€`;
  return `${n}€`;
}
function parseVal(s: string): number {
  const v = parseFloat(s?.replace(/[^0-9.,]/g, "").replace(",", ".") ?? "0");
  return isNaN(v) ? 0 : v;
}
function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const CONTRACT_LABELS: Record<string, string> = {
  av: "Assurance-vie", per: "PER", pea: "PEA", cto: "CTO", scpi: "SCPI",
  capitalisation: "Capitalisation", prevoyance: "Prévoyance", sante: "Santé",
  iard: "IARD", emprunteur: "Emprunteur", retraite_collective: "Retraite", autre: "Autre",
};
const CAT_ICONS: Record<string, string> = {
  lettre_mission: "📄", rapport_patrimonial: "📊", contrat: "📋",
  der: "✅", kyc: "🪪", autre: "📁",
};
const CAT_LABELS: Record<string, string> = {
  lettre_mission: "Lettre de mission", rapport_patrimonial: "Rapport patrimonial",
  contrat: "Contrat", der: "DER", kyc: "KYC / Identité", autre: "Autre",
};

// ── Page Login ─────────────────────────────────────────────────────────────
function LoginPage({ onLogin, loading }: { onLogin: (e: string, p: string) => Promise<void>; loading: boolean }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [busy, setBusy]       = useState(false);

  const handle = async () => {
    if (!email || !password) return;
    setBusy(true); setError("");
    try { await onLogin(email, password); }
    catch (e: any) { setError(e.message ?? "Identifiants incorrects"); }
    finally { setBusy(false); }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F2F5" }}>
      <div style={{ fontSize: 14, color: "#8FAAB6" }}>Chargement...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F2F5" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0B3040" }}>Espace client</div>
          <div style={{ fontSize: 14, color: "#8FAAB6", marginTop: 6 }}>Connectez-vous pour accéder à vos documents</div>
        </div>
        {error && <div style={{ padding: "10px 14px", background: "#FEF2F2", color: "#991B1B", borderRadius: 9, fontSize: 13, marginBottom: 16, border: "1px solid #FECACA" }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={LBL}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.fr" style={INP}
              onKeyDown={e => e.key === "Enter" && handle()} />
          </div>
          <div>
            <label style={LBL}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" style={INP}
              onKeyDown={e => e.key === "Enter" && handle()} />
          </div>
          <button onClick={handle} disabled={busy || !email || !password} style={{
            padding: "12px", borderRadius: 9, border: "none",
            background: (!busy && email && password) ? "#0B3040" : "#D1D5DB",
            color: (!busy && email && password) ? "#C9A84C" : "#fff",
            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4,
          }}>
            {busy ? "Connexion..." : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page Activation ────────────────────────────────────────────────────────
function ActivatePage({ token }: { token: string }) {
  const [step,     setStep]     = useState<"loading" | "form" | "done" | "error">("loading");
  const [invEmail, setInvEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [busy,     setBusy]     = useState(false);
  const EDGE = import.meta.env.VITE_SUPABASE_URL + "/functions/v1/portal-invite";

  useEffect(() => {
    fetch(EDGE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "validate", token }) })
      .then(r => r.json())
      .then(data => { if (data.valid) { setInvEmail(data.email); setStep("form"); } else { setError(data.error); setStep("error"); } })
      .catch(() => { setError("Erreur réseau"); setStep("error"); });
  }, [token]);

  const handleActivate = async () => {
    if (password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères"); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch(EDGE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "activate", token, password }) });
      const data = await r.json();
      if (data.success) setStep("done");
      else throw new Error(data.error);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  if (step === "loading") return <div style={centeredBox}><div style={{ fontSize: 14, color: "#8FAAB6" }}>Vérification de votre invitation...</div></div>;
  if (step === "error")   return <div style={centeredBox}><div style={{ fontSize: 15, color: "#991B1B", textAlign: "center" }}>⚠ {error || "Invitation invalide ou expirée"}</div></div>;
  if (step === "done")    return (
    <div style={centeredBox}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0B3040", marginBottom: 8 }}>Compte activé !</div>
        <div style={{ fontSize: 14, color: "#5E7A88", marginBottom: 24 }}>Votre espace client est prêt.</div>
        <a href="/" style={{ padding: "12px 28px", background: "#0B3040", color: "#C9A84C", borderRadius: 9, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Accéder à mon espace</a>
      </div>
    </div>
  );

  return (
    <div style={centeredBox}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0B3040" }}>Activez votre espace</div>
          <div style={{ fontSize: 13, color: "#8FAAB6", marginTop: 6 }}>{invEmail}</div>
        </div>
        {error && <div style={{ padding: "10px 14px", background: "#FEF2F2", color: "#991B1B", borderRadius: 9, fontSize: 13, marginBottom: 14, border: "1px solid #FECACA" }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={LBL}>Choisissez votre mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="8 caractères minimum" style={INP} />
          </div>
          <div>
            <label style={LBL}>Confirmez le mot de passe</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••" style={INP} onKeyDown={e => e.key === "Enter" && handleActivate()} />
          </div>
          <button onClick={handleActivate} disabled={busy} style={{
            padding: "12px", borderRadius: 9, border: "none",
            background: !busy ? "#0B3040" : "#D1D5DB",
            color: !busy ? "#C9A84C" : "#fff",
            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4,
          }}>
            {busy ? "Activation..." : "Activer mon espace"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles partagés ────────────────────────────────────────────────────────
const LBL: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#8FAAB6", letterSpacing: 0.4, marginBottom: 4, textTransform: "uppercase", display: "block" };
const INP: React.CSSProperties = { border: "1px solid rgba(11,48,64,0.14)", borderRadius: 8, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", outline: "none", background: "#F6F8FA", width: "100%", boxSizing: "border-box" };
const centeredBox: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F2F5" };

// ── App principale ─────────────────────────────────────────────────────────
export default function App() {
  const { authState, portalUser, signIn, signOut } = usePortalAuth();
  const { theme, summary, documents, contracts, messages, loading, sendMessage, downloadDocument } = usePortalData(portalUser);
  const [view, setView]       = useState<View>("accueil");
  const [msgInput, setMsgInput] = useState("");
  const [sendBusy, setSendBusy] = useState(false);

  // Détection page /activate
  const urlParams = new URLSearchParams(window.location.search);
  const activateToken = window.location.pathname === "/activate" ? urlParams.get("token") : null;
  if (activateToken) return <ActivatePage token={activateToken} />;

  if (authState === "loading") return <div style={centeredBox}><div style={{ fontSize: 14, color: "#8FAAB6" }}>Chargement...</div></div>;
  if (authState === "unauthenticated") return <LoginPage onLogin={signIn} loading={false} />;

  const navy = theme?.colorNavy ?? "#0B3040";
  const gold = theme?.colorGold ?? "#C9A84C";
  const name = theme?.cabinetName ?? "Votre conseiller";

  const encours = contracts.reduce((s, c) => s + parseVal(c.currentValue), 0);
  const unread  = messages.filter(m => m.from_role === "cgp" && !m.read_at).length;

  // Sender
  const handleSend = async () => {
    if (!msgInput.trim()) return;
    setSendBusy(true);
    try { await sendMessage(msgInput); setMsgInput(""); }
    finally { setSendBusy(false); }
  };

  const navItems: { id: View; label: string; icon: string; badge?: number }[] = [
    { id: "accueil",         label: "Accueil",         icon: "🏠" },
    { id: "documents",       label: "Documents",       icon: "📁", badge: documents.length },
    { id: "messagerie",      label: "Messagerie",      icon: "💬", badge: unread || undefined },
    { id: "questionnaires",  label: "Questionnaires",  icon: "📋" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F0F2F5", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <header style={{
        background: `linear-gradient(135deg, ${navy} 0%, #144260 100%)`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        padding: "0 24px",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, height: 60 }}>
          {theme?.logoSrc ? (
            <img src={theme.logoSrc} alt={name} style={{ height: 36, objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{name}</div>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
            {summary?.displayName ?? portalUser?.user.email}
          </div>
          <button onClick={signOut} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.20)",
            background: "transparent", color: "rgba(255,255,255,0.70)",
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Nav ── */}
      <nav style={{ background: "#fff", borderBottom: "1px solid rgba(11,48,64,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "14px 20px", border: "none",
              borderBottom: view === item.id ? `2px solid ${navy}` : "2px solid transparent",
              background: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 14, fontWeight: view === item.id ? 600 : 400,
              color: view === item.id ? navy : "#5E7A88",
              position: "relative",
            }}>
              <span>{item.icon}</span>
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span style={{
                  position: "absolute", top: 8, right: 6,
                  width: 18, height: 18, borderRadius: "50%",
                  background: view === item.id ? navy : "#EF4444",
                  color: view === item.id ? gold : "#fff",
                  fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Contenu ── */}
      <main style={{ flex: 1, maxWidth: 900, margin: "0 auto", padding: "24px 16px", width: "100%" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8FAAB6", fontSize: 14 }}>Chargement...</div>
        ) : (

          // ══ ACCUEIL ══════════════════════════════════════════════════════
          view === "accueil" ? (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: navy, margin: 0 }}>Bonjour {summary?.person1?.firstName ?? ""} 👋</h1>
                <p style={{ fontSize: 14, color: "#8FAAB6", margin: "4px 0 0" }}>Voici un résumé de votre situation patrimoniale</p>
              </div>

              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "Encours total",    value: encours > 0 ? formatVal(encours) : "—", icon: "💰" },
                  { label: "Contrats actifs",  value: String(contracts.length),               icon: "📋" },
                  { label: "Documents",        value: String(documents.length),               icon: "📁" },
                ].map(k => (
                  <div key={k.label} style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{k.icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: navy, lineHeight: 1 }}>{k.value}</div>
                    <div style={{ fontSize: 12, color: "#8FAAB6", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Identité */}
              {summary && (
                <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: navy, marginBottom: 16 }}>Votre profil</div>
                  <div style={{ display: "grid", gridTemplateColumns: summary.person2 ? "1fr 1fr" : "1fr", gap: 20 }}>
                    {[summary.person1, summary.person2].filter(Boolean).map((p, i) => p && (
                      <div key={i}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#8FAAB6", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Personne {i + 1}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                          {[
                            { l: "Nom", v: `${p.firstName} ${p.lastName}`.trim() },
                            { l: "Naissance", v: p.birthDate ? fmtDate(p.birthDate) : "—" },
                            { l: "CSP", v: p.csp || "—" },
                            { l: "Ville", v: p.city || "—" },
                          ].map(({ l, v }) => (
                            <div key={l}>
                              <div style={{ fontSize: 11, color: "#8FAAB6", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{l}</div>
                              <div style={{ fontSize: 14, color: navy }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contrats */}
              {contracts.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: navy, marginBottom: 14 }}>Vos contrats actifs</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {contracts.map(c => {
                      const val = parseVal(c.currentValue);
                      return (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "rgba(214,228,240,0.20)", borderRadius: 10 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: navy, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: gold, fontWeight: 800 }}>{(c.type ?? "").toUpperCase().slice(0, 2)}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: navy }}>{c.productName || CONTRACT_LABELS[c.type] || c.type}</div>
                            <div style={{ fontSize: 12, color: "#8FAAB6" }}>{c.insurer} {c.subscriptionDate ? `· Souscrit le ${fmtDate(c.subscriptionDate)}` : ""}</div>
                          </div>
                          {val > 0 && <div style={{ fontSize: 18, fontWeight: 700, color: navy }}>{formatVal(val)}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          // ══ DOCUMENTS ════════════════════════════════════════════════════
          ) : view === "documents" ? (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: navy, marginBottom: 20 }}>Mes documents</h2>
              {documents.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 14, padding: "50px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                  Aucun document partagé pour le moment.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {documents.map(doc => (
                    <div key={doc.id} style={{
                      background: "#fff", borderRadius: 12, padding: "16px 18px",
                      display: "flex", alignItems: "center", gap: 14,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        {CAT_ICONS[doc.category] ?? "📄"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: navy }}>{doc.name}</div>
                        <div style={{ fontSize: 12, color: "#8FAAB6", marginTop: 2 }}>
                          {CAT_LABELS[doc.category] ?? doc.category} · {fmtDate(doc.uploadedAt)}
                          {doc.expiresAt && ` · Expire le ${fmtDate(doc.expiresAt)}`}
                        </div>
                      </div>
                      <button onClick={() => downloadDocument(doc)} style={{
                        padding: "8px 16px", borderRadius: 8,
                        border: `1px solid ${navy}30`, background: "#fff",
                        fontSize: 13, color: navy, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                      }}>
                        ⬇ Télécharger
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          // ══ MESSAGERIE ═══════════════════════════════════════════════════
          ) : view === "messagerie" ? (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: navy, marginBottom: 20 }}>Messagerie</h2>
              <div style={{
                background: "#fff", borderRadius: 14, overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                display: "flex", flexDirection: "column", height: "calc(100vh - 280px)", minHeight: 400,
              }}>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF", fontSize: 14 }}>
                      Aucun message. Envoyez un message à votre conseiller !
                    </div>
                  ) : messages.map(m => {
                    const isClient = m.from_role === "client";
                    return (
                      <div key={m.id} style={{
                        display: "flex", justifyContent: isClient ? "flex-end" : "flex-start",
                        marginBottom: 12,
                      }}>
                        {!isClient && (
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: gold, fontWeight: 700, flexShrink: 0, marginRight: 8, alignSelf: "flex-end" }}>
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div style={{
                          maxWidth: "70%", padding: "10px 14px", borderRadius: isClient ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                          background: isClient ? navy : "#F0F2F5",
                          color: isClient ? "#fff" : navy,
                          fontSize: 14, lineHeight: 1.5,
                        }}>
                          {m.body}
                          <div style={{ fontSize: 10, opacity: 0.55, marginTop: 4, textAlign: "right" }}>
                            {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Saisie */}
                <div style={{ borderTop: "1px solid rgba(11,48,64,0.08)", padding: "14px 20px", display: "flex", gap: 10 }}>
                  <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Écrivez un message à votre conseiller..."
                    style={{ ...INP, flex: 1 }} />
                  <button onClick={handleSend} disabled={sendBusy || !msgInput.trim()} style={{
                    padding: "10px 20px", borderRadius: 9, border: "none",
                    background: (!sendBusy && msgInput.trim()) ? navy : "#D1D5DB",
                    color: (!sendBusy && msgInput.trim()) ? gold : "#fff",
                    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                  }}>
                    Envoyer
                  </button>
                </div>
              </div>
            </div>

          // ══ QUESTIONNAIRES ════════════════════════════════════════════════
          ) : (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: navy, marginBottom: 8 }}>Questionnaires</h2>
              <p style={{ fontSize: 14, color: "#8FAAB6", marginBottom: 24 }}>Votre conseiller peut vous demander de remplir ces questionnaires réglementaires.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { id: "kyc",  title: "Connaissance client (KYC)",      desc: "Vérification d'identité et obligations réglementaires",    icon: "🪪", color: "#581C87", bg: "#FDF4FF" },
                  { id: "mif2", title: "Profil investisseur (MIF2)",      desc: "Questionnaire de connaissance et d'adéquation financière",  icon: "📊", color: "#065F46", bg: "#ECFDF5" },
                ].map(q => (
                  <div key={q.id} style={{
                    background: "#fff", borderRadius: 14, padding: "24px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer",
                  }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: q.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 14 }}>{q.icon}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: navy, marginBottom: 6 }}>{q.title}</div>
                    <div style={{ fontSize: 13, color: "#8FAAB6", marginBottom: 16 }}>{q.desc}</div>
                    <div style={{ fontSize: 12, color: "#8FAAB6", padding: "6px 12px", background: "#F3F4F6", borderRadius: 8, display: "inline-block" }}>
                      Disponible prochainement
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: "#fff", borderTop: "1px solid rgba(11,48,64,0.06)", padding: "16px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#8FAAB6" }}>
          {name} · Espace client sécurisé · <span style={{ opacity: 0.7 }}>Propulsé par Kleios</span>
        </div>
      </footer>
    </div>
  );
}
