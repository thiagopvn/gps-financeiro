// Authentication Module for GPS Financeiro

import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast, showLoading, hideLoading } from './utils.js';

// ============================================
// Email/Password Authentication
// ============================================

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} User object or error
 */
export const loginWithEmail = async (email, password) => {
    try {
        showLoading('Entrando...');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Check if user document exists
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (!userDoc.exists()) {
            // Create user document if it doesn't exist (for migrated users)
            await createUserDocument(userCredential.user);
        }

        hideLoading();
        showToast('Login realizado com sucesso!', 'success');
        return { success: true, user: userCredential.user };
    } catch (error) {
        hideLoading();
        const message = getAuthErrorMessage(error.code);
        showToast(message, 'error');
        return { success: false, error: message };
    }
};

/**
 * Register new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User display name
 * @param {object} additionalData - Additional user data
 * @returns {Promise<object>} User object or error
 */
export const registerWithEmail = async (email, password, name, additionalData = {}) => {
    try {
        showLoading('Criando conta...');

        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update profile with display name
        await updateProfile(userCredential.user, { displayName: name });

        // Create user document in Firestore
        await createUserDocument(userCredential.user, { name, ...additionalData });

        hideLoading();
        showToast('Conta criada com sucesso!', 'success');
        return { success: true, user: userCredential.user };
    } catch (error) {
        hideLoading();
        const message = getAuthErrorMessage(error.code);
        showToast(message, 'error');
        return { success: false, error: message };
    }
};

// ============================================
// Google Authentication
// ============================================

/**
 * Login with Google
 * @returns {Promise<object>} User object or error
 */
export const loginWithGoogle = async () => {
    try {
        showLoading('Conectando com Google...');
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        const result = await signInWithPopup(auth, provider);

        // Check if user document exists, create if not
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (!userDoc.exists()) {
            await createUserDocument(result.user, {
                name: result.user.displayName,
                photoURL: result.user.photoURL
            });
        }

        hideLoading();
        showToast('Login com Google realizado!', 'success');
        return { success: true, user: result.user };
    } catch (error) {
        hideLoading();
        if (error.code === 'auth/popup-closed-by-user') {
            return { success: false, error: 'Login cancelado' };
        }
        const message = getAuthErrorMessage(error.code);
        showToast(message, 'error');
        return { success: false, error: message };
    }
};

// ============================================
// Password Reset
// ============================================

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<object>} Success or error
 */
export const resetPassword = async (email) => {
    try {
        showLoading('Enviando email...');
        await sendPasswordResetEmail(auth, email);
        hideLoading();
        showToast('Email de recuperação enviado!', 'success');
        return { success: true };
    } catch (error) {
        hideLoading();
        const message = getAuthErrorMessage(error.code);
        showToast(message, 'error');
        return { success: false, error: message };
    }
};

// ============================================
// Logout
// ============================================

/**
 * Sign out current user
 * @returns {Promise<object>} Success or error
 */
export const logout = async () => {
    try {
        showLoading('Saindo...');
        await signOut(auth);
        hideLoading();
        showToast('Logout realizado', 'success');
        return { success: true };
    } catch (error) {
        hideLoading();
        showToast('Erro ao sair', 'error');
        return { success: false, error: error.message };
    }
};

// ============================================
// User Document Management
// ============================================

/**
 * Create user document in Firestore
 * @param {object} user - Firebase auth user
 * @param {object} additionalData - Additional user data
 */
const createUserDocument = async (user, additionalData = {}) => {
    const userRef = doc(db, 'users', user.uid);

    const userData = {
        email: user.email,
        name: additionalData.name || user.displayName || '',
        phone: additionalData.phone || '',
        vehicle: additionalData.vehicle || '',
        plate: additionalData.plate || '',
        photoURL: additionalData.photoURL || user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    // Create main user document
    await setDoc(userRef, userData);

    // Create settings subcollection document
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
    await setDoc(settingsRef, {
        darkMode: true,
        notifications: true,
        hourlyRate: 0,
        fcmToken: null
    });
};

/**
 * Get current user data from Firestore
 * @returns {Promise<object|null>} User data or null
 */
export const getCurrentUserData = async () => {
    const user = auth.currentUser;
    if (!user) return null;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) return null;

    return {
        uid: user.uid,
        email: user.email,
        ...userDoc.data()
    };
};

/**
 * Get user settings
 * @returns {Promise<object|null>} User settings or null
 */
export const getUserSettings = async () => {
    const user = auth.currentUser;
    if (!user) return null;

    const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'preferences'));
    if (!settingsDoc.exists()) return null;

    return settingsDoc.data();
};

// ============================================
// Auth State Observer
// ============================================

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function(user)
 * @returns {Function} Unsubscribe function
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Get current authenticated user
 * @returns {object|null} Current user or null
 */
export const getCurrentUser = () => {
    return auth.currentUser;
};

// ============================================
// Admin Authentication
// ============================================

/**
 * Check if current user is an admin
 * @returns {Promise<boolean>} Is admin
 */
export const isAdmin = async () => {
    const user = auth.currentUser;
    if (!user) return false;

    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists() && adminDoc.data().active === true;
};

/**
 * Login as admin
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<object>} Result
 */
export const loginAsAdmin = async (email, password) => {
    try {
        showLoading('Verificando credenciais...');

        // First login with email/password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Check if user is admin
        const adminDoc = await getDoc(doc(db, 'admins', userCredential.user.uid));

        if (!adminDoc.exists() || !adminDoc.data().active) {
            await signOut(auth);
            hideLoading();
            showToast('Acesso negado. Usuário não é administrador.', 'error');
            return { success: false, error: 'Não é administrador' };
        }

        // Update last login
        await setDoc(doc(db, 'admins', userCredential.user.uid), {
            lastLogin: serverTimestamp()
        }, { merge: true });

        hideLoading();
        showToast('Login de administrador realizado!', 'success');
        return { success: true, user: userCredential.user, admin: adminDoc.data() };
    } catch (error) {
        hideLoading();
        const message = getAuthErrorMessage(error.code);
        showToast(message, 'error');
        return { success: false, error: message };
    }
};

// ============================================
// Error Messages
// ============================================

/**
 * Get user-friendly error message from Firebase auth error code
 * @param {string} code - Firebase error code
 * @returns {string} User-friendly message
 */
const getAuthErrorMessage = (code) => {
    const messages = {
        'auth/email-already-in-use': 'Este email já está em uso.',
        'auth/invalid-email': 'Email inválido.',
        'auth/operation-not-allowed': 'Operação não permitida.',
        'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
        'auth/user-disabled': 'Conta desativada.',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/invalid-credential': 'Credenciais inválidas.',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
        'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
        'auth/popup-blocked': 'Popup bloqueado. Permita popups para este site.',
        'auth/popup-closed-by-user': 'Login cancelado.',
        'auth/account-exists-with-different-credential': 'Conta já existe com outro método de login.'
    };

    return messages[code] || 'Erro desconhecido. Tente novamente.';
};
