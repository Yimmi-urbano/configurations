const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors'); // Agrega el paquete CORS

const app = express();
const port = 7000;

// Configura CORS para permitir solicitudes de cualquier origen
app.use(cors());

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
    meta_keyword: String,
    banner: [
        {
            image: String,
            text: String,
            button: [
                {
                    action: String,
                    destino: String,
                    show: Boolean,
                    text_button: String
                }
            ]
        }
    ]
});

function getCollectionName(domain) {
    return `config-${domain}`;
}

app.use(bodyParser.json());

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

// Endpoint para agregar un banner
app.post('/api/banners', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ status: false, message: 'Domain header is required' });
        }

        const { image, text, button } = req.body;

        // Validar que se proporcionen los campos requeridos
        if (!image || !text || !Array.isArray(button)) {
            return res.status(400).json({ status: false, message: 'Required fields are missing or invalid' });
        }

        // Validar que el array de botones tenga al menos un botón
        if (button.length === 0) {
            return res.status(400).json({ status: false, message: 'At least one button is required' });
        }

        const collectionName = getCollectionName(domain);
        const ConfigModel = mongoose.model('Config', ConfigDataSchema, collectionName);

        const config = await ConfigModel.findOne({});
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        config.banner.push(req.body);
        await config.save();

        res.status(201).json({ status: true, message: 'Banner added successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// Endpoint para actualizar un banner
app.put('/api/banners/:bannerId', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ status: false, message: 'Domain header is required' });
        }

        const { image, text, button } = req.body;

        // Validar que se proporcionen los campos requeridos
        if (!image || !text || !Array.isArray(button)) {
            return res.status(400).json({ status: false, message: 'Required fields are missing or invalid' });
        }

        // Validar que el array de botones tenga al menos un botón
        if (button.length === 0) {
            return res.status(400).json({ status: false, message: 'At least one button is required' });
        }

        const collectionName = getCollectionName(domain);
        const ConfigModel = mongoose.model('Config', ConfigDataSchema, collectionName);

        const config = await ConfigModel.findOne({});
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        // Busca el banner por ID (ajustar si el campo es diferente a `_id`)
        const bannerIndex = config.banner.findIndex(banner => banner._id.toString() === req.params.bannerId);
        if (bannerIndex === -1) {
            return res.status(404).json({ status: false, message: 'Banner not found' });
        }

        // Actualiza el banner
        config.banner[bannerIndex] = { ...config.banner[bannerIndex], ...req.body };
        await config.save();

        res.status(200).json({ status: true, message: 'Banner updated successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// Endpoint para eliminar un banner
app.delete('/api/banners/:bannerId', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ status: false, message: 'Domain header is required' });
        }

        const collectionName = getCollectionName(domain);
        const ConfigModel = mongoose.model('Config', ConfigDataSchema, collectionName);

        const config = await ConfigModel.findOne({});
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        // Busca el banner por ID (ajustar si el campo es diferente a `_id`)
        const bannerIndex = config.banner.findIndex(banner => banner._id.toString() === req.params.bannerId);
        if (bannerIndex === -1) {
            return res.status(404).json({ status: false, message: 'Banner not found' });
        }

        // Elimina el banner
        config.banner.splice(bannerIndex, 1);
        await config.save();

        res.status(200).json({ status: true, message: 'Banner deleted successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// Endpoint para obtener solo los banners
app.get('/api/banners', async (req, res) => {
    try {
        const domain = req.headers['domain'];
        if (!domain) {
            return res.status(400).json({ message: 'Domain header is required' });
        }

        const collectionName = getCollectionName(domain);
        const ConfigModel = mongoose.model('Config', ConfigDataSchema, collectionName);

        const config = await ConfigModel.findOne({}, 'banner'); // Solo selecciona el campo 'banner'
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' });
        }

        res.json(config.banner);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
