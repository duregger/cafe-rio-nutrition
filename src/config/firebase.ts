import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "import.meta.env.VITE_FIREBASE_API_KEY",
  authDomain: "cafe-rio-nutrition.firebaseapp.com",
  projectId: "cafe-rio-nutrition",
  storageBucket: "cafe-rio-nutrition.firebasestorage.app",
  messagingSenderId: "580398126365",
  appId: "1:580398126365:web:c15c765500a85d77c8fdf4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
