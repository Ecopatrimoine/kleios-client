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
          logoSrc:      s.portalLogoUrl ?? s.logoSrc ?? "",
        });
      }

      // ── Dossier client ─────────────────────────────────────────────────
      const { data: contactData } = await supabase
        .from("crm_contacts")
        .select("display_name, payload")
        .eq("id", portalUser.contactId)
        .eq("user_id", portalUser.cgpUserId)
        .single();

      if (contactData?.payload) {
        const p = contactData.payload;

        // Structure Kleios CRM : payload.contact.person1
        const p1 = p.contact?.person1;
        const p2 = p.contact?.person2;
        let person1: PortalPerson | null = null;
        let person2: PortalPerson | null = null;

        if (p1) {
          person1 = {
            firstName: p1.firstName ?? p1.prenom ?? "",
            lastName:  p1.lastName  ?? p1.nom    ?? "",
            birthDate: p1.birthDate ?? p1.dateNaissance ?? "",
            csp:       p1.csp       ?? "",
          };
        }
        if (p2?.firstName || p2?.prenom) {
          person2 = {
            firstName: p2.firstName ?? p2.prenom ?? "",
            lastName:  p2.lastName  ?? p2.nom    ?? "",
            birthDate: p2.birthDate ?? p2.dateNaissance ?? "",
            csp:       p2.csp       ?? "",
          };
        }
        const coupleStatus      = p.contact?.coupleStatus      ?? p.contact?.situation ?? "";
        const matrimonialRegime = p.contact?.matrimonialRegime ?? "";

        setSummary({
          displayName:       contactData.display_name,
          person1,
          person2,
          coupleStatus,
          matrimonialRegime,
        });

        // ── Contrats Kleios CRM ───────────────────────────────────────────
        const kleiosContracts: any[] = p.contracts ?? [];
        setContracts(kleiosContracts
          .filter((c: any) => c.status === "actif")
          .map((c: any) => ({
            id:               c.id ?? Math.random().toString(),
            type:             c.type ?? "",
            productName:      c.productName ?? c.nom ?? "",
            insurer:          c.insurer ?? c.assureur ?? "",
            status:           c.status ?? "actif",
            currentValue:     c.currentValue ?? c.encours ?? "0",
            annualPremium:    c.annualPremium ?? c.cotisationAnnuelle ?? "0",
            subscriptionDate: c.subscriptionDate ?? c.dateEffet ?? "",
            ucRatio:          c.ucRatio ?? "",
          })));

        // ── Documents GED ────────────────────────────────────────────────
        const allDocs: PortalDocument[] = (p.documents_ged ?? p.documents ?? p.ged ?? [])
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
