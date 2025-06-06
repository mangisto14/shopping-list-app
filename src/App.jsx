import { useEffect, useState } from "react";

function App() {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("shopping-list");
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");

  useEffect(() => {
    localStorage.setItem("shopping-list", JSON.stringify(items));
  }, [items]);

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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">🛒 רשימת קניות</h1>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="הוסף פריט..."
            className="flex-1 border p-2 rounded"
          />
          <button onClick={addItem} className="bg-blue-500 text-white px-4 py-2 rounded">
            הוסף
          </button>
        </div>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex justify-between items-center p-2 bg-gray-100 rounded">
              <span
                onClick={() => toggleItem(index)}
                className={`cursor-pointer ${item.bought ? "line-through text-gray-400" : ""}`}
              >
                {item.name}
              </span>
              <button onClick={() => deleteItem(index)} className="text-red-500">🗑️</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
