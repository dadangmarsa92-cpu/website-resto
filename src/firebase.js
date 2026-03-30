import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAfhh-BqiIEUvcYClD45Ox0GzzcUqUrTVE",
  authDomain: "websiteresto-75596.firebaseapp.com",
  projectId: "websiteresto-75596",
  storageBucket: "websiteresto-75596.firebasestorage.app",
  messagingSenderId: "591896695685",
  appId: "1:591896695685:web:1f4a54f7e4b658cc4f6aec"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
