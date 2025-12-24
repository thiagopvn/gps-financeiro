// Database Operations Module for GPS Financeiro

import { db, auth, storage } from './firebase-config.js';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    Timestamp,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getStartOfDay, getStartOfWeek, getStartOfMonth } from './utils.js';

// ============================================
// User Profile Operations
// ============================================

/**
 * Get user profile
 * @param {string} uid - User ID (optional, defaults to current user)
 * @returns {Promise<object|null>} User profile data
 */
export const getUserProfile = async (uid = null) => {
    const userId = uid || auth.currentUser?.uid;
    if (!userId) return null;

    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? { uid: userId, ...userDoc.data() } : null;
};

/**
 * Update user profile
 * @param {object} data - Profile data to update
 * @returns {Promise<boolean>} Success
 */
export const updateUserProfile = async (data) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    await updateDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp()
    });
    return true;
};

/**
 * Upload profile photo
 * @param {File} file - Image file
 * @returns {Promise<string>} Photo URL
 */
export const uploadProfilePhoto = async (file) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Usuário não autenticado');

    const storageRef = ref(storage, `profile-photos/${uid}`);
    await uploadBytes(storageRef, file);
    const photoURL = await getDownloadURL(storageRef);

    // Update user profile with new photo URL
    await updateUserProfile({ photoURL });

    return photoURL;
};

/**
 * Get user settings
 * @returns {Promise<object|null>} User settings
 */
export const getUserSettings = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const settingsDoc = await getDoc(doc(db, 'users', uid, 'settings', 'preferences'));
    return settingsDoc.exists() ? settingsDoc.data() : null;
};

/**
 * Update user settings
 * @param {object} data - Settings to update
 * @returns {Promise<boolean>} Success
 */
export const updateUserSettings = async (data) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    await setDoc(doc(db, 'users', uid, 'settings', 'preferences'), data, { merge: true });
    return true;
};

// ============================================
// Transaction Operations
// ============================================

/**
 * Add new transaction
 * @param {object} transaction - Transaction data
 * @returns {Promise<string>} Transaction ID
 */
export const addTransaction = async (transaction) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Usuário não autenticado');

    const transactionData = {
        ...transaction,
        userId: uid,
        createdAt: serverTimestamp(),
        date: Timestamp.fromDate(new Date(transaction.date))
    };

    const docRef = await addDoc(
        collection(db, 'users', uid, 'transactions'),
        transactionData
    );

    // Goals are updated separately by the calling page
    // to support different goal categories (receita, corridas, km)

    return docRef.id;
};

/**
 * Get transactions with optional filters
 * @param {object} filters - Filter options
 * @returns {Promise<array>} Transactions array
 */
export const getTransactions = async (filters = {}) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    const transactionsRef = collection(db, 'users', uid, 'transactions');
    let q = query(transactionsRef, orderBy('date', 'desc'));

    // Apply filters
    if (filters.type) {
        q = query(q, where('type', '==', filters.type));
    }
    if (filters.category) {
        q = query(q, where('category', '==', filters.category));
    }
    if (filters.startDate) {
        q = query(q, where('date', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
        q = query(q, where('date', '<=', Timestamp.fromDate(filters.endDate)));
    }
    if (filters.limit) {
        q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
    }));
};

/**
 * Get single transaction
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<object|null>} Transaction data
 */
export const getTransaction = async (transactionId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const docRef = doc(db, 'users', uid, 'transactions', transactionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
        id: docSnap.id,
        ...docSnap.data(),
        date: docSnap.data().date?.toDate() || new Date()
    };
};

/**
 * Update transaction
 * @param {string} transactionId - Transaction ID
 * @param {object} data - Data to update
 * @returns {Promise<boolean>} Success
 */
export const updateTransaction = async (transactionId, data) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    const updateData = { ...data };
    if (data.date) {
        updateData.date = Timestamp.fromDate(new Date(data.date));
    }

    await updateDoc(
        doc(db, 'users', uid, 'transactions', transactionId),
        updateData
    );
    return true;
};

/**
 * Delete transaction
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<boolean>} Success
 */
