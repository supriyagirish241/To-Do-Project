// SOURCE/lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAPYeuLLXDmjmfU7bFNz363vgzyQB7NBho",
  authDomain: "to-do-26c3d.firebaseapp.com",
  projectId: "to-do-26c3d",
  storageBucket: "to-do-26c3d.appspot.com", 
  messagingSenderId: "454974551200",
  appId: "1:454974551200:web:a938b6d4a9b9566d92c5c5",
};

// Initialize Firebase FIRST
const app = initializeApp(firebaseConfig);

// Then export services
export const db = getFirestore(app);   
export const auth = getAuth(app);     