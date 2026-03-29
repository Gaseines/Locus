import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from "react-native";
import { router } from "expo-router";

import { supabase } from "@/src/supabase";
import { salvarPreferencias, getUsuario } from "@/src/services/usuariosSupa";

type Funcoes = { comprador: boolean; vendedor: boolean };
type Estado = { id: number; sigla: string; nome: string };
type Municipio = { id: number; nome: string };

const IBGE_ESTADOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados";
const IBGE_MUNICIPIOS_POR_UF = (ufId: number) =>
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufId}/municipios`;

function normalizarTexto(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function PreferenciasScreen() {
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/(auth)/login"); return; }

        const [estadosLista, usuario] = await Promise.all([
          fetchEstados(),
          getUsuario(user.id),
        ]);

        setEstados(estadosLista);

        if (usuario) {
          setFuncoes({
            comprador: !!usuario.funcao_comprador,
            vendedor: !!usuario.funcao_vendedor,
          });

          const ufSalvo = usuario.pref_uf ?? "";
          const cidadeSalva = usuario.pref_cidade ?? "";

          if (ufSalvo) {
            const estado = estadosLista.find((e) => e.sigla === ufSalvo.toUpperCase()) ?? null;
            setEstadoSelecionado(estado);

            if (estado) {
              setCarregandoMunicipios(true);
              try {
                const lista = await fetchMunicipios(estado.id);
                setMunicipios(lista);
                if (cidadeSalva) {
                  const match = lista.find((m) => normalizarTexto(m.nome) === normalizarTexto(cidadeSalva)) ?? null;
                  if (match) { setCidade(match.nome); setMunicipioSelecionado(match); }
                  else setCidade(cidadeSalva);
                }
              } finally {
                setCarregandoMunicipios(false);
              }
            }
          }
        }
      } catch (e: any) {
        Alert.alert("Erro", e?.message ?? "Não foi possível carregar as preferências.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const estadosFiltrados = useMemo(() => {
    if (!buscaEstado.trim()) return estados;
    const b = normalizarTexto(buscaEstado);
    return estados.filter(
      (e) => normalizarTexto(e.sigla).includes(b) || normalizarTexto(e.nome).includes(b)
    );
  }, [estados, buscaEstado]);

  const sugestoesCidades = useMemo(() => {
    if (!cidade.trim() || municipioSelecionado) return [];
    const b = normalizarTexto(cidade);
    return municipios.filter((m) => normalizarTexto(m.nome).includes(b)).slice(0, 6);
  }, [cidade, municipios, municipioSelecionado]);

  async function selecionarEstado(estado: Estado) {
    setEstadoSelecionado(estado);
    setErroUf("");
    setModalEstadosAberto(false);
    setBuscaEstado("");
    setCidade("");
    setMunicipioSelecionado(null);
    setErroCidade("");
    setCarregandoMunicipios(true);
    try {
      const lista = await fetchMunicipios(estado.id);
      setMunicipios(lista);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as cidades.");
    } finally {
      setCarregandoMunicipios(false);
    }
  }

  function selecionarCidade(m: Municipio) {
    setCidade(m.nome);
    setMunicipioSelecionado(m);
    setErroCidade("");
  }

  async function salvar() {
    setErroFuncoes("");
    setErroUf("");
    setErroCidade("");

    if (!funcoes.comprador && !funcoes.vendedor) {
      setErroFuncoes("Selecione pelo menos uma função.");
      return;
    }
    if (!estadoSelecionado) { setErroUf("Selecione um estado."); return; }
    if (!municipioSelecionado) { setErroCidade("Selecione uma cidade da lista."); return; }

    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      await salvarPreferencias(user.id, {
        funcaoComprador: funcoes.comprador,
        funcaoVendedor: funcoes.vendedor,
        cidade: municipioSelecionado.nome,
        uf: estadoSelecionado.sigla,
        idEstado: estadoSelecionado.id,
        idMunicipio: municipioSelecionado.id,
      });

      Alert.alert("Salvo!", "Suas preferências foram atualizadas.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5A9F78" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Preferências</Text>

        {/* Funções */}
        <Text style={styles.label}>Você é:</Text>
        <View style={styles.row}>
          {(["comprador", "vendedor"] as (keyof Funcoes)[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFuncoes((prev) => ({ ...prev, [f]: !prev[f] }))}
              style={[styles.chip, funcoes[f] && styles.chipAtivo]}
            >
              <Text style={[styles.chipText, funcoes[f] && styles.chipTextAtivo]}>
                {f === "comprador" ? "Comprador" : "Vendedor"}
              </Text>
            </Pressable>
          ))}
        </View>
        {!!erroFuncoes && <Text style={styles.error}>{erroFuncoes}</Text>}

        {/* Estado */}
        <Text style={[styles.label, { marginTop: 16 }]}>Estado (UF)</Text>
        <Pressable style={styles.selectInput} onPress={() => setModalEstadosAberto(true)}>
          <Text style={estadoSelecionado ? styles.selectText : styles.selectPlaceholder}>
            {estadoSelecionado
              ? `${estadoSelecionado.sigla} — ${estadoSelecionado.nome}`
              : "Selecione um estado"}
          </Text>
        </Pressable>
        {!!erroUf && <Text style={styles.error}>{erroUf}</Text>}

        {/* Cidade */}
        <Text style={[styles.label, { marginTop: 12 }]}>Cidade</Text>
        <TextInput
          value={cidade}
          onChangeText={(t) => { setCidade(t); setMunicipioSelecionado(null); if (erroCidade) setErroCidade(""); }}
          placeholder={estadoSelecionado ? "Digite e selecione na lista…" : "Selecione um estado primeiro"}
          placeholderTextColor="#999"
          editable={!!estadoSelecionado && !carregandoMunicipios}
          style={[styles.input, !estadoSelecionado && { opacity: 0.6 }]}
        />

        {carregandoMunicipios && (
          <View style={styles.rowLoading}>
            <ActivityIndicator />
            <Text style={styles.rowLoadingText}>Carregando cidades…</Text>
          </View>
        )}

        {!!estadoSelecionado && sugestoesCidades.length > 0 && (
          <View style={styles.sugestoesBox}>
            {sugestoesCidades.map((m) => (
              <Pressable key={m.id} onPress={() => selecionarCidade(m)} style={styles.sugestaoItem}>
                <Text style={{ color: "#111" }}>{m.nome}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {!!municipioSelecionado && <Text style={styles.okText}>✓ {municipioSelecionado.nome}</Text>}
        {!!erroCidade && <Text style={styles.error}>{erroCidade}</Text>}

        {/* Botões */}
        <Pressable
          style={[styles.primaryBtn, salvando && { opacity: 0.75 }]}
          onPress={salvar}
          disabled={salvando}
        >
          {salvando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryText}>Salvar preferências</Text>}
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.back()} disabled={salvando}>
          <Text style={styles.secondaryText}>Cancelar</Text>
        </Pressable>
      </ScrollView>

      {/* Modal estados */}
      <Modal visible={modalEstadosAberto} animationType="slide" transparent onRequestClose={() => setModalEstadosAberto(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalEstadosAberto(false)} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Selecione seu estado</Text>
          <TextInput
            value={buscaEstado}
            onChangeText={setBuscaEstado}
            placeholder="Buscar (ex: SC, Santa Catarina)"
            placeholderTextColor="#999"
            style={styles.modalSearch}
            autoCapitalize="none"
          />
          <FlatList
            data={estadosFiltrados}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => selecionarEstado(item)} style={styles.estadoItem}>
                <Text style={{ fontWeight: "900", color: "#111" }}>{item.sigla}</Text>
                <Text style={{ marginLeft: 10, color: "#111" }}>{item.nome}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8F8F6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "900", color: "#111", marginBottom: 16 },

  label: { fontSize: 13, fontWeight: "800", color: "#5b5b5b", marginBottom: 6 },
  row: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: "#E5E5E5",
    alignItems: "center", backgroundColor: "#fff",
  },
  chipAtivo: { backgroundColor: "#5A9F78", borderColor: "#5A9F78" },
  chipText: { fontWeight: "800", color: "#5b5b5b" },
  chipTextAtivo: { color: "#fff" },

  input: {
    borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: "#111", backgroundColor: "#fff", fontSize: 15,
  },
  selectInput: {
    borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: "#fff", flexDirection: "row",
    alignItems: "center", justifyContent: "space-between",
  },
  selectText: { color: "#111", fontWeight: "800", flex: 1 },
  selectPlaceholder: { color: "#999", flex: 1 },

  rowLoading: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  rowLoadingText: { color: "#5b5b5b", fontSize: 13 },

  sugestoesBox: {
    borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 10,
    overflow: "hidden", backgroundColor: "#fff", marginTop: 4,
  },
  sugestaoItem: { paddingVertical: 11, paddingHorizontal: 12 },
  okText: { color: "#5A9F78", fontWeight: "800", marginTop: 6, fontSize: 13 },
  error: { color: "#C0392B", fontSize: 12, marginTop: 4 },

  primaryBtn: {
    height: 48, borderRadius: 10, alignItems: "center",
    justifyContent: "center", backgroundColor: "#5A9F78", marginTop: 24,
  },
  primaryText: { fontWeight: "900", color: "#fff", fontSize: 16 },
  secondaryBtn: {
    height: 48, borderRadius: 10, alignItems: "center",
    justifyContent: "center", borderWidth: 1, borderColor: "#E5E5E5", marginTop: 10,
  },
  secondaryText: { fontWeight: "800", color: "#5b5b5b" },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopLeftRadius: 18,
    borderTopRightRadius: 18, padding: 16, maxHeight: "75%",
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#111", marginBottom: 10 },
  modalSearch: {
    borderWidth: 1, borderColor: "#E5E5E5", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: "#111",
    backgroundColor: "#F8F8F6", marginBottom: 10,
  },
  estadoItem: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 4 },
  separator: { height: 1, backgroundColor: "#F0F0F0" },
});