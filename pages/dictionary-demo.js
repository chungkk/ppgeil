import React, { useState } from 'react';
import DictionaryPopup from '../components/DictionaryPopup';

export default function DictionaryDemo() {
  const [showDictPopup, setShowDictPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');

  const handleWordClick = (word) => {
    setSelectedWord(word);
    setShowDictPopup(true);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Dictionary Popup Demo</h1>
      
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '15px' }}>Popup mới (Dictionary Popup)</h2>
        <p style={{ marginBottom: '15px', lineHeight: '1.8', fontSize: '16px' }}>
          Đặc điểm:
        </p>
        <ul style={{ marginBottom: '20px', lineHeight: '1.8' }}>
          <li>Nằm ở top của màn hình (gần thanh trình duyệt)</li>
          <li>Gộp &quot;Giải thích&quot; và &quot;Ví dụ&quot; trong 1 trang</li>
          <li>Bỏ tab &quot;Ngữ pháp&quot;</li>
          <li>Overlay nhẹ hơn (30% opacity) để nhìn thấy nội dung phía sau</li>
        </ul>
        <p style={{ marginBottom: '15px', lineHeight: '1.8', fontSize: '16px' }}>
          Click vào các từ tiếng Đức bên dưới để xem popup:
        </p>
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ fontSize: '18px', lineHeight: '2' }}>
            Wenn man da unten reingeht, dann sieht man zuerst die{' '}
            <span
              onClick={() => handleWordClick('Treppenhaus')}
              style={{
                color: '#4A90E2',
                fontWeight: 'bold',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '2px 4px',
                borderRadius: '3px',
                background: '#e3f2fd'
              }}
            >
              Treppenhaus
            </span>
            , dann kommt man zu den Wohnungen, wo die Familien und Menschen leben. Aber mehr als die{' '}
            <span
              onClick={() => handleWordClick('Wohnungstüren')}
              style={{
                color: '#4A90E2',
                fontWeight: 'bold',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '2px 4px',
                borderRadius: '3px',
                background: '#e3f2fd'
              }}
            >
              Wohnungstüren
            </span>{' '}
            kann man natürlich nicht sehen.
          </p>
        </div>
      </div>

      {showDictPopup && (
        <DictionaryPopup
          word={selectedWord}
          onClose={() => setShowDictPopup(false)}
        />
      )}
    </div>
  );
}
