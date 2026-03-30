// src/hooks/usePortalData.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { PortalUser } from "./usePortalAuth";

export interface CabinetTheme {
  cabinetName:  string;
  advisorName:  string;
  colorNavy:    string;
  colorGold:    string;
  logoSrc:      string;
}

export interface PortalDocument {
  id:              string;
  ref:             string;
  name:            string;
  fileName:        string;
  category:        string;
  status:          string;
  size:            number;
  mimeType:        string;
  uploadedAt:      string;
  expiresAt:       string;
  visibleToClient: boolean;
}

// Placement Ploutos → affiché comme "contrat" dans le portail
export interface PortalContract {
  id:              string;
  type:            string;
  productName:     string;
  insurer:         string;
  status:          string;
  currentValue:    string;
  annualPremium:   string;
  subscriptionDate:string;
  ucRatio:         string;
}

export interface PortalMessage {
  id:         string;
  from_role:  "cgp" | "client";
  body:       string;
  read_at:    string | null;
  created_at: string;
}

export interface PortalPerson {
  firstName:  string;
  lastName:   string;
  birthDate:  string;
  csp:        string;
}

export interface PortalContactSummary {
  displayName:       string;
  person1:           PortalPerson | null;
  person2:           PortalPerson | null;
  coupleStatus:      string;
  matrimonialRegime: string;
}

// ── Mapping type placement Ploutos → label lisible ────────────────────────
const PLACEMENT_TYPE_MAP: Record<string, string> = {
  "Assurance-vie fonds euros":           "av",
  "Assurance-vie unités de compte":      "av",
  "Assurance-vie mixte":                 "av",
  "PER assurantiel":                     "per",
  "PER bancaire":                        "per",
  "PEA":                                 "pea",
  "Compte-titres":                       "cto",
  "SCPI":                                "scpi",
  "Contrat de capitalisation":           "capitalisation",
  "Livret A":                            "livret",
  "LDDS":                                "livret",
  "LEP":                                 "livret",
  "Livret Jeune":                        "livret",
  "Compte épargne logement":             "cel",
  "Plan épargne logement":               "pel",
};

function normalisePlacementType(rawType: string): string {
  return PLACEMENT_TYPE_MAP[rawType] ?? rawType.toLowerCase().replace(/[^a-z]/g, "_");
}

