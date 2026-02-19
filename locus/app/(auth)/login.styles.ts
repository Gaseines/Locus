import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#FFFFFfff",
  },
//   title: { fontSize: 34, fontWeight: "800", marginTop: 0, marginBottom: 50, margin:"auto", color: "#5a9f78" },

  logo: {width: 200},

  subtitle: { fontSize: 14, opacity: 0.7, marginBottom: 8, color: "#5b5b5b" },

  button: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },

  icon: { marginRight: 10 },

  inputWrap: { marginBottom: 10 },

  label: { fontSize: 12, opacity: 0.7, marginBottom: 6 },

  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#fff",
  },

  emailButton: {
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  emailButtonEnabled: { backgroundColor: "#5A9F78" },

  emailButtonDisabled: { backgroundColor: "#BFD9CA" },

  emailButtonText: { color: "#fff", fontWeight: "800" },

  link: { textAlign: "center", fontWeight: "700", color: "#999" },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E5E5" },

  dividerText: { marginHorizontal: 10, fontSize: 12, opacity: 0.6 },

  google: { backgroundColor: "#f8f8f6", display: "flex", flexDirection: "row" },
  googleIcon: { width: 30, height: 30, marginRight: 10 },
  apple: { backgroundColor: "#f8f8f6", display: "flex", flexDirection: "row" },
  dev: { backgroundColor: "#EAEAEA" },

  buttonText: { fontWeight: "700" },
  appleText: { fontWeight: "700" },
  devText: { color: "#111111", fontWeight: "700" },

  helper: { marginTop: 8, fontSize: 12, opacity: 0.6 },
});
