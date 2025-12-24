// Firebase Configuration for GPS Financeiro
// Using Firebase SDK v10+ (modular)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getMessaging, isSupported } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAWhjDiTyUSmAwgA0d2T05Op_dobKXcZlk",
    authDomain: "gps-financeiro-e39fd.firebaseapp.com",
    databaseURL: "https://gps-financeiro-e39fd-default-rtdb.firebaseio.com",
    projectId: "gps-financeiro-e39fd",
    storageBucket: "gps-financeiro-e39fd.firebasestorage.app",
    messagingSenderId: "705482332766",
    appId: "1:705482332766:web:635524be0df72a894372cf",
    measurementId: "G-PZ0ZD5VZ8H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize messaging only if supported
let messaging = null;
isSupported().then(supported => {
    if (supported) {
        messaging = getMessaging(app);
    }
});

// Auth state observer
const waitForAuth = () => {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
};

// Check if user is authenticated AND approved
const requireAuth = async (redirectTo = '/user/login/login.html') => {
    const user = await waitForAuth();
    if (!user) {
        window.location.href = redirectTo;
        return null;
    }

    // Verificar se o usuário está aprovado
    try {
        // Verificar se é admin (admins sempre podem acessar)
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        const isAdminUser = adminDoc.exists() && adminDoc.data().active === true;

        if (!isAdminUser) {
            // Verificar aprovação do usuário normal
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                // Se active é explicitamente false, bloquear
                // Se active não existe (usuário antigo), permitir acesso
                if (userData.active === false) {
                    await signOut(auth);
                    // Redirecionar para login com mensagem
                    window.location.href = redirectTo + '?pending=1';
                    return null;
                }
            }
        }
    } catch (error) {
        console.warn('Erro ao verificar aprovação:', error);
        // Em caso de erro, permitir acesso para não bloquear usuários legítimos
    }

    return user;
};

// Check if user is NOT authenticated (for login/register pages)
const requireNoAuth = async (redirectTo = '/user/Dashboard/dash.html') => {
    const user = await waitForAuth();
    if (user) {
        window.location.href = redirectTo;
        return null;
    }
    return true;
};

export {
    app,
    auth,
    db,
    storage,
    messaging,
    waitForAuth,
    requireAuth,
    requireNoAuth
};
