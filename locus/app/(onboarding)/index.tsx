import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";

import { supabase } from "@/src/supabase";
import { salvarPreferencias, criarOuAtualizarUsuario } from "@/src/services/usuariosSupa";
import { styles } from "./styles";

type Funcoes = { comprador: boolean; vendedor: boolean };
type Estado = { id: number; sigla: string; nome: string };
type Municipio = { id: number; nome: string };

const IBGE_ESTADOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados";
const IBGE_MUNICIPIOS_POR_UF = (ufId: number) =>
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufId}/municipios`;

function normalizarTexto(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function OnboardingScreen() {
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [carregando, setCarregando] = useState(true);
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
  const [erroCidade, setErroCidade] = useState("");
  const [erroUf, setErroUf] = useState("");

  const funcoesValidas = useMemo(() => funcoes.comprador || funcoes.vendedor, [funcoes]);

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

        const [estadosLista, { data: usuarioData }] = await Promise.all([
          fetchEstados(),
          supabase.from("usuarios").select("*").eq("id", user.id).single(),
        ]);

        setEstados(estadosLista);

        if (usuarioData) {
          if (usuarioData.onboarding_concluido) {
            router.replace("/(tabs)");
            return;
          }

          setFuncoes({
            comprador: !!usuarioData.funcao_comprador,
            vendedor: !!usuarioData.funcao_vendedor,
          });

          const ufSalvo = usuarioData.pref_uf ?? "";
          const cidadeSalva = usuarioData.pref_cidade ?? "";

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

        setCarregando(false);
      } catch {
        setCarregando(false);
        Alert.alert("Ops", "Não consegui carregar seu onboarding. Tenta de novo.");
      }
    };

    run();
  }, []);

  function limparErros() {
    setErroFuncoes("");
    setErroCidade("");
    setErroUf("");
  }

  function validarEtapa1() {
    limparErros();
    if (!funcoesValidas) {
      setErroFuncoes("Selecione pelo menos uma opção (comprador, vendedor ou ambos).");
      return false;
    }
    return true;
  }

  function validarEtapa2() {
    limparErros();
    let ok = true;
    if (!estadoSelecionado?.sigla) { setErroUf("Selecione um estado (UF)."); ok = false; }
    if (!municipioSelecionado) { setErroCidade("Selecione uma cidade da lista de sugestões."); ok = false; }
    return ok;
  }

  function toggleFuncao(chave: keyof Funcoes) {
    setFuncoes((prev) => ({ ...prev, [chave]: !prev[chave] }));
    if (erroFuncoes) setErroFuncoes("");
  }

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

  async function salvarOnboarding({ pulado }: { pulado: boolean }) {
    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      if (pulado) {
        await criarOuAtualizarUsuario(user.id, {
          onboarding_pulado: true,
          onboarding_concluido: true,
        });
      } else {
        await salvarPreferencias(user.id, {
          funcaoComprador: funcoes.comprador,
          funcaoVendedor: funcoes.vendedor,
          cidade: municipioSelecionado!.nome,
          uf: estadoSelecionado!.sigla,
          idEstado: estadoSelecionado!.id,
          idMunicipio: municipioSelecionado!.id,
        });
      }

      router.replace("/(tabs)");
    } catch {
      Alert.alert("Erro", "Não consegui salvar. Tenta novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Carregando…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>
              {etapa === 1 ? "Como você vai usar o Locus?" : "Cidade Residência"}
            </Text>
            <Text style={styles.subtitle}>
              {etapa === 1
                ? "Isso ajuda a gente a mostrar o que faz mais sentido pra você."
                : "Você pode editar isso depois no seu perfil."}
            </Text>
          </View>

          {etapa === 1 ? (
            <>
              <View style={styles.cards}>
                <Pressable onPress={() => toggleFuncao("comprador")} style={[styles.card, funcoes.comprador && styles.cardActive]}>
                  <Text style={styles.cardTitle}>Comprador</Text>
                  <Text style={styles.cardDesc}>Ver imóveis e favoritar opções.</Text>
                </Pressable>
                <Pressable onPress={() => toggleFuncao("vendedor")} style={[styles.card, funcoes.vendedor && styles.cardActive]}>
                  <Text style={styles.cardTitle}>Vendedor</Text>
                  <Text style={styles.cardDesc}>Criar anúncios e receber contatos.</Text>
                </Pressable>
              </View>

              <Text style={styles.hint}>Dica: pode marcar as duas opções sem problema!</Text>
              {!!erroFuncoes && <Text style={styles.error}>{erroFuncoes}</Text>}

              <View style={styles.footerRow}>
                <Pressable onPress={() => salvarOnboarding({ pulado: true })} disabled={salvando} style={styles.linkBtn}>
                  <Text style={styles.linkText}>Pular</Text>
                </Pressable>
                <Pressable
                  onPress={() => { if (!validarEtapa1()) return; setEtapa(2); }}
                  disabled={salvando}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryText}>Continuar</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.form}>
                <Text style={styles.label}>Estado (UF)</Text>
                <Pressable onPress={() => setModalEstadosAberto(true)} style={styles.selectInput}>
                  <Text style={estadoSelecionado ? styles.selectText : styles.selectPlaceholder}>
                    {estadoSelecionado
                      ? `${estadoSelecionado.sigla} — ${estadoSelecionado.nome}`
                      : "Selecione um estado"}
                  </Text>
                </Pressable>
                {!!erroUf && <Text style={styles.error}>{erroUf}</Text>}

                <Text style={styles.label}>Cidade</Text>
                <TextInput
                  value={cidade}
                  onChangeText={(t) => { setCidade(t); setMunicipioSelecionado(null); if (erroCidade) setErroCidade(""); }}
                  placeholder={estadoSelecionado ? "Comece digitando e selecione na lista…" : "Selecione um estado primeiro"}
                  style={[styles.input, !estadoSelecionado && styles.inputDisabled]}
                  autoCapitalize="words"
                  editable={!!estadoSelecionado && !carregandoMunicipios}
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
                        <Text>{m.nome}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {!!municipioSelecionado && <Text style={styles.okText}>Selecionado: {municipioSelecionado.nome}</Text>}
                {!!erroCidade && <Text style={styles.error}>{erroCidade}</Text>}
              </View>

              <View style={styles.footerRow}>
                <Pressable onPress={() => setEtapa(1)} disabled={salvando} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>Voltar</Text>
                </Pressable>
                <Pressable
                  onPress={() => { if (!validarEtapa2()) return; salvarOnboarding({ pulado: false }); }}
                  disabled={salvando}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryText}>{salvando ? "Salvando…" : "Finalizar"}</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => salvarOnboarding({ pulado: true })}
                disabled={salvando}
                style={[styles.linkBtn, { alignSelf: "flex-end", marginTop: 10 }]}
              >
                <Text style={styles.linkText}>Pular</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        <Modal visible={modalEstadosAberto} animationType="slide" transparent onRequestClose={() => setModalEstadosAberto(false)}>
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
    </SafeAreaView>
  );
}