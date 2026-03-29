import { supabase } from "@/src/supabase";

export type TipoImovel = "casa" | "apartamento" | "terreno";
export type StatusImovel = "rascunho" | "publicado" | "arquivado";

export type Imovel = {
  id: string;
  id_dono: string;
  titulo: string;
  descricao?: string;
  preco_centavos: number;
  tipo: TipoImovel;
  cidade: string;
  uf: string;
  id_estado?: number;
  id_municipio?: number;
  status: StatusImovel;
  latitude?: number;
  longitude?: number;
  criado_em?: string;
  atualizado_em?: string;
  fotos?: string[];
};

// ─── Criar imóvel ─────────────────────────────────────────────────────────────

export async function criarImovel(params: {
  titulo: string;
  descricao?: string;
  precoCentavos: number;
  tipo: TipoImovel;
  cidade: string;
  uf: string;
  idEstado?: number | null;
  idMunicipio?: number | null;
  status: StatusImovel;
  latitude: number;
  longitude: number;
  
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("imoveis")
    .insert({
      id_dono: user.id,
      titulo: params.titulo.trim(),
      descricao: params.descricao?.trim() || null,
      preco_centavos: params.precoCentavos,
      tipo: params.tipo,
      cidade: params.cidade.trim(),
      uf: params.uf.trim().toUpperCase(),
      id_estado: params.idEstado ?? null,
      id_municipio: params.idMunicipio ?? null,
      status: params.status,
      latitude: params.latitude,
      longitude: params.longitude,
      fotos: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Editar imóvel ────────────────────────────────────────────────────────────

export async function editarImovel(
  imovelId: string,
  params: {
    titulo: string;
    descricao?: string;
    precoCentavos: number;
    tipo: TipoImovel;
    cidade: string;
    uf: string;
    idEstado?: number | null;
    idMunicipio?: number | null;
    status: StatusImovel;
    latitude: number;
    longitude: number;
    fotos?: string[];
  }
) {
  const { error } = await supabase
    .from("imoveis")
    .update({
      titulo: params.titulo.trim(),
      descricao: params.descricao?.trim() || null,
      preco_centavos: params.precoCentavos,
      tipo: params.tipo,
      cidade: params.cidade.trim(),
      uf: params.uf.trim().toUpperCase(),
      id_estado: params.idEstado ?? null,
      id_municipio: params.idMunicipio ?? null,
      status: params.status,
      latitude: params.latitude,
      longitude: params.longitude,
      atualizado_em: new Date().toISOString(),
      fotos: params.fotos ?? [],
    })
    .eq("id", imovelId);

  if (error) throw error;
}

// ─── Atualizar status ─────────────────────────────────────────────────────────

export async function atualizarStatusImovel(
  imovelId: string,
  novoStatus: StatusImovel
) {
  const { error } = await supabase
    .from("imoveis")
    .update({
      status: novoStatus,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", imovelId);

  if (error) throw error;
}

// ─── Deletar imóvel ───────────────────────────────────────────────────────────

export async function deletarImovel(imovelId: string) {
  const { error } = await supabase
    .from("imoveis")
    .delete()
    .eq("id", imovelId);

  if (error) throw error;
}

// ─── Buscar imóveis do dono (realtime) ───────────────────────────────────────

export function subscribeImoveisDono(
  idDono: string,
  callback: (imoveis: Imovel[]) => void
) {
  // Busca inicial
  supabase
    .from("imoveis")
    .select("*")
    .eq("id_dono", idDono)
    .order("criado_em", { ascending: false })
    .then(({ data, error }) => {
      if (!error && data) callback(data as Imovel[]);
    });

  // Realtime
  const channel = supabase
    .channel("imoveis-dono")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "imoveis",
        filter: `id_dono=eq.${idDono}`,
      },
      () => {
        supabase
          .from("imoveis")
          .select("*")
          .eq("id_dono", idDono)
          .order("criado_em", { ascending: false })
          .then(({ data, error }) => {
            if (!error && data) callback(data as Imovel[]);
          });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─── Buscar imóveis por raio ──────────────────────────────────────────────────

export async function buscarImoveisPorRaio(params: {
  latitude: number;
  longitude: number;
  raioKm: number;
}): Promise<Imovel[]> {
  const { data, error } = await supabase.rpc("imoveis_proximos", {
    lat: params.latitude,
    lng: params.longitude,
    raio_km: params.raioKm,
  });

  if (error) throw error;
  return (data ?? []) as Imovel[];
}

// ─── Atualizar Fotos do imóvel       ──────────────────────────────────────────────────

export async function atualizarFotosImovel(
  imovelId: string,
  fotos: string[]
): Promise<void> {
  const { error } = await supabase
    .from("imoveis")
    .update({ fotos })
    .eq("id", imovelId);

  if (error) throw error;
}