import { StyleSheet } from "react-native";
import { CORES } from "@/src/theme/cores";

export const MAPA_ESTILO = [
  { elementType: "geometry", stylers: [{ color: "#F5F4F2" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5B5B5B" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F5F4F2" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#E9E9E9" }],
  },
];

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: CORES.fundo },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  mapWrap: { height: "40%", backgroundColor: CORES.primarioClaro },

  tip: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: CORES.branco,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: CORES.borda,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tipText: { color: CORES.texto, fontWeight: "800" },

  locFab: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  content: { padding: 16, paddingBottom: 26, gap: 6 },
  title: { fontSize: 20, fontWeight: "900", color: CORES.texto },

  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: CORES.texto,
    opacity: 0.8,
  },

  input: {
    marginTop: 6,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: CORES.texto,
  },
  inputError: { borderColor: "#d11" },
  error: { marginTop: 6, color: "#d11", fontWeight: "700" },

  // Select (Estado)
  selectInput: {
    marginTop: 6,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { color: CORES.texto, fontWeight: "800" },
  selectPlaceholder: { color: CORES.texto, opacity: 0.6, fontWeight: "800" },

  // Sugestões cidade
  sugestoesBox: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: CORES.branco,
  },
  sugestaoItem: { paddingVertical: 10, paddingHorizontal: 12 },

  okText: { marginTop: 8, color: "#2e7d32", fontWeight: "900" },

  rowLoading: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  rowLoadingText: { opacity: 0.7, color: CORES.texto },

  segment: {
    marginTop: 6,
    flexDirection: "row",
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 14,
    overflow: "hidden",
  },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  segmentBtnActive: { backgroundColor: CORES.primarioClaro },
  segmentText: { fontWeight: "800", color: CORES.texto, opacity: 0.85 },
  segmentTextActive: { color: CORES.texto, opacity: 1 },

  publishRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 14,
    padding: 12,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: CORES.borda,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CORES.branco,
  },
  checkOn: { backgroundColor: CORES.primario, borderColor: CORES.primario },
  publishTitle: { fontWeight: "900", color: CORES.texto },
  publishHint: {
    marginTop: 2,
    fontSize: 12,
    color: CORES.texto,
    opacity: 0.7,
  },

  primaryBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: CORES.primario,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: CORES.branco, fontWeight: "900" },

  secondaryBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: CORES.texto, fontWeight: "900" },

  // Modal (Estados)
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  modalContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "80%",
    backgroundColor: CORES.branco,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: CORES.texto },
  modalSearch: {
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: CORES.texto,
  },
  estadoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  separator: { height: 1, backgroundColor: "#f0f0f0" },

  // Fotos
  fotosRow: { flexDirection: "row", gap: 10, paddingVertical: 6 },

  fotoAddBtn: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CORES.borda,
    backgroundColor: CORES.branco,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  fotoAddText: {
    fontWeight: "900",
    color: CORES.texto,
    fontSize: 12,
    opacity: 0.85,
  },

  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: "hidden",
  },
  thumb: { width: "100%", height: "100%" },

  thumbRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});