export const deleteTransaction = async (transactionId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    await deleteDoc(doc(db, 'users', uid, 'transactions', transactionId));
    return true;
};

/**
 * Get transactions summary (totals)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<object>} Summary with income, expenses, balance
 */
export const getTransactionsSummary = async (startDate, endDate) => {
    const transactions = await getTransactions({
        startDate,
        endDate
    });

    const summary = {
        income: 0,
        expenses: 0,
        balance: 0,
        count: transactions.length
    };

    transactions.forEach(t => {
        if (t.type === 'income') {
            summary.income += t.amount;
        } else {
            summary.expenses += t.amount;
        }
    });

    summary.balance = summary.income - summary.expenses;

    return summary;
};

/**
 * Subscribe to transactions summary in real-time
 * @param {Date} startDate - Start date filter
 * @param {function} callback - Callback with summary data
 * @returns {function} Unsubscribe function
 */
export const subscribeToTransactionsSummary = (startDate, callback) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
        callback({ income: 0, expenses: 0, balance: 0, count: 0 });
        return () => {};
    }

    const transactionsRef = collection(db, 'users', uid, 'transactions');
    const q = query(
        transactionsRef,
        where('date', '>=', Timestamp.fromDate(startDate)),
        orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const summary = {
            income: 0,
            expenses: 0,
            balance: 0,
            count: snapshot.docs.length
        };

        snapshot.docs.forEach(doc => {
            const t = doc.data();
            if (t.type === 'income') {
                summary.income += t.amount || 0;
            } else if (t.type === 'expense') {
                summary.expenses += t.amount || 0;
            }
        });

        summary.balance = summary.income - summary.expenses;
        callback(summary);
    }, (error) => {
        console.error('Erro ao ouvir transações:', error);
        callback({ income: 0, expenses: 0, balance: 0, count: 0 });
    });

    return unsubscribe;
};

// ============================================
// Session Operations
// ============================================

/**
 * Start new work session
 * @returns {Promise<string>} Session ID
 */
export const startSession = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Usuário não autenticado');

    const sessionData = {
        startTime: serverTimestamp(),
        endTime: null,
        duration: 0,
        earnings: 0,
        status: 'active',
        date: Timestamp.fromDate(getStartOfDay())
    };

    const docRef = await addDoc(
        collection(db, 'users', uid, 'sessions'),
        sessionData
    );

    return docRef.id;
};

/**
 * End work session
 * @param {string} sessionId - Session ID
 * @param {number} duration - Duration in seconds
 * @param {number} earnings - Total earnings
 * @returns {Promise<boolean>} Success
 */
export const endSession = async (sessionId, duration, earnings) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), {
        endTime: serverTimestamp(),
        duration,
        earnings,
        status: 'completed'
    });

    // Update goals with session earnings (receita category)
    if (earnings > 0) {
        await updateGoalsProgress(earnings, 'receita');
    }

    return true;
};

/**
 * Get sessions with optional filters
 * @param {object} filters - Filter options
 * @returns {Promise<array>} Sessions array
 */
export const getSessions = async (filters = {}) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    const sessionsRef = collection(db, 'users', uid, 'sessions');
    let q = query(sessionsRef, orderBy('startTime', 'desc'));

    if (filters.status) {
        q = query(q, where('status', '==', filters.status));
    }
    if (filters.limit) {
        q = query(q, limit(filters.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || null
    }));
};

/**
 * Get active session (if any)
 * @returns {Promise<object|null>} Active session or null
 */
export const getActiveSession = async () => {
    const sessions = await getSessions({ status: 'active', limit: 1 });
    return sessions.length > 0 ? sessions[0] : null;
};

// ============================================
// Goals Operations
// ============================================

/**
 * Add new goal
 * @param {object} goal - Goal data
 * @returns {Promise<string>} Goal ID
 */
export const addGoal = async (goal) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Usuário não autenticado');

    const goalData = {
        ...goal,
        current: 0,
        createdAt: serverTimestamp(),
        lastReset: serverTimestamp()
    };

    const docRef = await addDoc(
        collection(db, 'users', uid, 'goals'),
        goalData
    );

    return docRef.id;
};

/**
 * Get all goals
 * @returns {Promise<array>} Goals array
 */
