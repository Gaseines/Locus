import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "@/src/firebase";

type Funcoes = { comprador: boolean; vendedor: boolean };
type Estado = { id: number; sigla: string; nome: string };
type Municipio = { id: number; nome: string };

const IBGE_ESTADOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados";
const IBGE_MUNICIPIOS_POR_UF = (ufId: number) =>
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufId}/municipios`;

function normalizarTexto(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function PreferenciasScreen() {
  const uid = auth.currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [funcoes, setFuncoes] = useState<Funcoes>({ comprador: true, vendedor: false });

  const [estados, setEstados] = useState<Estado[]>([]);
  const [modalEstadosAberto, setModalEstadosAberto] = useState(false);
  const [buscaEstado, setBuscaEstado] = useState("");
  const [estadoSelecionado, setEstadoSelecionado] = useState<Estado | null>(null);

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [carregandoMunicipios, setCarregandoMunicipios] = useState(false);
  const municipiosCache = useRef<Record<number, Municipio[]>>({});

  const [cidade, setCidade] = useState("");
  const [municipioSelecionado, setMunicipioSelecionado] = useState<Municipio | null>(null);

  const [erroFuncoes, setErroFuncoes] = useState("");
  const [erroUf, setErroUf] = useState("");
  const [erroCidade, setErroCidade] = useState("");

  async function fetchEstados(): Promise<Estado[]> {
    const res = await fetch(IBGE_ESTADOS_URL);
    if (!res.ok) throw new Error("Falha ao buscar estados");
    const data = (await res.json()) as any[];
    return data
      .map((e) => ({ id: e.id, sigla: e.sigla, nome: e.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  async function fetchMunicipios(estadoId: number): Promise<Municipio[]> {
    if (municipiosCache.current[estadoId]) return municipiosCache.current[estadoId];

    const res = await fetch(IBGE_MUNICIPIOS_POR_UF(estadoId));
    if (!res.ok) throw new Error("Falha ao buscar municípios");
    const data = (await res.json()) as any[];
    const lista = data
      .map((m) => ({ id: m.id, nome: m.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    municipiosCache.current[estadoId] = lista;
    return lista;
  }

  useEffect(() => {
    const run = async () => {
      try {
        if (!uid) {
          router.replace("/(auth)/login");
          return;
        }

        const ref = doc(db, "usuarios", uid);
        const [snap, estadosLista] = await Promise.all([getDoc(ref), fetchEstados()]);
        setEstados(estadosLista);

        if (snap.exists()) {
          const data: any = snap.data();

          // funcoes
          if (data?.funcoes) {
            setFuncoes({
              comprador: !!data.funcoes.comprador,
              vendedor: !!data.funcoes.vendedor,
            });
          }

          // preferencias
          const ufSalvo = data?.preferencias?.uf ? String(data.preferencias.uf) : "";
          const cidadeSalva = data?.preferencias?.cidade ? String(data.preferencias.cidade) : "";

          if (ufSalvo) {
            const estado = estadosLista.find((e) => e.sigla === ufSalvo.toUpperCase()) ?? null;
            setEstadoSelecionado(estado);

            if (estado) {
              setCarregandoMunicipios(true);
              try {
                const lista = await fetchMunicipios(estado.id);
                setMunicipios(lista);

                if (cidadeSalva) {
                  const match = lista.find(
                    (m) => normalizarTexto(m.nome) === normalizarTexto(cidadeSalva)
                  );
                  if (match) {
                    setCidade(match.nome);
                    setMunicipioSelecionado(match);
                  } else {
                    setCidade(cidadeSalva);
                    setMunicipioSelecionado(null);
                  }
                }
              } finally {
                setCarregandoMunicipios(false);
              }
            }
          } else if (cidadeSalva) {
            setCidade(cidadeSalva);
          }
        }

        setLoading(false);
      } catch (e: any) {
        setLoading(false);
        Alert.alert("Erro", e?.message ?? "Não consegui carregar suas preferências.");
      }
    };

    run();
  }, [uid]);

  function toggleFuncao(chave: keyof Funcoes) {
    setFuncoes((prev) => ({ ...prev, [chave]: !prev[chave] }));
    if (erroFuncoes) setErroFuncoes("");
  }

  const funcoesValidas = useMemo(() => funcoes.comprador || funcoes.vendedor, [funcoes]);

  const estadosFiltrados = useMemo(() => {
    const q = normalizarTexto(buscaEstado);
    if (!q) return estados;
    return estados.filter((e) => normalizarTexto(`${e.sigla} ${e.nome}`).includes(q));
  }, [buscaEstado, estados]);

  const sugestoesCidades = useMemo(() => {
    if (!estadoSelecionado) return [];
    const q = normalizarTexto(cidade);
    if (!q || q.length < 2) return [];
    return municipios
      .filter((m) => normalizarTexto(m.nome).includes(q))
      .slice(0, 8);
  }, [cidade, municipios, estadoSelecionado]);

  async function selecionarEstado(estado: Estado) {
    setEstadoSelecionado(estado);
    setErroUf("");
    setModalEstadosAberto(false);

    setCidade("");
    setMunicipioSelecionado(null);
    setErroCidade("");

    setCarregandoMunicipios(true);
    try {
      const lista = await fetchMunicipios(estado.id);
      setMunicipios(lista);
    } catch {
      Alert.alert("Ops", "Não consegui carregar as cidades desse estado.");
      setMunicipios([]);
    } finally {
      setCarregandoMunicipios(false);
    }
  }

  function selecionarCidade(m: Municipio) {
    setCidade(m.nome);
    setMunicipioSelecionado(m);
    setErroCidade("");
  }

  function validar() {
    setErroFuncoes("");
    setErroUf("");
    setErroCidade("");

    let ok = true;

    if (!funcoesValidas) {
      setErroFuncoes("Selecione pelo menos uma opção (comprador, vendedor ou ambos).");
      ok = false;
    }

    if (!estadoSelecionado) {
      setErroUf("Selecione um estado (UF).");
      ok = false;
    }

    if (!municipioSelecionado) {
      setErroCidade("Selecione uma cidade da lista de sugestões.");
      ok = false;
    }

    return ok;
  }

  async function salvar() {
    try {
      if (!uid) return;
      if (!validar()) return;

      setSalvando(true);

      const ref = doc(db, "usuarios", uid);

      await setDoc(
        ref,
        {
          funcoes: {
            comprador: !!funcoes.comprador,
            vendedor: !!funcoes.vendedor,
          },
          preferencias: {
            cidade: municipioSelecionado?.nome ?? cidade.trim(),
            uf: estadoSelecionado?.sigla?.toUpperCase() ?? null,
            estadoNome: estadoSelecionado?.nome ?? null,
            idEstado: estadoSelecionado?.id ?? null,
            idMunicipio: municipioSelecionado?.id ?? null,
          },
          // garante consistência
          onboardingConcluido: true,
          onboardingPulado: false,
          atualizadoEm: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert("Sucesso", "Preferências atualizadas!");
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não consegui salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <View style={stylesCenter.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Preferências</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Intenção</Text>

          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => toggleFuncao("comprador")}
              style={[styles.optionCard, funcoes.comprador && styles.optionCardActive]}
            >
              <Text style={styles.optionTitle}>Comprador</Text>
              <Text style={styles.optionDesc}>Ver imóveis e favoritar opções.</Text>
            </Pressable>

            <Pressable
              onPress={() => toggleFuncao("vendedor")}
              style={[styles.optionCard, funcoes.vendedor && styles.optionCardActive]}
            >
              <Text style={styles.optionTitle}>Vendedor</Text>
              <Text style={styles.optionDesc}>Criar anúncios e receber contatos.</Text>
            </Pressable>

            {!!erroFuncoes && <Text style={styles.error}>{erroFuncoes}</Text>}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Local</Text>

          <Text style={styles.label}>Estado (UF)</Text>
          <Pressable onPress={() => setModalEstadosAberto(true)} style={styles.selectInput}>
            <Text style={estadoSelecionado ? styles.selectText : styles.selectPlaceholder}>
              {estadoSelecionado
                ? `${estadoSelecionado.sigla} — ${estadoSelecionado.nome}`
                : "Selecione um estado"}
            </Text>
          </Pressable>
          {!!erroUf && <Text style={styles.error}>{erroUf}</Text>}

          <Text style={[styles.label, { marginTop: 12 }]}>Cidade</Text>
          <TextInput
            value={cidade}
            onChangeText={(t) => {
              setCidade(t);
              setMunicipioSelecionado(null); // digitar invalida seleção anterior
              if (erroCidade) setErroCidade("");
            }}
            placeholder={estadoSelecionado ? "Digite e selecione na lista…" : "Selecione um estado primeiro"}
            style={[styles.input, !estadoSelecionado && styles.inputDisabled]}
            autoCapitalize="words"
            editable={!!estadoSelecionado && !carregandoMunicipios}
          />

          {carregandoMunicipios && (
            <View style={{ marginTop: 8, flexDirection: "row", gap: 8, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ opacity: 0.7 }}>Carregando cidades…</Text>
            </View>
          )}

          {!!estadoSelecionado && sugestoesCidades.length > 0 && (
            <View style={styles.sugestoesBox}>
              {sugestoesCidades.map((m) => (
                <Pressable key={m.id} onPress={() => selecionarCidade(m)} style={styles.sugestaoItem}>
                  <Text>{m.nome}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {!!municipioSelecionado && (
            <Text style={styles.okText}>Selecionado: {municipioSelecionado.nome}</Text>
          )}

          {!!erroCidade && <Text style={styles.error}>{erroCidade}</Text>}
        </View>

        <Pressable style={styles.primaryBtn} onPress={salvar} disabled={salvando}>
          <Text style={styles.primaryText}>{salvando ? "Salvando…" : "Salvar"}</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.back()} disabled={salvando}>
          <Text style={styles.secondaryText}>Cancelar</Text>
        </Pressable>
      </ScrollView>

      {/* Modal Estados */}
      <Modal
        visible={modalEstadosAberto}
        animationType="slide"
        transparent
        onRequestClose={() => setModalEstadosAberto(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalEstadosAberto(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecione seu estado</Text>

          <TextInput
            value={buscaEstado}
            onChangeText={setBuscaEstado}
            placeholder="Buscar (ex: SC, Santa Catarina)"
            style={styles.modalSearch}
            autoCapitalize="none"
          />

          <FlatList
            data={estadosFiltrados}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => selecionarEstado(item)} style={styles.estadoItem}>
                <Text style={{ fontWeight: "700" }}>{item.sigla}</Text>
                <Text style={{ marginLeft: 10 }}>{item.nome}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const stylesCenter = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 36, gap: 14 },
  title: { fontSize: 22, fontWeight: "800" },

  card: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", marginBottom: 10, color: "#111" },

  optionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fafafa",
  },
  optionCardActive: {
    borderColor: "#5A9F78",
    backgroundColor: "#D7EBDD",
  },
  optionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  optionDesc: { fontSize: 13, opacity: 0.75 },

  label: { fontSize: 12, opacity: 0.7 },

  input: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    marginTop: 6,
  },
  inputDisabled: { opacity: 0.6, backgroundColor: "#f7f7f7" },

  selectInput: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginTop: 6,
  },
  selectText: { fontSize: 15 },
  selectPlaceholder: { fontSize: 15, opacity: 0.6 },

  sugestoesBox: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 6,
    backgroundColor: "#fff",
  },
  sugestaoItem: { paddingVertical: 10, paddingHorizontal: 12 },

  okText: { marginTop: 8, color: "#2e7d32", fontWeight: "800" },

  error: { color: "#d11", marginTop: 8 },

  primaryBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5A9F78",
  },
  primaryText: { fontWeight: "900", color: "#fff" },

  secondaryBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAEAEA",
  },
  secondaryText: { fontWeight: "900", color: "#111" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  modalContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900" },
  modalSearch: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  estadoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  separator: { height: 1, backgroundColor: "#f0f0f0" },
});