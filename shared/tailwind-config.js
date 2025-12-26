// Configuração centralizada do Tailwind CSS
// Este arquivo é carregado por todas as páginas para garantir consistência
window.tailwind && (tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#FFD700",
                "primary-hover": "#EAB308",
                "background-light": "#FFFFFF",
                "background-dark": "#000000",
                "surface-dark": "#18181b",
                "surface-light": "#f4f4f5",
                "success": "#22c55e",
                "danger": "#ef4444",
                "info": "#3b82f6",
                "warning": "#f59e0b",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"],
                "body": ["Inter", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.5rem",
                "lg": "0.75rem",
                "xl": "1rem",
                "2xl": "1.5rem",
                "full": "9999px"
            },
        },
    },
});
