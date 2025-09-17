import React from 'react';
import { createRoot } from 'react-dom/client';
import { SupportApp } from './support/SupportApp';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><SupportApp /></React.StrictMode>);
