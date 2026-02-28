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
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { router } from "expo-router";

import { auth, db } from "@/src/firebase";
import { CORES } from "@/src/theme/cores";
import { criarImovel, TipoImovel } from "@/src/services/imoveis";

import { MAPA_ESTILO, styles } from "./novo-imovel.styles";

type Estado = { id: number; sigla: string; nome: string };
type Municipio = { id: number; nome: string };

const IBGE_ESTADOS_URL =
  "https://servicodados.ibge.gov.br/api/v1/localidades/estados";
const IBGE_MUNICIPIOS_POR_UF = (estadoId: number) =>
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`;

function normalizarTexto(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parsePrecoParaCentavos(raw: string) {
  const t = raw.trim();
  if (!t) return null;

  const temVirgula = t.includes(",");
  const normalizado = temVirgula
    ? t.replace(/\./g, "").replace(",", ".")
    : t.replace(/[^\d.]/g, "");

  const num = Number(normalizado);
  if (!Number.isFinite(num) || num <= 0) return null;

  return Math.round(num * 100);
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

export default function NovoImovelScreen() {
  const mapRef = useRef<MapView>(null);
  const municipiosCache = useRef<Record<number, Municipio[]>>({});

  const uid = auth.currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [region, setRegion] = useState<Region>({
    latitude: -26.6367,
    longitude: -48.6937,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });

  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);

  // campos
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoImovel>("terreno");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [publicarAgora, setPublicarAgora] = useState(true);

  // Estado/Cidade (IBGE)
  const [estados, setEstados] = useState<Estado[]>([]);
  const [modalEstadosAberto, setModalEstadosAberto] = useState(false);
  const [buscaEstado, setBuscaEstado] = useState("");
  const [estadoSelecionado, setEstadoSelecionado] = useState<Estado | null>(null);

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [carregandoMunicipios, setCarregandoMunicipios] = useState(false);

  const [cidade, setCidade] = useState("");
  const [municipioSelecionado, setMunicipioSelecionado] = useState<Municipio | null>(null);

  // erros
  const [erroTitulo, setErroTitulo] = useState<string | null>(null);
  const [erroPreco, setErroPreco] = useState<string | null>(null);
  const [erroCidade, setErroCidade] = useState<string | null>(null);
  const [erroUf, setErroUf] = useState<string | null>(null);
  const [erroPin, setErroPin] = useState<string | null>(null);

  const precoCentavos = useMemo(() => parsePrecoParaCentavos(preco), [preco]);

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

  async function centralizarNoTexto(endereco: string, delta: { lat: number; lng: number }) {
    try {
      const results = await Location.geocodeAsync(endereco);
      if (!results?.length) return false;

      const { latitude, longitude } = results[0];
      const r: Region = {
        latitude,
        longitude,
        latitudeDelta: delta.lat,
        longitudeDelta: delta.lng,
      };

      setRegion(r);
      setPin({ latitude, longitude });
      mapRef.current?.animateToRegion(r, 600);
      setErroPin(null);
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    const run = async () => {
      try {
        if (!uid) {
          router.replace("/(auth)/login");
          return;
        }

        const [estadosLista, snap] = await Promise.all([
          fetchEstados(),
          getDoc(doc(db, "usuarios", uid)),
        ]);

        setEstados(estadosLista);

        let estLocal: Estado | null = null;
        let munLocal: Municipio | null = null;

        if (snap.exists()) {
          const data: any = snap.data();
          const ufSalvo = data?.preferencias?.uf ? String(data.preferencias.uf).toUpperCase() : "";
          const cidadeSalva = data?.preferencias?.cidade ? String(data.preferencias.cidade) : "";

          if (ufSalvo) {
            estLocal = estadosLista.find((e) => e.sigla === ufSalvo) ?? null;
            setEstadoSelecionado(estLocal);

            if (estLocal) {
              setCarregandoMunicipios(true);
              try {
                const lista = await fetchMunicipios(estLocal.id);
                setMunicipios(lista);

                if (cidadeSalva) {
                  const match =
                    lista.find((m) => normalizarTexto(m.nome) === normalizarTexto(cidadeSalva)) ?? null;

                  if (match) {
                    munLocal = match;
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

        const loc = await getUserLocationSafe();
        if (loc) {
          const r: Region = {
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          };
          setRegion(r);
          setPin({ latitude: loc.latitude, longitude: loc.longitude });
          requestAnimationFrame(() => mapRef.current?.animateToRegion(r, 600));
        } else {
          if (estLocal && munLocal) {
            await centralizarNoTexto(`${munLocal.nome}, ${estLocal.sigla}, Brasil`, { lat: 0.08, lng: 0.08 });
          } else if (estLocal) {
            await centralizarNoTexto(`${estLocal.nome}, Brasil`, { lat: 2.0, lng: 2.0 });
          } else {
            setPin(null);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [uid]);

  const estadosFiltrados = useMemo(() => {
    const q = normalizarTexto(buscaEstado);
    if (!q) return estados;
    return estados.filter((e) => normalizarTexto(`${e.sigla} ${e.nome}`).includes(q));
  }, [buscaEstado, estados]);

  const sugestoesCidades = useMemo(() => {
    if (!estadoSelecionado) return [];
    const q = normalizarTexto(cidade);
    if (!q || q.length < 2) return [];

    return municipios.filter((m) => normalizarTexto(m.nome).includes(q)).slice(0, 8);
  }, [cidade, municipios, estadoSelecionado]);

  async function selecionarEstado(estado: Estado) {
    setEstadoSelecionado(estado);
    setErroUf(null);
    setModalEstadosAberto(false);

    setCidade("");
    setMunicipioSelecionado(null);
    setErroCidade(null);

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

    await centralizarNoTexto(`${estado.nome}, Brasil`, { lat: 2.0, lng: 2.0 });
  }

  async function selecionarCidade(m: Municipio) {
    if (!estadoSelecionado) return;

    setCidade(m.nome);
    setMunicipioSelecionado(m);
    setErroCidade(null);

    await centralizarNoTexto(`${m.nome}, ${estadoSelecionado.sigla}, Brasil`, { lat: 0.08, lng: 0.08 });
  }

  function limparErros() {
    setErroTitulo(null);
    setErroPreco(null);
    setErroCidade(null);
    setErroUf(null);
    setErroPin(null);
  }

  function validar() {
    limparErros();
    let ok = true;

    if (titulo.trim().length < 3) {
      setErroTitulo("Informe um título (mínimo 3 caracteres).");
      ok = false;
    }

    if (!precoCentavos) {
      setErroPreco("Informe um preço válido.");
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

    if (!pin) {
      setErroPin("Defina a localização no mapa (toque no mapa ou use sua localização).");
      ok = false;
    }

    return ok;
  }

  async function salvar() {
    if (!uid) return;
    if (!validar()) return;

    try {
      setSalvando(true);

      await criarImovel({
        idDono: uid,
        titulo,
        descricao: descricao.trim() ? descricao : undefined,
        precoCentavos: precoCentavos!,
        tipo,
        cidade: municipioSelecionado!.nome,
        uf: estadoSelecionado!.sigla,
        status: publicarAgora ? "publicado" : "rascunho",
        latitude: pin!.latitude,
        longitude: pin!.longitude,
        idEstado: estadoSelecionado!.id,
        idMunicipio: municipioSelecionado!.id,
      });

      Alert.alert(
        "Sucesso",
        publicarAgora ? "Imóvel publicado e já aparece no mapa." : "Imóvel salvo como rascunho."
      );

      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível salvar o imóvel.");
    } finally {
      setSalvando(false);
    }
  }

  async function usarMinhaLocalizacao() {
    try {
      const loc = await getUserLocationSafe();
      if (!loc) {
        Alert.alert("Localização", "Permissão negada. Toque no mapa para escolher manualmente.");
        return;
      }

      const r: Region = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      };

      setRegion(r);
      setPin({ latitude: loc.latitude, longitude: loc.longitude });
      mapRef.current?.animateToRegion(r, 600);
      setErroPin(null);
    } catch {
      Alert.alert("Localização", "Não consegui pegar sua localização agora.");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: CORES.texto, opacity: 0.75 }}>
          Carregando…
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* MAPA */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onPress={(e) => {
            const c = e.nativeEvent.coordinate;
            setPin({ latitude: c.latitude, longitude: c.longitude });
            setErroPin(null);
          }}
          customMapStyle={Platform.OS === "android" ? MAPA_ESTILO : undefined}
          mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
          showsUserLocation
          showsPointsOfInterest={false}
          showsBuildings={false}
          showsTraffic={false}
          rotateEnabled={false}
          pitchEnabled={false}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        >
          {pin && (
            <Marker
              coordinate={pin}
              draggable
              onDragEnd={(e) => {
                const c = e.nativeEvent.coordinate;
                setPin({ latitude: c.latitude, longitude: c.longitude });
                setErroPin(null);
              }}
            />
          )}
        </MapView>

        <Pressable style={styles.locFab} onPress={usarMinhaLocalizacao} hitSlop={12}>
          <Ionicons name="locate" size={20} color={CORES.primario} />
        </Pressable>

        <View style={styles.tip}>
          <Text style={styles.tipText}>Toque no mapa para posicionar o imóvel.</Text>
        </View>
      </View>

      {/* FORM */}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Novo imóvel</Text>

        {!!erroPin && <Text style={styles.error}>{erroPin}</Text>}

        <Text style={styles.label}>Título</Text>
        <TextInput
          value={titulo}
          onChangeText={(t) => {
            setTitulo(t);
            if (erroTitulo) setErroTitulo(null);
          }}
          placeholder="Ex: Terreno próximo à praia"
          placeholderTextColor="#999"
          style={[styles.input, erroTitulo && styles.inputError]}
        />
        {!!erroTitulo && <Text style={styles.error}>{erroTitulo}</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Tipo</Text>
        <View style={styles.segment}>
          {(["terreno", "casa", "apartamento"] as TipoImovel[]).map((t) => {
            const ativo = tipo === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTipo(t)}
                style={[styles.segmentBtn, ativo && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, ativo && styles.segmentTextActive]}>
                  {t === "terreno" ? "Terreno" : t === "casa" ? "Casa" : "Apto"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Preço (R$)</Text>
        <TextInput
          value={preco}
          onChangeText={(t) => {
            setPreco(t);
            if (erroPreco) setErroPreco(null);
          }}
          placeholder="Ex: 350000 ou 350.000,00"
          placeholderTextColor="#999"
          keyboardType="numeric"
          style={[styles.input, erroPreco && styles.inputError]}
        />
        {!!erroPreco && <Text style={styles.error}>{erroPreco}</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Estado (UF)</Text>
        <Pressable style={styles.selectInput} onPress={() => setModalEstadosAberto(true)}>
          <Text style={estadoSelecionado ? styles.selectText : styles.selectPlaceholder}>
            {estadoSelecionado
              ? `${estadoSelecionado.sigla} — ${estadoSelecionado.nome}`
              : "Selecione um estado"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={CORES.texto} />
        </Pressable>
        {!!erroUf && <Text style={styles.error}>{erroUf}</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Cidade</Text>
        <TextInput
          value={cidade}
          onChangeText={(t) => {
            setCidade(t);
            setMunicipioSelecionado(null);
            if (erroCidade) setErroCidade(null);
          }}
          placeholder={estadoSelecionado ? "Digite e selecione na lista…" : "Selecione um estado primeiro"}
          placeholderTextColor="#999"
          editable={!!estadoSelecionado && !carregandoMunicipios}
          style={[styles.input, erroCidade && styles.inputError, !estadoSelecionado && { opacity: 0.6 }]}
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
                <Text style={{ color: CORES.texto }}>{m.nome}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {!!municipioSelecionado && <Text style={styles.okText}>Selecionado: {municipioSelecionado.nome}</Text>}
        {!!erroCidade && <Text style={styles.error}>{erroCidade}</Text>}

        <Text style={[styles.label, { marginTop: 12 }]}>Descrição (opcional)</Text>
        <TextInput
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Detalhes do imóvel…"
          placeholderTextColor="#999"
          multiline
          style={[styles.input, { height: 90, textAlignVertical: "top" }]}
        />

        <Pressable onPress={() => setPublicarAgora((v) => !v)} style={styles.publishRow}>
          <View style={[styles.check, publicarAgora && styles.checkOn]}>
            {publicarAgora && <Ionicons name="checkmark" size={16} color={CORES.branco} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.publishTitle}>Publicar agora</Text>
            <Text style={styles.publishHint}>Só “publicado” aparece no mapa e na lista.</Text>
          </View>
        </Pressable>

        <Pressable style={[styles.primaryBtn, salvando && { opacity: 0.75 }]} onPress={salvar} disabled={salvando}>
          {salvando ? <ActivityIndicator color={CORES.branco} /> : <Text style={styles.primaryText}>Salvar</Text>}
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.replace("/(tabs)")} disabled={salvando}>
          <Text style={styles.secondaryText}>Cancelar</Text>
        </Pressable>
      </ScrollView>

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
                <Text style={{ fontWeight: "900", color: CORES.texto }}>{item.sigla}</Text>
                <Text style={{ marginLeft: 10, color: CORES.texto }}>{item.nome}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}