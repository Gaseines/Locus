import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase, SUPABASE_URL } from "@/src/supabase";


export type FotoItem = {
  id: string;
  uri: string;
  uploading?: boolean;
  erro?: boolean;
};

// Pede permissão e abre a galeria
export async function escolherImagem(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.7,
    aspect: [4, 3],
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

// Abre a câmera
export async function tirarFoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.7,
    aspect: [4, 3],
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

// Faz o upload usando fetch direto (sem atob — compatível com React Native)
export async function uploadImagem(params: {
  uri: string;
  imovelId: string;
  userId: string;
}): Promise<string> {
  const { uri, imovelId, userId } = params;

  const timestamp = Date.now();
  const path = `${userId}/${imovelId}/${timestamp}.jpg`;

  // ✅ Lê o arquivo como blob via fetch — funciona no React Native
  const response = await fetch(uri);
  const blob = await response.blob();

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Não autenticado.");

  // ✅ Pega a URL do projeto direto do cliente Supabase
  const supabaseUrl = (supabase as any).supabaseUrl as string;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/imoveis/${path}`;

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "false",
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload falhou: ${errorText}`);
  }

  // Retorna a URL pública
  const { data } = supabase.storage.from("imoveis").getPublicUrl(path);
  return data.publicUrl;
}

// Deleta uma imagem do Storage
export async function deletarImagem(path: string): Promise<void> {
  const { error } = await supabase.storage.from("imoveis").remove([path]);
  if (error) throw error;
}

// Extrai o path de uma URL pública do Supabase
export function extrairPathDaUrl(url: string): string | null {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/imoveis\/(.+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}