import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();


const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; 

app.listen(PORT, HOST, () => {
    // We remove the hardcoded 'localhost' from the log because 
    // in production, the server won't be on localhost.
    console.log(`
Listening on Port: ${PORT}
Upload Endpoint ready at /api/upload
    `);
});