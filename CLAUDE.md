# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GPS Financeiro is a financial management PWA (Progressive Web App) designed for rideshare drivers (Uber, 99, Indrive). The application helps drivers track income, expenses, set financial goals, and manage work shifts.

## Technology Stack

- **Frontend**: Static HTML pages with Tailwind CSS (via CDN)
- **Styling**: Tailwind CSS with custom theme configuration inline in each HTML file
- **Icons**: Google Material Symbols Outlined
- **Fonts**: Inter (primary), Manrope (login page)
- **No build system**: Pages are standalone HTML files with inline Tailwind config

## Architecture

The project is organized into two main modules:

### User Module (`/user/`)
End-user facing screens for drivers:
- `Dashboard/dash.html` - Main dashboard with balance, revenue, expenses, and goals progress
- `login/login.html` - User authentication (email/password, Apple, Google)
- `login/newlogin.html`, `login/newsenha.html` - Registration and password recovery
- `Lancamento/lancamento.html` - Transaction entry form (income/expense with categories)
- `transacao/transacao.html` - Transaction history list with filters
- `metas/meta.html` - Goals management (daily/weekly/monthly targets)
- `newmeta/newmeta.html` - Create new goal
- `Registro/registro.html` - Work shift time tracking with timer
- `configuracoes/config.html` - User settings and profile management

### Admin Module (`/admin/`)
Administrative panel for system management:
- `dashadmin/dashadmin.html` - Admin dashboard
- `loginadmin/loginadmin.html` - Admin authentication
- `admins/admins.html` - Admin user management
- `newadmin/newadmin.html` - Create new admin
- `usergerenciamento/usergerenciamento.html` - User management
- `newuser/newuser.html` - Create new user

## Design System

Each page includes inline Tailwind configuration with consistent theme colors:
- `primary`: #13ec80 (vibrant green) - varies slightly per page (#13ec5b on login)
- `background-dark`: #102219 (deep dark green)
- `background-light`: #f6f8f7
- `surface-dark`: #162e22 to #1c2721 (card backgrounds in dark mode)

Dark mode is enabled by default (`<html class="dark">`).

## Development Notes

- All pages are mobile-first, designed for max-width 448px (md container)
- iOS safe area padding is applied using `pb-safe` and `pt-safe` classes
- Bottom navigation is fixed with a floating action button (FAB) for adding transactions
- No JavaScript framework - interactive elements use vanilla JS where needed
- Currency format: Brazilian Real (R$)
- Language: Portuguese (pt-BR)
