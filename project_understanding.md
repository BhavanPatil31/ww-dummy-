# WealthWise Project Understanding

This document provides a comprehensive overview of the technical implementation and features developed for the WealthWise application.

## 🚀 Core Objectives
To build a modern, dark-themed fintech application that allows users to manage investments, track portfolio performance, and fetch real-time mutual fund data.

---

## 🏗️ System Architecture

### 1. Backend (Spring Boot)
A robust REST API handling data persistence, authentication, and external service integration.
- **Port**: `8088`
- **Database**: MySQL (`wealthwise1_db`)
- **Key Modules**:
    - **Authentication**: JWT-based secure login/signup.
    - **Investment Service**: Manages user portfolios and assets.
    - **Mutual Fund Service**: Integration with `api.mfapi.in`.

### 2. Frontend (React + Vite)
A premium UI built with modern CSS and reactive components.
- **Styling**: Vanilla CSS with a bespoke fintech dark theme.
- **State Management**: React Hooks (`useState`, `useEffect`, `useRef`).
- **Communication**: Axios for backend API calls.

---

## ✨ Key Features Implemented

### 📈 Mutual Fund Integration
- **Real-time Search**: A reactive search bar in `AddInvestment.jsx` that filters ~20,000 funds.
- **Smart Fetching**: Backend caches the complete fund list on startup for zero-latency searching.
- **Automated NAV**: Selecting a fund automatically fetches its latest Net Asset Value (NAV) and populates the form.
- **Unit Calculation**: Real-time calculation of units based on invested amount and current NAV.

### 🔐 Authentication & Security
- **JWT Persistence**: JWT tokens are used for secure communication.
- **Session Continuity**: Implementation of `localStorage` persistence in `App.jsx`, ensuring users stay logged in even after a page refresh.
- **Form Validation**: Clean error handling for login and signup processes.

### 🍱 Dashboard & Investment UI
- **Add Investment Page**: A detailed form supporting both **SIP** and **Lumpsum** investments.
- **Premium Aesthetics**: Glassmorphism, subtle gradients, and micro-animations for a high-end feel.
- **Success States**: Visual feedback after successful data submission.

---

## 📂 Key File Map

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **Backend Service** | `MutualFundService.java` | Core logic for fetching and caching external fund data. |
| **Backend Controller** | `MutualFundController.java` | API endpoints for fund lists and details. |
| **Main Frontend** | `App.jsx` | Routing and auth session persistence logic. |
| **Investment Page** | `AddInvestment.jsx` | Searchable fund selection and investment entry form. |
| **Global Styles** | `AddInvestment.css` | Design system and component-specific styling. |

---

## 🛠️ Technical Decisions
- **@PostConstruct Optimization**: Used in the backend to pre-load fund data, ensuring the frontend never waits for a cold API fetch.
- **Reactive useEffects**: Used in the frontend to handle asynchronous data arrival, making the UI feel snappy.
- **LocalStorage Sync**: Used to solve the "Refresh-to-Logout" issue by persisting the user object.
