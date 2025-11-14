import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD6NpomNom1_8igjINWCKVDG7NcsPJBH6A",
  authDomain: "careerguide-4d787.firebaseapp.com",
  projectId: "careerguide-4d787",
  storageBucket: "careerguide-4d787.firebasestorage.app",
  messagingSenderId: "482120145241",
  appId: "1:482120145241:web:05e18087fe8c4b225b9448",
  measurementId: "G-LL62V4PST8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
