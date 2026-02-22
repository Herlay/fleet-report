import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create the pool: Use the URL string if available, otherwise use individual parts
const pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL || {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fleet_analytics',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL Database Connected Successfully');
        connection.release();
    } catch (error) {
        console.error('Database Connection Failed:', error.message);
      
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

testConnection();

export default pool;