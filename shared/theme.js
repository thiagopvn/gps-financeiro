// Gerenciamento de tema - Executa imediatamente para evitar flash
(function() {
    const savedTheme = localStorage.getItem('gps-theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
})();
