import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';

export { firebase, auth, firestore, database };

// Shortcut refs
export const db = firestore();
export const rtdb = database();

// Collections
export const C = {
  users: 'users',
  messages: 'messages',
  media: 'media',
  bandwidth: 'bandwidth',
  blocked: 'blocked',
  sessions: 'sessions',
};
