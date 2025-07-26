import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "finsight-q95mq",
  "appId": "1:525505519459:web:c25e92d9093b8138d37d56",
  "storageBucket": "finsight-q95mq.firebasestorage.app",
  "apiKey": "AIzaSyCFSy8eq1xK2ay0Z-pEQcw_RhpMs9KlZds",
  "authDomain": "finsight-q95mq.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "525505519459"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
