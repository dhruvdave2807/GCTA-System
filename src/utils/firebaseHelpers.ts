import { db, storage } from "../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  DocumentData
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImage(file: File): Promise<string> {
  const storageRef = ref(storage, `reports/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

export async function saveReport(data: any): Promise<void> {
  await addDoc(collection(db, "reports"), {
    ...data,
    status: "new",
    timestamp: serverTimestamp()
  });
}

export function fetchReports(
  onUpdate: (reports: DocumentData[]) => void
): () => void {
  const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(reports);
  });
}
