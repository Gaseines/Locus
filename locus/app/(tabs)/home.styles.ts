import { StyleSheet } from "react-native";

export const MAPA_ESTILO = [
  { elementType: "geometry", stylers: [{ color: "#F5F4F2" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5B5B5B" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F5F4F2" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#E2E2E2" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#EFEFEF" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#ECECEC" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#E6E6E6" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#E9E9E9" }],
  },
];

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8F8F6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  mapWrap: { height: "45%", backgroundColor: "#D7EBDD" },

  // ✅ MESMA POSIÇÃO QUE VOCÊ TINHA
  searchBar: {
    position: "absolute",
    top: 50,
    left: 14,
    right: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  searchText: { fontWeight: "900", color: "#111" },
  searchHint: { marginTop: 2, fontSize: 12, opacity: 0.7 },
  searchChip: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  // ✅ MESMA POSIÇÃO QUE VOCÊ TINHA
  buscarAreaBtn: {
    position: "absolute",
    top: 120,
    left: 14,
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,

    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  buscarAreaText: { fontWeight: "900", color: "#111" },

  // FAB localização
  locFab: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E5E5",

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  listHeader: { paddingHorizontal: 16, paddingTop: 12 },
  listTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  sellerHint: { marginTop: 6, fontSize: 12, opacity: 0.7 },

  // Card com foto
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    overflow: "hidden", // ← importante para a foto respeitar o borderRadius
  },
  cardActive: {
    borderColor: "#5A9F78",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardFoto: {
    width: "100%",
    height: 140,
    backgroundColor: "#F0F0F0",
  },
  cardFotoPlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: "#F8F8F6",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111",
  },
  cardSub: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
    color: "#5b5b5b",
  },
  cardPrice: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "900",
    color: "#111",
  },

  // =========================
  // ✅ MODAIS BUSCA / UF (IBGE)
  // =========================
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalSheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  modalSheetTall: {
    maxHeight: "75%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  modalIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
  },
  modalLabel: {
    color: "#5b5b5b",
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111",
    backgroundColor: "#F8F8F6",
  },

  modalSelectField: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F8F8F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalSelectText: {
    color: "#111",
    fontWeight: "900",
    flex: 1,
  },
  modalSelectPlaceholder: {
    color: "#999",
    fontWeight: "800",
    flex: 1,
  },

  modalMutedText: {
    marginTop: 8,
    fontSize: 12,
    color: "#5b5b5b",
    opacity: 0.75,
  },

  modalRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  modalBtnGhostText: {
    color: "#5b5b5b",
    fontWeight: "900",
  },
  modalBtnPrimary: {
    backgroundColor: "#5A9F78",
  },
  modalBtnPrimaryText: {
    color: "#fff",
    fontWeight: "900",
  },

  // sugestões de cidade
  suggestBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    maxHeight: 240,
  },
  suggestItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  suggestText: {
    color: "#111",
    fontWeight: "800",
  },

  // modal UF
  modalSearchInput: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111",
    backgroundColor: "#F8F8F6",
    marginBottom: 10,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#EFEFEF",
  },
  modalListItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalListItemActive: {
    backgroundColor: "#D7EBDD",
  },
  modalListItemText: {
    color: "#111",
    fontWeight: "900",
  },
});
