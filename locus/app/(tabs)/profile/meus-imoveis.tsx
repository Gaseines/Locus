import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Pressable, Text, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { supabase } from "@/src/supabase";
import {
  atualizarStatusImovel,
  deletarImovel,
  Imovel,
  StatusImovel,
  subscribeImoveisDono,
} from "@/src/services/imoveisSupa";
import { styles } from "./meus-imoveis.styles";

type Filtro = "todos" | StatusImovel;

function formatPreco(centavos?: number) {
  if (!centavos) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(centavos / 100);
  } catch {
    return `R$ ${Math.round((centavos ?? 0) / 100)}`;
  }
}

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos",     label: "Todos"      },
  { key: "publicado", label: "Publicados" },
  { key: "rascunho",  label: "Rascunhos"  },
  { key: "arquivado", label: "Arquivados" },
];

const STATUS_CONFIG: Record<StatusImovel, { label: string; cor: string; fundo: string }> = {
  publicado: { label: "Publicado", cor: "#5A9F78", fundo: "#D7EBDD" },
  rascunho:  { label: "Rascunho",  cor: "#888",    fundo: "#F0F0F0" },
  arquivado: { label: "Arquivado", cor: "#C0392B", fundo: "#FDECEA" },
};

function BotaoAcao({ label, icone, cor, onPress }: {
  label: string;
  icone: React.ComponentProps<typeof Ionicons>["name"];
  cor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.acaoBtn, pressed && { opacity: 0.65 }]}
      onPress={onPress}
    >
      <Ionicons name={icone} size={16} color={cor} />
      <Text style={[styles.acaoText, { color: cor }]}>{label}</Text>
    </Pressable>
  );
}

function ImovelCard({ item, onAcao, onEditar, onApagar }: {
  item: Imovel;
  onAcao: (id: string, acao: "publicar" | "arquivar" | "reativar") => void;
  onEditar: (item: Imovel) => void;
  onApagar: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.rascunho;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitulo} numberOfLines={1}>{item.titulo ?? "Sem título"}</Text>
        <View style={[styles.badge, { backgroundColor: cfg.fundo }]}>
          <Text style={[styles.badgeText, { color: cfg.cor }]}>{cfg.label}</Text>
        </View>
      </View>

      <Text style={styles.cardSub}>
        {[item.tipo, item.cidade && item.uf ? `${item.cidade} — ${item.uf}` : item.cidade ?? item.uf]
          .filter(Boolean).join(" · ")}
      </Text>

      <Text style={styles.cardPreco}>{formatPreco(item.preco_centavos)}</Text>

      <View style={styles.cardAcoes}>
        {item.status === "rascunho" && (
          <BotaoAcao label="Publicar" icone="checkmark-circle-outline" cor="#5A9F78" onPress={() => onAcao(item.id, "publicar")} />
        )}
        {(item.status === "rascunho" || item.status === "publicado") && (
          <BotaoAcao label="Arquivar" icone="archive-outline" cor="#888" onPress={() => onAcao(item.id, "arquivar")} />
        )}
        {item.status === "arquivado" && (
          <BotaoAcao label="Reativar" icone="refresh-outline" cor="#5A9F78" onPress={() => onAcao(item.id, "reativar")} />
        )}
      </View>

      <View style={styles.cardAcoesSecundarias}>
        <BotaoAcao label="Editar" icone="pencil-outline" cor="#5b5b5b" onPress={() => onEditar(item)} />
        <BotaoAcao label="Apagar" icone="trash-outline" cor="#C0392B" onPress={() => onApagar(item.id)} />
      </View>
    </View>
  );
}

export default function MeusImoveisScreen() {
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  useEffect(() => {
    let unsub: (() => void) | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      unsub = subscribeImoveisDono(user.id, (lista) => {
        lista.sort((a, b) => {
          const ordem: Record<StatusImovel, number> = { publicado: 0, rascunho: 1, arquivado: 2 };
          const diff = (ordem[a.status] ?? 3) - (ordem[b.status] ?? 3);
          if (diff !== 0) return diff;
          return new Date(b.criado_em ?? 0).getTime() - new Date(a.criado_em ?? 0).getTime();
        });
        setImoveis(lista);
        setLoading(false);
      });
    });

    return () => { unsub?.(); };
  }, []);

  const imoveisFiltrados = useMemo(() => {
    if (filtro === "todos") return imoveis;
    return imoveis.filter((im) => im.status === filtro);
  }, [imoveis, filtro]);

  const contadores = useMemo(() => {
    const c: Record<Filtro, number> = { todos: imoveis.length, publicado: 0, rascunho: 0, arquivado: 0 };
    imoveis.forEach((im) => { if (im.status in c) c[im.status as StatusImovel]++; });
    return c;
  }, [imoveis]);

  async function handleAcao(id: string, acao: "publicar" | "arquivar" | "reativar") {
    const novoStatus: StatusImovel =
      acao === "publicar" ? "publicado" : acao === "arquivar" ? "arquivado" : "rascunho";
    const labels = { publicar: "publicar este imóvel?", arquivar: "arquivar este imóvel?", reativar: "reativar este imóvel como rascunho?" };

    Alert.alert("Confirmar", `Deseja ${labels[acao]}`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: async () => {
        try { await atualizarStatusImovel(id, novoStatus); }
        catch (e: any) { Alert.alert("Erro", e?.message ?? "Não foi possível atualizar."); }
      }},
    ]);
  }

  function handleEditar(item: Imovel) {
    router.push(`/(tabs)/profile/editar-imovel?id=${item.id}`);
  }

  function handleApagar(id: string) {
    Alert.alert("Apagar imóvel", "Esta ação não pode ser desfeita. Deseja continuar?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: async () => {
        try { await deletarImovel(id); }
        catch (e: any) { Alert.alert("Erro", e?.message ?? "Não foi possível apagar."); }
      }},
    ]);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#5A9F78" />
      <Text style={styles.loadingText}>Carregando…</Text>
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={styles.filtrosWrap}>
        <FlatList
          data={FILTROS}
          keyExtractor={(f) => f.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosList}
          renderItem={({ item: f }) => {
            const ativo = filtro === f.key;
            return (
              <Pressable onPress={() => setFiltro(f.key)} style={[styles.filtroChip, ativo && styles.filtroChipAtivo]}>
                <Text style={[styles.filtroText, ativo && styles.filtroTextAtivo]}>
                  {f.label}{contadores[f.key] > 0 ? ` (${contadores[f.key]})` : ""}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={imoveisFiltrados}
        keyExtractor={(im) => im.id}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="home-outline" size={42} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhum imóvel aqui</Text>
            <Text style={styles.emptySub}>
              {filtro === "todos" ? "Você ainda não cadastrou nenhum imóvel." : `Nenhum imóvel com status "${filtro}".`}
            </Text>
            {filtro === "todos" && (
              <Pressable style={styles.emptyBtn} onPress={() => router.push("/(tabs)/profile/novo-imovel")}>
                <Text style={styles.emptyBtnText}>Anunciar imóvel</Text>
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ImovelCard item={item} onAcao={handleAcao} onEditar={handleEditar} onApagar={handleApagar} />
        )}
      />
    </View>
  );
}