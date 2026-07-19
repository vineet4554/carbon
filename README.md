# 🌱 EcoPilot AI – Unified Green Platform

EcoPilot AI is a state-of-the-art carbon footprint tracking, analytics, and lifestyle-coaching web application. It empowers users to monitor their carbon impact, scan utility statements, perform visual appliance audits, run carbon simulations, and receive personalized recommendations backed by AI.

---

## 🌟 Architecture Breakdown

The project is structured into two clean services for maximum performance and unified language architecture:
1.  **Frontend** (`frontend/`): A Single Page Application (SPA) built using **React + Vite** and JavaScript. Preserves the visual aesthetics of the original platform using Tailwind CSS and Framer Motion, and connects to the Node.js backend.
2.  **Backend** (`backend/`): A **Node.js + Express.js** server serving user authentication, daily logging, Mongoose models, and orchestrating API calls. It connects directly to the **Google Gemini API** for vision auditing and chat coaching, persisting all records directly to **MongoDB**.

```
                     ┌──────────────────────────┐
                     │       User Browser       │
                     └─────────────┬────────────┘
                                   │
                                   ▼ HTTP / JSON
                     ┌──────────────────────────┐
                     │   frontend (Port 3000)   │
                     │       Vite + React       │
                     └─────────────┬────────────┘
                                   │
                                   ▼ API requests
                     ┌──────────────────────────┐
                     │   backend (Port 8000)    │     Mongoose
                     │     Node.js Express      ├───────────────┐
                     │     + Gemini GenAI       │               │
                     └──────────────────────────┘               ▼
                                                         ┌─────────────┐
                                                         │   MongoDB   │
                                                         │(Port 27017) │
                                                         └─────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
-   **Framework**: React 19 + Vite 8 (JavaScript SPA)
-   **Styling**: Tailwind CSS + Custom Dark Mode themes
-   **Animations**: Framer Motion
-   **Routing**: React Router DOM v7
-   **Icons**: Lucide React
-   **Charts**: Recharts & Custom SVGs

### Backend (Express)
-   **Framework**: Node.js + Express.js
-   **AI/LLM/Vision**: Official `@google/genai` Node.js SDK (utilizing `gemini-2.5-flash`)
-   **Database**: MongoDB via Mongoose
-   **Security**: jsonwebtoken (JWT) & bcryptjs (Password hashing)
-   **Services**: pdfkit (sustainability reports) & nodemailer (notifications)

---

## 📁 Project Directory Structure

```
├── backend/                    # Node.js Express server
│   ├── config/                 # MongoDB and Gemini config settings
│   ├── controllers/            # API request controller logic
│   ├── middleware/             # JWT auth & security filters
│   ├── models/                 # Mongoose database schemas
│   ├── routes/                 # Express endpoint router definitions
│   ├── services/               # PDF report and email helpers
│   ├── server.js               # Server entry point
│   ├── package.json            # Node.js dependencies
│   └── .env                    # Environment settings
├── frontend/                   # Vite React frontend application
│   ├── public/                 # Static assets (images, icons)
│   ├── src/
│   │   ├── components/         # Reusable layouts & UI widgets
│   │   ├── pages/              # SPA page components
│   │   ├── services/           # API fetch and token client
│   │   ├── App.jsx             # React Router routing map
│   │   ├── index.css           # Global Tailwind CSS style template
│   │   └── main.jsx            # React root injection point
│   ├── vite.config.js          # Vite config server settings
│   └── package.json            # Frontend dependencies
└── README.md                   # Project documentation
```

---

## ⚙️ Configuration & Environment Setup

### 1. Express Backend Setup (`backend/.env`)
Create a `.env` file inside the `backend/` folder:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/ecopilot
JWT_SECRET=supersecretjwtkeythatisreallylongandsecure123!
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GEMINI_API_KEY=your_gemini_api_key_here
ENVIRONMENT=development
PORT=8000
```

### 2. Frontend Setup
Vite resolves local API configurations using `import.meta.env.VITE_API_URL`. It defaults to `http://127.0.0.1:8000` (Node.js backend port), but can be customized by defining a `VITE_API_URL` variable.

---

## 🚀 Running the Project Locally

1.  **MongoDB**: Start your local MongoDB service listening on Port `27017`.
2.  **Express Backend**:
    ```bash
    cd backend
    npm install
    npm run dev
    ```
3.  **Vite React Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
