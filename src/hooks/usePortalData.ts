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
  id:           string;
  ref:          string;
  name:         string;
  fileName:     string;
  category:     string;
  status:       string;
  size:         number;
  mimeType:     string;
  uploadedAt:   string;
  expiresAt:    string;
  visibleToClient: boolean;
}

export interface PortalContract {
  id:           string;
  type:         string;
  productName:  string;
  insurer:      string;
  status:       string;
  currentValue: string;
  annualPremium:string;
  subscriptionDate: string;
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
  email:      string;
  phone:      string;
  address:    string;
  postalCode: string;
  city:       string;
}

export interface PortalContactSummary {
  displayName:  string;
  person1:      PortalPerson | null;
  person2:      PortalPerson | null;
  civilStatus:  string;
  matrimonialRegime: string;
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
      // ── Cabinet theme ──
      const { data: cabinet } = await supabase
        .from("cabinet_settings")
        .select("settings")
        .eq("user_id", portalUser.cgpUserId)
        .single();
      if (cabinet?.settings) {
        setTheme({
          cabinetName:  cabinet.settings.cabinetName  ?? "Votre cabinet",
          advisorName:  cabinet.settings.advisorName  ?? cabinet.settings.cabinetName ?? "Votre conseiller",
          colorNavy:    cabinet.settings.colorNavy    ?? "#0B3040",
          colorGold:    cabinet.settings.colorGold    ?? "#C9A84C",
          logoSrc:      cabinet.settings.logoSrc      ?? "",
        });
      }

      // ── Client data (contact record) ──
      const { data: contactData } = await supabase
        .from("clients")
        .select("display_name, payload")
        .eq("id", portalUser.contactId)
        .eq("user_id", portalUser.cgpUserId)
        .single();

      if (contactData?.payload) {
        const p = contactData.payload;
        setSummary({
          displayName:       contactData.display_name,
          person1:           p.contact?.person1 ?? null,
          person2:           p.contact?.person2 ?? null,
          civilStatus:       p.contact?.civilStatus ?? "",
          matrimonialRegime: p.contact?.matrimonialRegime ?? "",
        });
        // Documents visibles par le client
        const allDocs: PortalDocument[] = (p.documents_ged ?? []).filter((d: any) => d.visibleToClient);
        setDocuments(allDocs);
        // Contrats actifs
        setContracts((p.contracts ?? []).filter((c: any) => c.status === "actif"));
      }

      // ── Messages ──
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
      }).catch(() => { /* silencieux si échec */ });
    }
  };

  const downloadDocument = async (doc: PortalDocument) => {
    const path = doc.id; // path Supabase Storage
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60);
    if (error) throw error;
    window.open(data.signedUrl, "_blank");
  };

  return { theme, summary, documents, contracts, messages, loading, sendMessage, downloadDocument, reload: load };
}
