
import { auth, db } from "../lib/firebase";
import { serverTimestamp } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";

// 🔐 SIGNUP
export const signup = async (email: string, password: string, username: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // Save user in Firestore (without password)
   await setDoc(doc(db, "users", user.uid), {
  user_id: user.uid,
  username: username,
  email: user.email,
  status: "active",
  created_at: serverTimestamp(),
  last_login: serverTimestamp(),
});
await setDoc(
  doc(db, "settings", user.uid),
  {
    user_id: user.uid,
    theme: "light",
    notifications: true,
    accent_color: "#22c55e",
    last_login: serverTimestamp(),
    status: "active",
  },
  { merge: true }
);
    return user;
  } catch (error: any) {
    console.error("Signup Error:", error.message);
    throw error;
  }
};

// 🔑 LOGIN
// 🔑 LOGIN
export const login = async (email: string, password: string) => {
  try {
    console.log("🔐 Starting login...");

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;
    console.log("✅ Logged in UID:", user.uid);
    console.log("📧 Email:", user.email);

    // ✅ ONLY update last_login (do not overwrite user data)
    await setDoc(
      doc(db, "users", user.uid),
      {
        last_login: serverTimestamp(),
      },
      { merge: true }
    );

    console.log("✅ Last login updated");

    return user;
  } catch (error: any) {
    console.error("❌ ERROR:", error);
    throw error;
  }
};
// 🚪 LOGOUT
export const logout = async () => {
  try {
    const user = auth.currentUser;

    if (user) {
      await setDoc(
        doc(db, "users", user.uid),
        {
          status: "inactive", // ✅ ADD THIS
        },
        { merge: true }
      );
    }

    await signOut(auth);
  } catch (error: any) {
    console.error("Logout Error:", error.message);
  }
};

// 👤 GET CURRENT USER
export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};
export const forgotPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Reset Error:", error.message);
    throw error;
  }
}
// 📄 GET USER DATA FROM FIRESTORE
export const getUserData = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error: any) {
    console.error("Get User Error:", error.message);
    throw error;
  }

};