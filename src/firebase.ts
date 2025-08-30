import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBL7yK5ei7GWi3QmPcAuLS5234pIRcgKWM",
  authDomain: "hackout25-8eebb.firebaseapp.com",
  projectId: "hackout25-8eebb",
  storageBucket: "hackout25-8eebb.firebasestorage.app",
  messagingSenderId: "416116370520",
  appId: "1:416116370520:web:bab87369632fe43e16ae2d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
