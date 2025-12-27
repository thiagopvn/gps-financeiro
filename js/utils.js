// Utility functions for GPS Financeiro

// ============================================
// Currency Formatting
// ============================================

/**
 * Format number as Brazilian Real currency
 * @param {number} value - The value to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
};

/**
 * Parse Brazilian currency string to number
 * @param {string} value - Currency string (e.g., "R$ 1.234,56")
 * @returns {number} Parsed number
 */
export const parseCurrency = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return parseFloat(
        value.replace(/[R$\s.]/g, '').replace(',', '.')
    ) || 0;
};

/**
 * Currency input mask
 * @param {HTMLInputElement} input - Input element
 */
export const applyCurrencyMask = (input) => {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = (parseInt(value) / 100).toFixed(2);
        if (isNaN(value) || value === 'NaN') value = '0.00';
        e.target.value = formatCurrency(parseFloat(value));
    });
};

// ============================================
// Date Formatting
// ============================================

/**
 * Format date in Brazilian format
 * @param {Date|string|number} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
    const d = new Date(date);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return d.toLocaleDateString('pt-BR', options);
};

/**
 * Format date as relative (hoje, ontem, etc.)
 * @param {Date|string|number} date - Date to format
 * @returns {string} Relative date string
 */
export const formatRelativeDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
        return 'Hoje';
    } else if (d.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
    } else {
        return d.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'short'
        });
    }
};

/**
 * Format time (HH:MM)
 * @param {Date|string|number} date - Date to extract time from
 * @returns {string} Time string
 */
export const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Format duration in hours and minutes
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Format duration as human readable
 * @param {number} seconds - Duration in seconds
 * @returns {string} Human readable duration
 */
export const formatDurationHuman = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
};

// ============================================
// Form Validation
// ============================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with score and messages
 */
export const validatePassword = (password) => {
    const result = {
        valid: false,
        score: 0,
        messages: []
    };

    if (password.length < 6) {
        result.messages.push('Mínimo de 6 caracteres');
    } else {
        result.score++;
    }

    if (password.length >= 8) result.score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) result.score++;
    if (/\d/.test(password)) result.score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) result.score++;

    result.valid = result.score >= 2 && password.length >= 6;

    return result;
};

/**
 * Validate Brazilian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid phone
 */
export const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
};

/**
 * Apply phone mask to input
 * @param {HTMLInputElement} input - Input element
 */
export const applyPhoneMask = (input) => {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length > 6) {
            value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
        } else if (value.length > 2) {
            value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        } else if (value.length > 0) {
            value = `(${value}`;
        }

        e.target.value = value;
    });
};

// ============================================
// Toast Notifications
// ============================================

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 */
export const showToast = (message, type = 'info', duration = 3000) => {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(t => t.remove());

    // Create toast container if not exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2';
        document.body.appendChild(container);
    }

    // Define colors based on type
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification flex items-center gap-3 px-4 py-3 rounded-xl ${colors[type]} text-white shadow-lg transform transition-all duration-300 translate-y-[-20px] opacity-0`;
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[20px]">${icons[type]}</span>
        <span class="text-sm font-medium">${message}</span>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-[-20px]', 'opacity-0');
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// ============================================
// Loading States
// ============================================

/**
 * Show loading overlay
 * @param {string} message - Loading message
 */
export const showLoading = (message = 'Carregando...') => {
    // Remove existing
    hideLoading();

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center';
    overlay.innerHTML = `
        <div class="bg-surface-dark rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xl">
            <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p class="text-white text-sm font-medium">${message}</p>
        </div>
    `;

    document.body.appendChild(overlay);
};

/**
 * Hide loading overlay
 */
export const hideLoading = () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
};

/**
 * Set button loading state
 * @param {HTMLButtonElement} button - Button element
 * @param {boolean} loading - Is loading
 * @param {string} loadingText - Text to show while loading
 */
export const setButtonLoading = (button, loading, loadingText = 'Aguarde...') => {
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <span class="flex items-center justify-center gap-2">
                <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                ${loadingText}
            </span>
        `;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
};

// ============================================
// Local Storage Helpers
// ============================================

/**
 * Save data to localStorage with JSON serialization
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export const saveLocal = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

/**
 * Get data from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Stored value or default
 */
export const getLocal = (key, defaultValue = null) => {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    try {
        return JSON.parse(item);
    } catch {
        return item;
    }
};

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export const removeLocal = (key) => {
    localStorage.removeItem(key);
};

// ============================================
// URL & Navigation Helpers
// ============================================

/**
 * Get URL query parameter
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value
 */
export const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

/**
 * Navigate to URL with optional delay
 * @param {string} url - URL to navigate to
 * @param {number} delay - Delay in ms
 */
export const navigateTo = (url, delay = 0) => {
    if (delay > 0) {
        setTimeout(() => window.location.href = url, delay);
    } else {
        window.location.href = url;
    }
};

// ============================================
// DOM Helpers
// ============================================

/**
 * Get element by ID with type safety
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element
 */
export const $ = (id) => document.getElementById(id);

/**
 * Query selector shorthand
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {HTMLElement|null} Element
 */
export const $q = (selector, parent = document) => parent.querySelector(selector);

/**
 * Query selector all shorthand
 * @param {string} selector - CSS selector
 * @param {HTMLElement} parent - Parent element (default: document)
 * @returns {NodeList} Elements
 */
export const $qa = (selector, parent = document) => parent.querySelectorAll(selector);

/**
 * Add event listener to element(s)
 * @param {string|HTMLElement|NodeList} target - Element(s) or selector
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 */
export const on = (target, event, handler) => {
    if (typeof target === 'string') {
        document.querySelectorAll(target).forEach(el => el.addEventListener(event, handler));
    } else if (target instanceof NodeList) {
        target.forEach(el => el.addEventListener(event, handler));
    } else if (target) {
        target.addEventListener(event, handler);
    }
};

// ============================================
// Debounce & Throttle
// ============================================

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 300) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// ============================================
// Misc Helpers
// ============================================

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
export const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if device is mobile
 * @returns {boolean} Is mobile device
 */
export const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Get current date at start of day (midnight)
 * @returns {Date} Date at midnight
 */
export const getStartOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get start of week (Monday)
 * @returns {Date} Monday of current week
 */
export const getStartOfWeek = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get start of month
 * @returns {Date} First day of current month
 */
export const getStartOfMonth = (date = new Date()) => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get end of day (23:59:59.999)
 * @returns {Date} End of the given day
 */
export const getEndOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Get end of week (Sunday 23:59:59.999)
 * @returns {Date} Sunday of current week
 */
export const getEndOfWeek = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = 7 - day; // days until Sunday
    d.setDate(d.getDate() + (day === 0 ? 0 : diff));
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Get end of month
 * @returns {Date} Last day of current month
 */
export const getEndOfMonth = (date = new Date()) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0); // Last day of previous month (which is current month)
    d.setHours(23, 59, 59, 999);
    return d;
};
