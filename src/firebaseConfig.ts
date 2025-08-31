import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyBL7yK5ei7GWi3QmPcAuLS5234pIRcgKWM",
  authDomain: "hackout25-8eebb.firebaseapp.com",
  projectId: "hackout25-8eebb",
  storageBucket: "hackout25-8eebb.firebasestorage.app",
  messagingSenderId: "416116370520",
  appId: "1:416116370520:web:bab87369632fe43e16ae2d"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
