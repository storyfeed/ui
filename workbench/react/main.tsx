import { createRoot } from 'react-dom/client';
import App from './App';
import '../../build/react-tokens.css';
document.documentElement.classList.toggle(
    'dark',
    new URLSearchParams(location.search).get('theme') === 'dark',
);
createRoot(document.getElementById('app')!).render(<App />);
