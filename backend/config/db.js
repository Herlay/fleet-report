import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();


const pool = mysql.createPool({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '', 
    database: process.env.MYSQLDATABASE || 'fleet_analytics',
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0,
    decimalNumbers: true 
});

const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log(' MySQL Database Connected Successfully to Railway');
        connection.release(); 
    } catch (error) {
        console.error(' Database Connection Failed:', error.message);
        process.exit(1); 
    }
};

testConnection();

export default pool;