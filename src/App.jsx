import { useState } from "react";
import "./index.css";
import { useLanguage } from "./LanguageContext";
import { appLabels } from "./i18n/app";

function App() {
  const { language, setLanguage } = useLanguage();
  const t = appLabels[language];

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("shopping-list");
    return saved ? JSON.parse(saved) : [];
  });

  const [input, setInput] = useState("");

  const addItem = () => {
    if (!input.trim()) return;
    setItems([...items, { name: input, bought: false }]);
    setInput("");
  };

  const toggleItem = (index) => {
    const updated = [...items];
    updated[index].bought = !updated[index].bought;
    setItems(updated);
  };

  const deleteItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border rounded p-1"
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 border p-2 rounded"
          />
          <button onClick={addItem} className="bg-blue-500 text-white px-4 py-2 rounded">
            {t.add}
          </button>
        </div>

        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex justify-between items-center p-2 bg-gray-100 rounded"
            >
              <span
                onClick={() => toggleItem(index)}
                className={`cursor-pointer ${
                  item.bought ? "line-through text-gray-400" : ""
                }`}
              >
                {item.name}
              </span>
              <button
                onClick={() => deleteItem(index)}
                className="text-red-500"
              >
                🗑️ {t.delete}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;