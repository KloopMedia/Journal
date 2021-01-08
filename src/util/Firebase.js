import firebase from 'firebase';

const firebaseConfig = {
    apiKey: "AIzaSyBfzhQOCtbcUk_tWjPDnjYtHwoouCEkclg",
    authDomain: "journal-bb5e3.firebaseapp.com",
    databaseURL: "https://journal-bb5e3.firebaseio.com",
    projectId: "journal-bb5e3",
    storageBucket: "journal-bb5e3.appspot.com",
    messagingSenderId: "918752509407",
    appId: "1:918752509407:web:77670a68ff906f13e5d86a"
};
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  const provider = new firebase.auth.GoogleAuthProvider();
  export const signInWithGoogle = () => {
    firebase.auth().signInWithPopup(provider);
  };

export default firebase;