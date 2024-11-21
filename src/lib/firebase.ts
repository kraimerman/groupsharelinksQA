import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAVJqjuvU7I8El_mjySikwapTDlem9JR48",
  authDomain: "groupchatqa.firebaseapp.com",
  projectId: "groupchatqa",
  storageBucket: "groupchatqa.firebasestorage.app",
  messagingSenderId: "519214417608",
  appId: "1:519214417608:web:34d83f959c4ebca92447fd",
  measurementId: "G-35JMPB34FN"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);