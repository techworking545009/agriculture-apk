import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCMdLAyuRw0HPJuGEhHp54MKfoVOoo7vmc",
  authDomain: "farme18-8dd49.firebaseapp.com",
  projectId: "farme18-8dd49",
  storageBucket: "farme18-8dd49.firebasestorage.app",
  messagingSenderId: "389283081719",
  appId: "1:389283081719:web:58641065ad6a244f4b12f2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
