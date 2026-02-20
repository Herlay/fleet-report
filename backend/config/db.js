import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();


const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_NAME || 'fleet_analytics',
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0,
    decimalNumbers: true 
});


const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL Database Connected Successfully');
        connection.release(); 
    } catch (error) {
        console.error('Database Connection Failed:', error.message);
        process.exit(1); 
    }
};

testConnection();

export default pool;