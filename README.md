# Team-Nexen: AI Supply Chain Analytics 📦

AI-powered warehouse performance analytics system for anomaly detection, time-series forecasting, and intelligent operations monitoring.

🔗 **Live Demo:** https://team-nexen.vercel.app

Built during **Eurekathon 3.0**, this project is a complete full-stack implementation of a Supply Chain Metric Tree-Driven Analysis System. It leverages advanced machine learning models to predict and explain the Performance Outcome Index (POI) while providing a real-time, interactive dashboard for warehouse managers.

---

## ✨ Key Features

### 🧠 Advanced AI & Analytics

- **Anomaly Detection:** Utilizes Isolation Forest to automatically highlight critical metric deviations.
- **Time-Series Forecasting:** Employs LSTM networks to predict future Performance Outcome Index (POI) trends.
- **Root Cause Classification:** Automated categorization of operational issues using Random Forest models.

---

### 💻 Interactive Dashboard

- **Metric Tree Visualization:** Hierarchical, color-coded node graphs built with React Flow.
- **AI Copilot Sidebar:** Context-aware conversational AI providing instant analysis, trend charts (7/30 days), and actionable operational fixes.
- **Real-time Data:** Live data polling every 30 seconds with multi-warehouse filtering.

---

### ⚙️ Robust API & Data Management

- **Real-time Simulation:** Automated synthetic data generator mimicking live warehouse operations.
- **Role-Based Access Control:** Secure JWT authentication distinguishing Manager and Analyst roles.
- **Comprehensive Reporting:** Automated PDF/CSV export functionality and audit logging.

---

## 🛠️ Tech Stack

**Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, React Flow, Recharts  
**Backend:** Node.js, Express.js, MongoDB, JWT Auth  
**ML Engine:** Python, LSTM, Isolation Forest, Random Forest, Gunicorn  

---

## 🚀 Getting Started

### 1️⃣ Start the ML Engine

```bash
cd ml-engine
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
gunicorn app:app
