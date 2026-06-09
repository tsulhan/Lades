// Firebase Proje Bilgileri Entegre Edildi
const firebaseConfig = {
    apiKey: "AIzaSyD2ijuUFDlYd2L5G84V0qxV6cRbGZZZ4zQ",
    authDomain: "lades-f33dd.firebaseapp.com",
    databaseURL: "https://lades-f33dd-default-rtdb.firebaseio.com",
    projectId: "lades-f33dd",
    storageBucket: "lades-f33dd.firebasestorage.app",
    messagingSenderId: "483364824467",
    appId: "1:483364824467:web:f30ca9ddd7e279b0057466",
    measurementId: "G-HXX48CWRLB"
};

// Firebase Başlatma
firebase.initializeApp(firebaseConfig);
const database = firebase.database();