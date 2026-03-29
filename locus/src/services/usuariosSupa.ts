import { supabase } from "@/src/supabase";

export type Usuario = {
  id: string;
  email?: string;
  primeiro_nome?: string;
  sobrenome?: string;
  telefone?: string;
  funcao_comprador: boolean;
  funcao_vendedor: boolean;
  pref_cidade?: string;
  pref_uf?: string;
  pref_id_estado?: number;
  pref_id_municipio?: number;
  onboarding_concluido: boolean;
  onboarding_pulado: boolean;
};

export async function getUsuario(uid: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", uid)
    .single();

  if (error) return null;
  return data as Usuario;
}

export async function criarOuAtualizarUsuario(
  uid: string,
  campos: Partial<Usuario>
) {
  const { error } = await supabase
    .from("usuarios")
    .upsert({ id: uid, ...campos });

  if (error) throw error;
}

export async function salvarPreferencias(
  uid: string,
  params: {
    funcaoComprador: boolean;
    funcaoVendedor: boolean;
    cidade: string;
    uf: string;
    idEstado?: number | null;
    idMunicipio?: number | null;
  }
) {
  const { error } = await supabase.from("usuarios").upsert({
    id: uid,
    funcao_comprador: params.funcaoComprador,
    funcao_vendedor: params.funcaoVendedor,
    pref_cidade: params.cidade,
    pref_uf: params.uf,
    pref_id_estado: params.idEstado ?? null,
    pref_id_municipio: params.idMunicipio ?? null,
    onboarding_concluido: true,
  });

  if (error) throw error;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function subscribeUsuario(
  uid: string,
  callback: (usuario: Usuario | null) => void
) {
  // ✅ Busca inicial
  getUsuario(uid).then(callback);

  // ✅ Realtime — ouve qualquer mudança na linha do usuário
  const channel = supabase
    .channel(`usuario-${uid}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "usuarios",
        filter: `id=eq.${uid}`,
      },
      async () => {
        // rebusca ao invés de usar o payload — mais confiável
        const usuario = await getUsuario(uid);
        callback(usuario);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}