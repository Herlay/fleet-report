import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; 
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

// 1. Grab environment variables using Vite's syntax
const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;

// 2. Safety Check: Warn in the console if the .env file is missing or misnamed
if (!domain || !clientId) {
  console.error("Auth0 Error: Missing domain or clientId. Check your .env file!");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: window.location.origin 
        }}
        cacheLocation="localstorage" 
      >
        <App />
      </Auth0Provider>
    </BrowserRouter>
  </React.StrictMode>
);