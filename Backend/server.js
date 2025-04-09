const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', //  MySQL username
  password: '', //  MySQL password
  database: 'purchase_system', // Database name
});

db.connect((err) => {
  if (err) throw err;
  console.log('MySQL Connected...');
});

// API endpoint to get products
app.get('/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});