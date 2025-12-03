// MobileMenuToggle.js
import React, { useState } from 'react';
import '../styles/Mobile.css';

export default function MobileMenuToggle() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? '✕' : '☰'}
      </button>
      
      {isOpen && (
        <div className="mobile-menu-overlay">
          {/* Add your mobile menu content here */}
        </div>
      )}
    </>
  );
}