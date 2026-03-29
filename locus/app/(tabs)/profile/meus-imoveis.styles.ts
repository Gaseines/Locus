import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8F8F6" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, color: "#5b5b5b", opacity: 0.75 },

  filtrosWrap: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  filtrosList: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  filtroChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DADADA",
    backgroundColor: "#fff",
  },
  filtroChipAtivo: { backgroundColor: "#5A9F78", borderColor: "#5A9F78" },
  filtroText: { fontWeight: "800", fontSize: 13, color: "#5b5b5b" },
  filtroTextAtivo: { color: "#fff" },

  lista: { padding: 14, paddingBottom: 32 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  cardTitulo: { flex: 1, fontSize: 15, fontWeight: "900", color: "#111" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "800" },
  cardSub: { fontSize: 12, color: "#5b5b5b", opacity: 0.8, marginTop: 2 },
  cardPreco: { fontSize: 15, fontWeight: "900", color: "#111", marginTop: 8 },

  cardAcoes: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    flexWrap: "wrap",
  },
  cardAcoesSecundarias: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  acaoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#F8F8F6",
  },
  acaoText: { fontSize: 13, fontWeight: "800" },

  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: "#111", marginTop: 8 },
  emptySub: {
    fontSize: 13,
    color: "#5b5b5b",
    opacity: 0.75,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  emptyBtn: {
    marginTop: 14,
    backgroundColor: "#5A9F78",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
  emptyBtnText: { color: "#fff", fontWeight: "900" },
});