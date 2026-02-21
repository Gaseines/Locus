import { initializeApp, getApps } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "firebase/auth";
import { initializeAuth, getReactNativePersistence } from "firebase/auth/react-native";


const firebaseConfig = {
  apiKey: "AIzaSyC7BrgZJXM_tDZQfPB96ecT0wHe-eyebbs",
  authDomain: "locus-c66a5.firebaseapp.com",
  projectId: "locus-c66a5",
  storageBucket: "locus-c66a5.firebasestorage.app",
  messagingSenderId: "597286689983",
  appId: "1:597286689983:web:8c72ccf526bc37c42d7a0a",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // hot reload / já inicializado
    return getAuth(app);
  }
})();