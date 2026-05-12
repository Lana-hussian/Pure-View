import { useState } from 'react';

const toasts = [];
let setToastsRef = null;

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  setToastsRef = setList;

  const remove = (id) => setList(p => p.filter(t => t.id !== id));

  return (
    <>
      {children}
      <div className="toast-container">
        {list.map(t => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            onClick={() => remove(t.id)}
          >
            <span style={{ marginRight: 8 }}>{t.type === 'success' ? '✅' : '❌'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}

export function toast(message, type = 'success') {
  const id = Date.now();
  setToastsRef?.(p => [...p, { id, message, type }]);
  setTimeout(() => setToastsRef?.(p => p.filter(t => t.id !== id)), 3500);
}
