import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as ImageManipulator from "expo-image-manipulator";
import { storage } from "@/src/firebase";

export async function uploadImagensImovel(params: {
  uid: string;
  imovelId: string;
  uris: string[];
}) {
  const { uid, imovelId, uris } = params;

  const urls: string[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];

    // ✅ compressão leve (MVP) pra não estourar upload
    const manip = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
    );

    const response = await fetch(manip.uri);
    const blob = await response.blob();

    const path = `imoveis/${uid}/${imovelId}/${Date.now()}_${i}.jpg`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });

    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }

  return urls;
}