import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  Platform,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/src/firebase";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { buscarImoveisPorRaio, Imovel } from "@/src/services/imoveisProximos";
import { MAPA_ESTILO, styles } from "./home.styles";
import { PriceMarker } from "@/components/PriceMarker";

type UsuarioDoc = {
  funcoes?: { comprador?: boolean; vendedor?: boolean };
  preferencias?: { cidade?: string; uf?: string };
};

type EstadoIBGE = { id: number; sigla: string; nome: string };
type MunicipioIBGE = { id: number; nome: string };

function formatarPreco(precoCentavos?: number) {
  if (!precoCentavos) return "Preço a combinar";
  const v = precoCentavos / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function norm(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function getUserLocationSafe() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const last = await Location.getLastKnownPositionAsync({});
  if (last?.coords?.latitude && last?.coords?.longitude) {
    return { latitude: last.coords.latitude, longitude: last.coords.longitude };
  }

  const timeoutMs = 6000;
  const pos = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
  ]);

  const p: any = pos;
  return { latitude: p.coords.latitude, longitude: p.coords.longitude };
}

async function fetchEstadosIBGE(): Promise<EstadoIBGE[]> {
  const res = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados");
  if (!res.ok) throw new Error("Falha ao carregar estados IBGE");
  const data = (await res.json()) as EstadoIBGE[];
  return data.sort((a, b) => a.nome.localeCompare(b.nome));
}