export const getGoals = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    const goalsRef = collection(db, 'users', uid, 'goals');
    const q = query(goalsRef, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastReset: doc.data().lastReset?.toDate() || new Date()
    }));
};

/**
 * Get single goal
 * @param {string} goalId - Goal ID
 * @returns {Promise<object|null>} Goal data
 */
export const getGoal = async (goalId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const docRef = doc(db, 'users', uid, 'goals', goalId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
        id: docSnap.id,
        ...docSnap.data()
    };
};

/**
 * Update goal
 * @param {string} goalId - Goal ID
 * @param {object} data - Data to update
 * @returns {Promise<boolean>} Success
 */
export const updateGoal = async (goalId, data) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    await updateDoc(doc(db, 'users', uid, 'goals', goalId), data);
    return true;
};

/**
 * Delete goal
 * @param {string} goalId - Goal ID
 * @returns {Promise<boolean>} Success
 */
export const deleteGoal = async (goalId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return false;

    await deleteDoc(doc(db, 'users', uid, 'goals', goalId));
    return true;
};

/**
 * Update goals progress with new amount
 * @param {number} amount - Amount to add to goals
 * @param {string} category - Category to filter goals (receita, economia, corridas, km)
 */
export const updateGoalsProgress = async (amount, category) => {
    console.log('=== updateGoalsProgress v2 ===');
    console.log('Parametros recebidos:', { amount, category });

    // Validate category
    if (!category || typeof category !== 'string') {
        console.error('ERRO: categoria invalida:', category);
        return;
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0 || isNaN(amount)) {
        console.error('ERRO: valor invalido:', amount);
        return;
    }

    // Normalize category
    const targetCategory = String(category).toLowerCase().trim();
    console.log('Categoria alvo (normalizada):', targetCategory);

    // Get all goals
    const goals = await getGoals();
    console.log('Total de metas:', goals.length);
    console.log('Metas:', goals.map(g => ({ name: g.name, category: g.category })));

    // Filter and update only matching goals
    for (const goal of goals) {
        const goalCat = String(goal.category || '').toLowerCase().trim();

        console.log(`Comparando: meta "${goal.name}" categoria="${goalCat}" vs alvo="${targetCategory}"`);

        // STRICT comparison - must match exactly
        if (goalCat !== targetCategory) {
            console.log(`>>> IGNORANDO "${goal.name}" - categorias diferentes`);
            continue;
        }

        console.log(`>>> ATUALIZANDO "${goal.name}"`);

        // Check reset
        const shouldReset = checkGoalNeedsReset(goal);
        if (shouldReset) {
            await resetGoal(goal.id);
        }

        // Calculate new value
        const oldValue = shouldReset ? 0 : (goal.current || 0);
        const newValue = oldValue + amount;

        console.log(`Calculo: ${oldValue} + ${amount} = ${newValue}`);

        // Update in database
        await updateGoal(goal.id, { current: newValue });
        console.log(`Meta "${goal.name}" atualizada para ${newValue}`);
    }

    console.log('=== FIM updateGoalsProgress ===');
};

/**
 * Check if goal needs to be reset based on type
 * @param {object} goal - Goal object
 * @returns {boolean} Needs reset
 */
const checkGoalNeedsReset = (goal) => {
    const lastReset = goal.lastReset instanceof Date ? goal.lastReset : goal.lastReset?.toDate() || new Date();
    const now = new Date();

    switch (goal.type) {
        case 'daily':
            return getStartOfDay(lastReset).getTime() < getStartOfDay(now).getTime();
        case 'weekly':
            return getStartOfWeek(lastReset).getTime() < getStartOfWeek(now).getTime();
        case 'monthly':
            return getStartOfMonth(lastReset).getTime() < getStartOfMonth(now).getTime();
        default:
            return false;
    }
};

/**
 * Reset goal current value
 * @param {string} goalId - Goal ID
 */
export const resetGoal = async (goalId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await updateDoc(doc(db, 'users', uid, 'goals', goalId), {
        current: 0,
        lastReset: serverTimestamp()
    });
};

/**
 * Check and reset all goals that need it
 */
