# 🎨 Tone Picker Text Tool

An interactive **text tone adjustment tool** powered by [Mistral AI](https://docs.mistral.ai).
Users can edit text, adjust tone using a **2D draggable tone picker**, and apply smooth tone transformations with **undo/redo** support.

Inspired by the tone matrix demo on the Mistral website.

---

## ✨ Features

* **Text Editor** – Write and edit text in real time.
* **2D Tone Picker** – Drag a knob across a **Conciseness ↔ Expansion** and **Professional ↔ Casual** grid.
* **Undo / Redo** – Revert tone changes easily.
* **Mistral AI Integration** – Text tone changes are powered by the free **Mistral Small** model.
* **Smooth UI** – Built with **React + TailwindCSS**, responsive and animated with Framer Motion.
* (Optional) **Persistence** – Store text and revision history in local storage.

---

## 🏗 Tech Stack

* **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) + [TailwindCSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
* **Backend**: [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
* **AI**: [Mistral Small Model API](https://docs.mistral.ai/)

---

## 📂 Project Structure

```
.
├── backend/               # Express.js backend
│   ├── app.js             # Backend entry (API proxy, caching, security)
│   ├── package.json
│   └── node_modules/
└── frontend/              # Vite + React frontend
    ├── src/               # React components (editor, picker, etc.)
    ├── public/            # Static assets
    ├── index.html         # Entry point
    ├── package.json
    └── vite.config.ts
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/tone-picker-tool.git
cd tone-picker-tool
```

### 2. Setup Backend

```bash
cd backend
npm install
```

* Add your **Mistral API key** to a `.env` file:

```env
MISTRAL_API_KEY=your_api_key_here
PORT=5000
```

* Run the backend:

```bash
npm start
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend will start (default: `http://localhost:5173`) and connect to the backend.

---

## 🖼 UI Preview

* **Left**: Editable text editor
* **Right**: Tone picker (2D grid with draggable knob)

---

## ⚠️ Error Handling

* Shows clear error states if API calls fail (e.g., network issues).
* Undo/redo history preserved even if API call fails.

---

## 🔮 Future Improvements

* 🌐 Add multi-language support.
* 💾 Save user sessions in database.
* 📊 Add tone intensity preview before applying changes.

## Frontend URL : https://fiddle-test-frontend.onrender.com

