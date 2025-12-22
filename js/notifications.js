// Firebase Cloud Messaging Module
import { messaging, db, auth } from './firebase-config.js';
import { getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js';
import { doc, updateDoc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// VAPID Key for web push (you'll need to get this from Firebase Console)
// Go to Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token or null if denied
 */
export async function requestNotificationPermission() {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Get FCM token
        if (messaging) {
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });

            if (token) {
                // Save token to user's settings in Firestore
                await saveFCMToken(token);
                return token;
            }
        }

        return null;
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return null;
    }
}

/**
 * Save FCM token to Firestore
 * @param {string} token - FCM token
 */
async function saveFCMToken(token) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
            await updateDoc(settingsRef, { fcmToken: token });
        } else {
            await setDoc(settingsRef, {
                fcmToken: token,
                notifications: true,
                darkMode: true,
                hourlyRate: 0
            });
        }
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
}

/**
 * Remove FCM token from Firestore (when user disables notifications)
 */
export async function removeFCMToken() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        await updateDoc(settingsRef, {
            fcmToken: null,
            notifications: false
        });
    } catch (error) {
        console.error('Error removing FCM token:', error);
    }
}

/**
 * Listen for foreground messages
 * @param {Function} callback - Callback function when message received
 */
export function onForegroundMessage(callback) {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);

        // Show custom notification
        if (callback) {
            callback(payload);
        } else {
            // Default notification display
            showLocalNotification(payload.notification.title, payload.notification.body);
        }
    });
}

/**
 * Show a local notification (browser notification)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} options - Additional options
 */
export function showLocalNotification(title, body, options = {}) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            tag: options.tag || 'gps-financeiro',
            requireInteraction: options.requireInteraction || false,
            ...options
        });

        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        // Handle click
        notification.onclick = () => {
            window.focus();
            if (options.url) {
                window.location.href = options.url;
            }
            notification.close();
        };
    }
}

/**
 * Notify when goal is achieved
 * @param {Object} goal - Goal object
 */
export function notifyGoalAchieved(goal) {
    showLocalNotification(
        'Meta Atingida!',
        `Parabéns! Você alcançou a meta "${goal.name}"`,
        {
            tag: 'goal-achieved-' + goal.id,
            requireInteraction: true,
            url: '/user/metas/meta.html'
        }
    );
}

/**
 * Notify when goal is close to being achieved (90%)
 * @param {Object} goal - Goal object
 * @param {number} percentage - Current percentage
 */
export function notifyGoalProgress(goal, percentage) {
    if (percentage >= 90 && percentage < 100) {
        showLocalNotification(
            'Quase lá!',
            `Você está a ${100 - percentage}% de alcançar "${goal.name}"`,
            {
                tag: 'goal-progress-' + goal.id,
                url: '/user/metas/meta.html'
            }
        );
    }
}

/**
 * Notify daily summary (called by service worker at end of day)
 * @param {Object} summary - Daily summary data
 */
export function notifyDailySummary(summary) {
    const { earnings, sessions, goalProgress } = summary;

    let body = `Ganhos: R$ ${earnings.toFixed(2)}`;
    if (sessions > 0) {
        body += ` | ${sessions} sessões`;
    }

    showLocalNotification(
        'Resumo do Dia',
        body,
        {
            tag: 'daily-summary',
            url: '/user/Dashboard/dash.html'
        }
    );
}

/**
 * Check if notifications are enabled
 * @returns {boolean}
 */
export function areNotificationsEnabled() {
    return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Get notification permission status
 * @returns {string} 'granted', 'denied', or 'default'
 */
export function getNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
}
