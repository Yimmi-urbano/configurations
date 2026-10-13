const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const configRoutes = require('./routes/configRoutes');

require('dotenv').config({
    path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../.env'),
});

const app = express();
const port = process.env.PORT || 7000;

connectDB();

app.use(cors());
app.use(bodyParser.json());

app.use('/api', configRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
