const firebaseConfig = {
  apiKey: "AIzaSyCPJU-nXPOTRIY14On28Zrj-TCR2gXW56g",
  authDomain: "imak-business-enterprise.firebaseapp.com",
  projectId: "imak-business-enterprise",
  storageBucket: "imak-business-enterprise.firebasestorage.app",
  messagingSenderId: "333788591804",
  appId: "1:333788591804:web:c00829fbc4f38eccde42b9"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
