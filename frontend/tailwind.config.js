/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a',    
        secondary: '#334155',  
        accent: '#22c55e',    
        danger: '#ef4444',   
        background: '#f8fafc', 
        surface: '#ffffff',    
      }
    },
  },
  plugins: [],
}