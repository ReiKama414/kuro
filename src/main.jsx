import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Kuro from './Kuro.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Kuro />
  </StrictMode>
);
