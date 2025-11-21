import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { PhotoData } from '../types';

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Authenticate silently
export const signIn = async () => {
  try {
    await signInAnonymously(auth);
    console.log("Signed in anonymously to Firebase");
  } catch (error) {
    console.error("Error signing in:", error);
  }
};

// Upload photo to Firebase Storage and return the public URL
export const uploadPhotoToStorage = async (base64Data: string, id: string): Promise<string> => {
  const storageRef = ref(storage, `retro_photos/${id}.png`);
  await uploadString(storageRef, base64Data, 'data_url');
  return await getDownloadURL(storageRef);
};

// Save photo metadata to Firestore
export const savePhotoToFirestore = async (photo: PhotoData) => {
  try {
    await addDoc(collection(db, 'retro_photos'), {
      ...photo,
      // Ensure we don't save the massive base64 string if we have a storage URL, 
      // but for now we might be saving the storage URL in the `imageUrl` field.
    });
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

// Realtime listener for gallery
export const subscribeToGallery = (onUpdate: (photos: PhotoData[]) => void) => {
  const q = query(collection(db, 'retro_photos'), orderBy('timestamp', 'desc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const photos: PhotoData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<PhotoData, 'id'>;
      // Firestore stores data, we attach the doc ID
      photos.push({ ...data, id: doc.id, firestoreId: doc.id } as PhotoData);
    });
    onUpdate(photos);
  });
};

// Delete photo from Firestore and Storage
export const deletePhotoFromFirebase = async (firestoreId: string, storageId: string) => {
  try {
    // 1. Delete from Firestore
    await deleteDoc(doc(db, 'retro_photos', firestoreId));
    
    // 2. Delete from Storage (try/catch in case it doesn't exist)
    try {
        const storageRef = ref(storage, `retro_photos/${storageId}.png`);
        await deleteObject(storageRef);
    } catch (storageError) {
        console.warn("Could not delete file from storage (might be already gone)", storageError);
    }
  } catch (e) {
    console.error("Error deleting photo:", e);
  }
};
