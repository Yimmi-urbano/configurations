// server.js
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const port = 7000;

// Conectar a MongoDB
mongoose.connect('mongodb+srv://data_user:wY1v50t8fX4lMA85@cluster0.entyyeb.mongodb.net/configuration', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const ConfigDataSchema = new mongoose.Schema({
    title: String,
    slogan: String,
    logo: String,
    colors: [String],
    catalogo: {
        button: {
            text: String,
            action: String,
            color_bg: String,
            color_text: String
        },
        whatsapp: {
            number: String
        },
        currency: {
            code: String,
            symbol: String
        }
    },
    social_links: [
        {
            title: String,
            icon: String,
            url: String,
            is_active: Boolean
        }
    ],
    meta_description: String,
    meta_keyword: String
});


function getCollectionName(domain) {
    return `config-${domain}`;
}


// Middleware
app.use(bodyParser.json());

// Ruta para obtener el documento JSON
app.get('/api/configurations', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ message: 'Domain header is required' });
        }

        const collectionName = getCollectionName(domain);
        const ConfigModel = mongoose.model('Config', ConfigDataSchema, collectionName);

        const printConfig = await ConfigModel.find({});
        res.json(printConfig);
        
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Ruta para actualizar el documento JSON de forma grupal
app.put('/api/update', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ message: 'Domain header is required' });
        }

        const updates = req.body;
        const collectionName = getCollectionName(domain);
        const ConfigModel = mongoose.model('Config', ConfigDataSchema, collectionName);
        const configstore = await ConfigModel.findOneAndUpdate({}, updates, { new: true, upsert: true });

        res.json(configstore);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
