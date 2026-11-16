import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './app.css';
import { AppProvider } from './ctx.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode><BrowserRouter><AppProvider><App /></AppProvider></BrowserRouter></StrictMode>
);
