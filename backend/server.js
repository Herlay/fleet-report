import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; 

app.listen(PORT, HOST, () => {
  console.log(`

Server is running!

Listening on Port: ${PORT}
`);
});