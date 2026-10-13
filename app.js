const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');
const configRoutes = require('./routes/configRoutes');

const localEnvPath = path.resolve(__dirname, '.env');
const parentEnvPath = path.resolve(__dirname, '../.env');

require('dotenv').config({
    path: process.env.DOTENV_CONFIG_PATH || (fs.existsSync(localEnvPath) ? localEnvPath : parentEnvPath),
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