export function usePortalData(portalUser: PortalUser | null) {
  const [theme,     setTheme]     = useState<CabinetTheme | null>(null);
  const [summary,   setSummary]   = useState<PortalContactSummary | null>(null);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [contracts, setContracts] = useState<PortalContract[]>([]);
  const [messages,  setMessages]  = useState<PortalMessage[]>([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!portalUser) return;
    setLoading(true);
    try {
      // ── Cabinet theme ──────────────────────────────────────────────────
      const { data: cabinet } = await supabase
        .from("cabinet_settings")
        .select("settings")
        .eq("user_id", portalUser.cgpUserId)
        .single();

      if (cabinet?.settings) {
        const s = cabinet.settings;
        setTheme({
          cabinetName:  s.cabinetName  ?? s.nom ?? "Votre cabinet",
          advisorName:  s.advisorName  ?? s.cabinetName ?? s.nom ?? "Votre conseiller",
          colorNavy:    s.colorNavy    ?? "#0B3040",
          colorGold:    s.colorGold    ?? "#C9A84C",
          logoSrc:      s.logoSrc      ?? "",
        });
      }

      // ── Dossier client ─────────────────────────────────────────────────
      const { data: contactData } = await supabase
        .from("clients")
        .select("display_name, payload")
        .eq("id", portalUser.contactId)
        .eq("user_id", portalUser.cgpUserId)
        .single();

      if (contactData?.payload) {
        const p = contactData.payload;

        // Détecter la structure du payload
        // Ploutos: payload.data.person1FirstName
        // Kleios CRM: payload.contact.person1.firstName
        const isPloutosPayload = !!p.data?.person1FirstName || !!p.data?.person1LastName;
        const isKleiosPayload  = !!p.contact?.person1;

        let person1: PortalPerson | null = null;
        let person2: PortalPerson | null = null;
        let coupleStatus = "";
        let matrimonialRegime = "";

        if (isPloutosPayload) {
          const d = p.data;
          person1 = {
            firstName: d.person1FirstName ?? "",
            lastName:  d.person1LastName  ?? "",
            birthDate: d.person1BirthDate ?? "",
            csp:       d.person1Csp       ?? "",
          };
          if (d.person2FirstName || d.person2LastName) {
            person2 = {
              firstName: d.person2FirstName ?? "",
              lastName:  d.person2LastName  ?? "",
              birthDate: d.person2BirthDate ?? "",
              csp:       d.person2Csp       ?? "",
            };
          }
          coupleStatus      = d.coupleStatus      ?? "";
          matrimonialRegime = d.matrimonialRegime ?? "";
        } else if (isKleiosPayload) {
          const p1 = p.contact?.person1;
          const p2 = p.contact?.person2;
          if (p1) person1 = { firstName: p1.firstName ?? "", lastName: p1.lastName ?? "", birthDate: p1.birthDate ?? "", csp: p1.csp ?? "" };
          if (p2?.firstName) person2 = { firstName: p2.firstName ?? "", lastName: p2.lastName ?? "", birthDate: p2.birthDate ?? "", csp: p2.csp ?? "" };
          coupleStatus      = p.contact?.coupleStatus      ?? "";
          matrimonialRegime = p.contact?.matrimonialRegime ?? "";
        }

        setSummary({
          displayName:       contactData.display_name,
          person1,
          person2,
          coupleStatus,
          matrimonialRegime,
        });

        // ── Placements / Contrats ────────────────────────────────────────
        if (isPloutosPayload) {
          // Lire les placements Ploutos
          const placements: any[] = p.data?.placements ?? [];
          setContracts(placements.map((pl: any, i: number) => ({
            id:              `placement_${i}`,
            type:            normalisePlacementType(pl.type ?? ""),
            productName:     pl.name || pl.type || "",
            insurer:         "",
            status:          "actif",
            currentValue:    pl.value ?? "0",
            annualPremium:   pl.annualIncome ?? pl.annualContribution ?? "0",
            subscriptionDate: pl.openDate ?? "",
            ucRatio:         pl.ucRatio ?? "",
          })));
        } else {
          // Lire les contrats Kleios CRM
          const kleiosContracts: any[] = p.contracts ?? [];
          setContracts(kleiosContracts
            .filter((c: any) => c.status === "actif")
            .map((c: any) => ({
              id:              c.id ?? Math.random().toString(),
              type:            c.type ?? "",
              productName:     c.productName ?? "",
              insurer:         c.insurer ?? "",
              status:          c.status ?? "actif",
              currentValue:    c.currentValue ?? "0",
              annualPremium:   c.annualPremium ?? "0",
              subscriptionDate: c.subscriptionDate ?? "",
              ucRatio:         c.ucRatio ?? "",
            })));
        }

        // ── Documents GED ────────────────────────────────────────────────
        const allDocs: PortalDocument[] = (p.documents_ged ?? p.documents ?? [])
          .filter((d: any) => d.visibleToClient);
        setDocuments(allDocs);
      }

      // ── Messages ───────────────────────────────────────────────────────
      const { data: msgs } = await supabase
        .from("portal_messages")
        .select("*")
        .eq("contact_id", portalUser.contactId)
        .eq("cgp_user_id", portalUser.cgpUserId)
        .order("created_at", { ascending: true });
      setMessages(msgs ?? []);

      // Marquer les messages CGP comme lus
      await supabase
        .from("portal_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("contact_id", portalUser.contactId)
        .eq("cgp_user_id", portalUser.cgpUserId)
        .eq("from_role", "cgp")
        .is("read_at", null);

    } finally {
      setLoading(false);
    }
  }, [portalUser]);

  useEffect(() => { load(); }, [load]);

  const sendMessage = async (body: string) => {
    if (!portalUser || !body.trim()) return;
    const { data } = await supabase
      .from("portal_messages")
      .insert({
        contact_id:  portalUser.contactId,
        cgp_user_id: portalUser.cgpUserId,
        from_role:   "client",
        body:        body.trim(),
      })
      .select()
      .single();
    if (data) {
      setMessages(prev => [...prev, data]);
      // Notifier le CGP par email (fire-and-forget)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      fetch(`${supabaseUrl}/functions/v1/notify-cgp-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: data }),
      }).catch(() => {});
    }
  };

  const downloadDocument = async (doc: PortalDocument) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.id, 60);
    if (error) throw error;
    window.open(data.signedUrl, "_blank");
  };

  return { theme, summary, documents, contracts, messages, loading, sendMessage, downloadDocument, reload: load };
}