async function fetchMunicipiosIBGE(estadoId: number): Promise<MunicipioIBGE[]> {
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`
  );
  if (!res.ok) throw new Error("Falha ao carregar municípios IBGE");
  const data = (await res.json()) as MunicipioIBGE[];
  return data.sort((a, b) => a.nome.localeCompare(b.nome));
}

export default function HomeTab() {
  const mapRef = useRef<MapView>(null);
  const listaRef = useRef<FlatList<Imovel>>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // evita rebuscar mil vezes quando volta pra Home e também no load inicial
  const jaBuscouInicialRef = useRef(false);

  const [usuario, setUsuario] = useState<UsuarioDoc | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [posUsuario, setPosUsuario] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

  const [region, setRegion] = useState<Region>({
    latitude: -26.6367,
    longitude: -48.6937,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [areaMudou, setAreaMudou] = useState(false);

  // performance markers custom
  const [markersReady, setMarkersReady] = useState(false);

  // 🔎 BUSCA (NÃO salva no Firestore)
  const [buscaModalVisible, setBuscaModalVisible] = useState(false);
  const [buscaAtiva, setBuscaAtiva] = useState<{ cidade: string; uf: string } | null>(null);

  // IBGE - Estados/Municípios
  const [estados, setEstados] = useState<EstadoIBGE[]>([]);
  const [estadoModalVisible, setEstadoModalVisible] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [estadoSelecionado, setEstadoSelecionado] = useState<EstadoIBGE | null>(null);

  const [municipios, setMunicipios] = useState<MunicipioIBGE[]>([]);
  const [cidadeInput, setCidadeInput] = useState("");
  const [cidadeSelecionada, setCidadeSelecionada] = useState<MunicipioIBGE | null>(null);
  const [cidadeSugestoesVisivel, setCidadeSugestoesVisivel] = useState(false);

  // usado pra preencher o modal com a busca atual / preferências
  const [prefill, setPrefill] = useState<{ cidade: string; uf: string } | null>(null);

  const uid = auth.currentUser?.uid;

  const modoComprador = useMemo(() => {
    const f = usuario?.funcoes;
    const comprador = f?.comprador !== false; // default true
    const vendedor = !!f?.vendedor;

    if (comprador) return true;
    if (!comprador && vendedor) return false;
    return true;
  }, [usuario]);

  const indexPorId = useMemo(() => {
    const map = new Map<string, number>();
    imoveis.forEach((it, idx) => map.set(it.id, idx));
    return map;
  }, [imoveis]);

  // carrega usuario (funcoes/preferencias)
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "usuarios", uid);
    const unsub = onSnapshot(ref, (snap) => {
      setUsuario(snap.exists() ? (snap.data() as UsuarioDoc) : null);
    });
    return () => unsub();
  }, [uid]);

  function raioKmDaTela(r: Region) {
    const half = (r.latitudeDelta * 111) / 2;
    return Math.max(2, Math.min(25, half));
  }

  const carregarImoveis = useCallback(
    async (centro: { latitude: number; longitude: number }, r: Region) => {
      try {
        setBuscando(true);
        const raioKm = raioKmDaTela(r);
        const lista = await buscarImoveisPorRaio({ centro, raioKm });
        setImoveis(lista);
      } catch (e: any) {
        console.log("ERRO carregarImoveis:", e?.code, e?.message, e);
      } finally {
        setBuscando(false);
      }
    },
    []
  );

  function debouncedMarcarAreaMudou() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setAreaMudou(true), 300);
  }

  useEffect(() => {
    setMarkersReady(false);
    const t = setTimeout(() => setMarkersReady(true), 700);
    return () => clearTimeout(t);
  }, [imoveis.length]);

  // ✅ carrega estados IBGE uma vez
  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchEstadosIBGE();
        setEstados(data);
      } catch (e) {
        console.log("ERRO estados IBGE:", e);
      }
    };
    run();
  }, []);

  // ✅ quando selecionar estado, carrega municípios dele
  useEffect(() => {
    const run = async () => {
      if (!estadoSelecionado?.id) {
        setMunicipios([]);
        return;
      }
      try {
        const data = await fetchMunicipiosIBGE(estadoSelecionado.id);
        setMunicipios(data);
      } catch (e) {
        console.log("ERRO municipios IBGE:", e);
        setMunicipios([]);
      }
    };
    run();
  }, [estadoSelecionado?.id]);

  // ✅ se modal abriu com prefill e já temos estados, seleciona UF automaticamente
  useEffect(() => {
    if (!buscaModalVisible) return;
    if (!prefill) return;
    if (!estados.length) return;

    const uf = prefill.uf?.toUpperCase();
    const st = estados.find((e) => e.sigla === uf) ?? null;

    setEstadoSelecionado(st);
    setCidadeInput(prefill.cidade ?? "");
    setCidadeSelecionada(null);
    setCidadeSugestoesVisivel(false);
  }, [buscaModalVisible, prefill, estados.length]);

  // ✅ quando municípios carregarem, tenta casar a cidade do input e marcar como selecionada (se bater)
  useEffect(() => {
    if (!buscaModalVisible) return;
    if (!municipios.length) return;
    if (!cidadeInput) return;

    const m = municipios.find((x) => norm(x.nome) === norm(cidadeInput));
    if (m) setCidadeSelecionada(m);
  }, [municipios.length, buscaModalVisible]);

  // pega localização ao entrar e faz busca inicial
  useEffect(() => {
    const run = async () => {
      try {
        const loc = await getUserLocationSafe();

        if (loc) {
          setPosUsuario(loc);

          const r: Region = {
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          };

          setRegion(r);
          requestAnimationFrame(() => mapRef.current?.animateToRegion(r, 600));

          await carregarImoveis({ latitude: r.latitude, longitude: r.longitude }, r);
          jaBuscouInicialRef.current = true;
          setAreaMudou(false);
        }
      } catch (e: any) {
        console.log("ERRO getUserLocationSafe:", e?.code, e?.message, e);
      } finally {
        setCarregando(false);
      }
    };

    run();
  }, [carregarImoveis]);

  // quando voltar pra Home, rebusca (ex: após salvar imóvel)
  useFocusEffect(
    useCallback(() => {
      if (carregando) return;
      if (!jaBuscouInicialRef.current) return;

      carregarImoveis({ latitude: region.latitude, longitude: region.longitude }, region);
      setAreaMudou(false);
    }, [
      carregando,
      carregarImoveis,
      region.latitude,
      region.longitude,
      region.latitudeDelta,
      region.longitudeDelta,
    ])
  );

  // se usuário não tem GPS (posUsuario null) e ele alterou preferências, centraliza e busca
  // ⚠️ mas se tiver buscaAtiva, NÃO mexe no mapa
  useEffect(() => {
    const cidade = usuario?.preferencias?.cidade?.trim();
    const uf = usuario?.preferencias?.uf?.trim()?.toUpperCase();

    if (!cidade || !uf) return;
    if (posUsuario) return;
    if (buscaAtiva) return;

    const run = async () => {
      try {
        const results = await Location.geocodeAsync(`${cidade}, ${uf}, Brasil`);
        if (!results?.length) return;

        const { latitude, longitude } = results[0];
        const r: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        };

        setRegion(r);
        mapRef.current?.animateToRegion(r, 600);

        await carregarImoveis({ latitude: r.latitude, longitude: r.longitude }, r);
        setAreaMudou(false);
        jaBuscouInicialRef.current = true;
      } catch (e: any) {
        console.log("ERRO geocode preferências:", e?.code, e?.message, e);
      }
    };

    run();
  }, [usuario?.preferencias?.cidade, usuario?.preferencias?.uf, posUsuario, carregarImoveis, buscaAtiva]);

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    debouncedMarcarAreaMudou();
  };

  const buscarNestaArea = async () => {
    await carregarImoveis({ latitude: region.latitude, longitude: region.longitude }, region);
    setAreaMudou(false);
    jaBuscouInicialRef.current = true;
  };

  const irParaMinhaLocalizacao = async () => {
    try {
      const loc = await getUserLocationSafe();
      if (!loc) {
        Alert.alert("Localização", "Permissão negada. Você pode ajustar o local nas Preferências.");
        return;
      }

      setBuscaAtiva(null); // volta pro “modo GPS”
      setPosUsuario(loc);

      const r: Region = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };

      setRegion(r);
      mapRef.current?.animateToRegion(r, 600);

      await carregarImoveis({ latitude: r.latitude, longitude: r.longitude }, r);
      setAreaMudou(false);
      jaBuscouInicialRef.current = true;
    } catch {
      Alert.alert("Localização", "Não consegui pegar sua localização agora.");
    }
  };

  const abrirPreferencias = () => {
    router.push("/(tabs)/profile/preferencias");
  };

  // 🔎 abre modal e preenche com busca atual OU preferências
  const abrirBusca = () => {
    const prefCidade = usuario?.preferencias?.cidade?.trim() ?? "";
    const prefUf = usuario?.preferencias?.uf?.trim()?.toUpperCase() ?? "";
    const cidade = buscaAtiva?.cidade ?? prefCidade;
    const uf = (buscaAtiva?.uf ?? prefUf).toUpperCase();

    setPrefill({ cidade, uf });
    setBuscaModalVisible(true);
  };

  const aplicarBusca = async (cidade: string, uf: string) => {
    try {
      setBuscaModalVisible(false);

      const results = await Location.geocodeAsync(`${cidade}, ${uf}, Brasil`);
      if (!results?.length) {
        Alert.alert("Busca", "Não encontrei essa cidade/UF.");
        return;
      }

      const { latitude, longitude } = results[0];

      const r: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };

      setBuscaAtiva({ cidade, uf });
      setRegion(r);
      mapRef.current?.animateToRegion(r, 600);

      await carregarImoveis({ latitude: r.latitude, longitude: r.longitude }, r);
      setAreaMudou(false);
      jaBuscouInicialRef.current = true;
    } catch (e: any) {
      console.log("ERRO aplicarBusca:", e?.code, e?.message, e);
      Alert.alert("Busca", "Não consegui buscar essa cidade agora.");
    }
  };

  const limparBusca = async () => {
    setBuscaAtiva(null);
    setBuscaModalVisible(false);

    // limpa campos do modal
    setEstadoSelecionado(null);
    setMunicipios([]);
    setCidadeInput("");
    setCidadeSelecionada(null);
    setCidadeSugestoesVisivel(false);

    // volta pro GPS se tiver
    if (posUsuario) {
      const r: Region = {
        latitude: posUsuario.latitude,
        longitude: posUsuario.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };
      setRegion(r);
      mapRef.current?.animateToRegion(r, 600);
      await carregarImoveis({ latitude: r.latitude, longitude: r.longitude }, r);
      setAreaMudou(false);
      jaBuscouInicialRef.current = true;
      return;
    }

    // senão tenta preferências
    const cidade = usuario?.preferencias?.cidade?.trim();
    const uf = usuario?.preferencias?.uf?.trim()?.toUpperCase();
    if (cidade && uf) {
      await aplicarBusca(cidade, uf);
    }
  };

  const selecionarImovel = (im: Imovel) => {
    setSelecionadoId(im.id);

    const loc = im.localizacao;
    if (loc?.latitude && loc?.longitude) {
      const r: Region = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };
      mapRef.current?.animateToRegion(r, 450);
    }
  };

  const selecionarMarker = (im: Imovel) => {
    setSelecionadoId(im.id);

    const idx = indexPorId.get(im.id);
    if (idx !== undefined) {
      listaRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
    }
  };

  const estadosFiltrados = useMemo(() => {
    const q = norm(estadoFiltro);
    if (!q) return estados;
    return estados.filter((e) => norm(e.nome).includes(q) || norm(e.sigla).includes(q));
  }, [estados, estadoFiltro]);

  const municipiosIndex = useMemo(
    () => municipios.map((m) => ({ ...m, _n: norm(m.nome) })),
    [municipios]
  );

  const sugestoes = useMemo(() => {
    if (!estadoSelecionado) return [];
    const q = norm(cidadeInput);
    if (!q || q.length < 2) return [];
    const list = municipiosIndex
      .filter((m) => m._n.startsWith(q) || m._n.includes(q))
      .slice(0, 12)
      .map(({ id, nome }) => ({ id, nome }));
    return list;
  }, [cidadeInput, municipiosIndex, estadoSelecionado]);

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ opacity: 0.7, marginTop: 10 }}>Carregando mapa…</Text>
      </View>
    );
  }

  const labelTopo =
    buscaAtiva?.cidade && buscaAtiva?.uf
      ? `${buscaAtiva.cidade} - ${buscaAtiva.uf}`
      : usuario?.preferencias?.cidade && usuario?.preferencias?.uf
      ? `${usuario.preferencias.cidade} - ${usuario.preferencias.uf}`
      : "Buscar cidade…";

  return (
    <View style={styles.page}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          customMapStyle={Platform.OS === "android" ? MAPA_ESTILO : undefined}
          mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
          showsUserLocation
          showsMyLocationButton={false}
          showsPointsOfInterest={false}
          showsBuildings={false}
          showsTraffic={false}
          rotateEnabled={false}
          pitchEnabled={false}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        >
          {imoveis.map((im) => {
            const loc = im.localizacao;
            if (!loc) return null;

            const ativo = im.id === selecionadoId;

            return (
              <Marker
                key={im.id}
                coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                onPress={() => selecionarMarker(im)}
                opacity={ativo ? 1 : 0.85}
                anchor={{ x: 0.5, y: 1 }}
                zIndex={ativo ? 999 : 1}
                tracksViewChanges={!markersReady || ativo}
              >
                <PriceMarker precoCentavos={im.precoCentavos ?? 0} selected={ativo} />
              </Marker>
            );
          })}
        </MapView>

        {/* 🔎 Barra do topo agora é BUSCA */}
        <Pressable style={styles.searchBar} onPress={abrirBusca} hitSlop={8}>
          <Ionicons name="search" size={18} color="#5B5B5B" />

          <View style={{ flex: 1 }}>
            <Text style={styles.searchText}>{labelTopo}</Text>
            <Text style={styles.searchHint}>{buscaAtiva ? "Alterar busca" : "Buscar nesta cidade"}</Text>
          </View>

          {/* ⚙️ Chip atalho para Preferências */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              abrirPreferencias();
            }}
            hitSlop={10}
            style={styles.searchChip}
          >
            <Ionicons name="options-outline" size={16} color="#111" />
          </Pressable>
        </Pressable>

        {areaMudou && (
          <Pressable
            style={[styles.buscarAreaBtn, buscando && { opacity: 0.7 }]}
            onPress={buscarNestaArea}
            disabled={buscando}
            hitSlop={10}
          >
            <Ionicons name="refresh" size={16} color="#111" />
            <Text style={styles.buscarAreaText}>{buscando ? "Buscando…" : "Buscar nesta área"}</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.locFab}
          onPress={irParaMinhaLocalizacao}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Ir para minha localização"
        >
          <Ionicons name="locate" size={20} color="#5A9F78" />
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{buscando ? "Buscando imóveis perto…" : "Imóveis por perto"}</Text>

        {!modoComprador && (
          <Text style={styles.sellerHint}>
            Você está como vendedor. (Depois a gente cria uma home específica pra vendedor-only.)
          </Text>
        )}
      </View>

      <FlatList
        ref={listaRef}
        data={imoveis}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 10, gap: 10 }}
        onScrollToIndexFailed={() => {}}
        refreshing={buscando}
        onRefresh={() => carregarImoveis({ latitude: region.latitude, longitude: region.longitude }, region)}
        renderItem={({ item }) => {
          const ativo = item.id === selecionadoId;

          return (
            <Pressable onPress={() => selecionarImovel(item)} style={[styles.card, ativo && styles.cardActive]}>
              <Text style={styles.cardTitle}>{item.titulo ?? "Imóvel"}</Text>
              <Text style={styles.cardSub}>
                {item.cidade && item.uf ? `${item.cidade} - ${item.uf}` : "Local não informado"}
              </Text>
              <Text style={styles.cardPrice}>{formatarPreco(item.precoCentavos)}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 16 }}>
            <Text style={{ opacity: 0.7 }}>Ainda não tem anúncios publicados nessa região.</Text>
          </View>
        }
      />

      {/* MODAL BUSCA */}
      <Modal
        visible={buscaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBuscaModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBuscaModalVisible(false)} />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalSheetWrap}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Buscar cidade</Text>
              <Pressable onPress={() => setBuscaModalVisible(false)} hitSlop={10} style={styles.modalIconBtn}>
                <Ionicons name="close" size={18} color="#111" />
              </Pressable>
            </View>

            {/* UF */}
            <Text style={styles.modalLabel}>Estado (UF)</Text>
            <Pressable
              style={styles.modalSelectField}
              onPress={() => setEstadoModalVisible(true)}
              hitSlop={8}
            >
              <Text style={estadoSelecionado ? styles.modalSelectText : styles.modalSelectPlaceholder}>
                {estadoSelecionado ? `${estadoSelecionado.nome} (${estadoSelecionado.sigla})` : "Selecionar UF"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#111" />
            </Pressable>

            {/* Cidade */}
            <Text style={styles.modalLabel}>Cidade</Text>
            <TextInput
              value={cidadeInput}
              onChangeText={(t) => {
                setCidadeInput(t);
                setCidadeSelecionada(null);
                setCidadeSugestoesVisivel(true);
              }}
              onFocus={() => setCidadeSugestoesVisivel(true)}
              placeholder={estadoSelecionado ? "Digite para filtrar e selecione na lista" : "Selecione a UF primeiro"}
              placeholderTextColor="#999"
              style={styles.modalInput}
              editable={!!estadoSelecionado}
              autoCapitalize="words"
            />

            {/* Sugestões */}
            {estadoSelecionado && cidadeSugestoesVisivel && sugestoes.length > 0 && (
              <View style={styles.suggestBox}>
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={sugestoes}
                  keyExtractor={(i) => String(i.id)}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        setCidadeSelecionada(item);
                        setCidadeInput(item.nome);
                        setCidadeSugestoesVisivel(false);
                      }}
                      style={styles.suggestItem}
                    >
                      <Text style={styles.suggestText}>{item.nome}</Text>
                    </Pressable>
                  )}
                />
              </View>
            )}

            {/* ajuda quando digitou mas não selecionou */}
            {!!estadoSelecionado && !!cidadeInput && !cidadeSelecionada && (
              <Text style={styles.modalMutedText}>
                Selecione uma cidade da lista para evitar erro.
              </Text>
            )}

            <View style={styles.modalRow}>
              <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={limparBusca}>
                <Text style={styles.modalBtnGhostText}>Limpar</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => {
                  if (!estadoSelecionado) {
                    Alert.alert("Busca", "Selecione a UF.");
                    return;
                  }
                  if (!cidadeSelecionada) {
                    Alert.alert("Busca", "Selecione a cidade na lista.");
                    return;
                  }
                  aplicarBusca(cidadeSelecionada.nome, estadoSelecionado.sigla);
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>Buscar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* MODAL UF (IBGE) */}
        <Modal
          visible={estadoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEstadoModalVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setEstadoModalVisible(false)} />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalSheetWrap}
          >
            <View style={[styles.modalSheet, styles.modalSheetTall]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Selecionar UF</Text>
                <Pressable onPress={() => setEstadoModalVisible(false)} hitSlop={10} style={styles.modalIconBtn}>
                  <Ionicons name="close" size={18} color="#111" />
                </Pressable>
              </View>

              <TextInput
                value={estadoFiltro}
                onChangeText={setEstadoFiltro}
                placeholder="Buscar estado…"
                placeholderTextColor="#999"
                style={styles.modalSearchInput}
                autoCapitalize="words"
              />

              <FlatList
                data={estadosFiltrados}
                keyExtractor={(i) => String(i.id)}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
                renderItem={({ item }) => {
                  const active = estadoSelecionado?.id === item.id;
                  return (
                    <Pressable
                      style={[styles.modalListItem, active && styles.modalListItemActive]}
                      onPress={() => {
                        setEstadoSelecionado(item);
                        setEstadoModalVisible(false);

                        // ao trocar UF manualmente, zera cidade pra não ficar inválida
                        setCidadeInput("");
                        setCidadeSelecionada(null);
                        setCidadeSugestoesVisivel(false);
                      }}
                    >
                      <Text style={styles.modalListItemText}>
                        {item.nome} ({item.sigla})
                      </Text>
                      {active && <Ionicons name="checkmark" size={18} color="#5A9F78" />}
                    </Pressable>
                  );
                }}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Modal>
    </View>
  );
}