export const checkAndResetGoals = async () => {
    const goals = await getGoals();

    for (const goal of goals) {
        if (checkGoalNeedsReset(goal)) {
            await resetGoal(goal.id);
        }
    }
};

// ============================================
// Admin Operations
// ============================================

/**
 * Get all users (admin only)
 * @param {number} limitCount - Max users to fetch
 * @returns {Promise<array>} Users array
 */
export const getAllUsers = async (limitCount = 50) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(limitCount));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        // Garantir que o campo active existe (para usuários antigos)
        active: doc.data().active !== undefined ? doc.data().active : true
    }));
};

/**
 * Get pending users (users with active: false)
 * @returns {Promise<array>} Pending users array
 */
export const getPendingUsers = async () => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('active', '==', false), orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
    }));
};

/**
 * Toggle user activation status
 * @param {string} uid - User ID
 * @param {boolean} active - New active status
 * @returns {Promise<boolean>} Success
 */
export const toggleUserActivation = async (uid, active) => {
    await updateDoc(doc(db, 'users', uid), {
        active: active,
        updatedAt: serverTimestamp()
    });
    return true;
};

/**
 * Approve user (set active to true)
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} Success
 */
export const approveUser = async (uid) => {
    return toggleUserActivation(uid, true);
};

/**
 * Reject/block user (set active to false)
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} Success
 */
export const rejectUser = async (uid) => {
    return toggleUserActivation(uid, false);
};

/**
 * Delete user document (admin only)
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} Success
 */
export const deleteUser = async (uid) => {
    await deleteDoc(doc(db, 'users', uid));
    return true;
};

/**
 * Get all admins
 * @returns {Promise<array>} Admins array
 */
export const getAllAdmins = async () => {
    const adminsRef = collection(db, 'admins');
    const q = query(adminsRef, orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
    }));
};

/**
 * Create admin document
 * @param {string} uid - User ID
 * @param {object} data - Admin data
 * @returns {Promise<boolean>} Success
 */
export const createAdmin = async (uid, data) => {
    await setDoc(doc(db, 'admins', uid), {
        ...data,
        active: true,
        createdAt: serverTimestamp()
    });
    return true;
};

/**
 * Update admin status
 * @param {string} uid - Admin ID
 * @param {boolean} active - Active status
 * @returns {Promise<boolean>} Success
 */
export const updateAdminStatus = async (uid, active) => {
    await updateDoc(doc(db, 'admins', uid), { active });
    return true;
};

/**
 * Delete admin
 * @param {string} uid - Admin ID
 * @returns {Promise<boolean>} Success
 */
export const deleteAdmin = async (uid) => {
    await deleteDoc(doc(db, 'admins', uid));
    return true;
};

/**
 * Get dashboard stats (admin)
 * @returns {Promise<object>} Stats object
 */
export const getAdminStats = async () => {
    const [usersSnap, adminsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'admins'))
    ]);

    return {
        totalUsers: usersSnap.size,
        totalAdmins: adminsSnap.size
    };
};

// ============================================
// Data Export/Import
// ============================================

/**
 * Export all user data as JSON
 * @returns {Promise<object>} User data
 */
export const exportUserData = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Usuário não autenticado');

    const [profile, settings, transactions, sessions, goals] = await Promise.all([
        getUserProfile(),
        getUserSettings(),
        getTransactions(),
        getSessions(),
        getGoals()
    ]);

    return {
        exportDate: new Date().toISOString(),
        profile,
        settings,
        transactions,
        sessions,
        goals
    };
};

/**
 * Import user data from JSON
 * @param {object} data - Data to import
 * @returns {Promise<boolean>} Success
 */
export const importUserData = async (data) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Usuário não autenticado');

    // Import transactions
    if (data.transactions && Array.isArray(data.transactions)) {
        for (const transaction of data.transactions) {
            await addTransaction({
                ...transaction,
                date: transaction.date || new Date()
            });
        }
    }

    // Import goals
    if (data.goals && Array.isArray(data.goals)) {
        for (const goal of data.goals) {
            await addGoal(goal);
        }
    }

    // Import settings
    if (data.settings) {
        await updateUserSettings(data.settings);
    }

    return true;
};
