const mongoose = require('mongoose');
const ConfigDataSchema = require('../models/configData');
//const getCollectionName = require('../utils/getCollectionName');

const ConfigModel = mongoose.model('Config', ConfigDataSchema, 'configuration'); // Usar una sola colección

exports.addBanner = async (req, res) => {
    try {
        const { image, text, button } = req.body;

        if (!image || !text || !Array.isArray(button) || button.length === 0) {
            return res.status(400).json({ status: false, message: 'Required fields are missing or invalid' });
        }

        const config = await ConfigModel.findOne({ domain: req.domain });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        config.banner.push(req.body);
        await config.save();

        res.status(201).json({ status: true, message: 'Banner added successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
};

exports.updateBanner = async (req, res) => {
    try {
        const { image, text, button } = req.body;

        if (!image || !text || !Array.isArray(button) || button.length === 0) {
            return res.status(400).json({ status: false, message: 'Required fields are missing or invalid' });
        }

        const config = await ConfigModel.findOne({ domain: req.domain });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        const bannerIndex = config.banner.findIndex(banner => banner._id.toString() === req.params.bannerId);
        if (bannerIndex === -1) {
            return res.status(404).json({ status: false, message: 'Banner not found' });
        }

        config.banner[bannerIndex] = { ...config.banner[bannerIndex], ...req.body };
        await config.save();

        res.status(200).json({ status: true, message: 'Banner updated successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
};

exports.deleteBanner = async (req, res) => {
    try {
        const config = await ConfigModel.findOne({ domain: req.domain });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        const bannerIndex = config.banner.findIndex(banner => banner._id.toString() === req.params.bannerId);
        if (bannerIndex === -1) {
            return res.status(404).json({ status: false, message: 'Banner not found' });
        }

        config.banner.splice(bannerIndex, 1);
        await config.save();

        res.status(200).json({ status: true, message: 'Banner deleted successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
};

exports.getBanners = async (req, res) => {
    try {
        const config = await ConfigModel.findOne({ domain: req.domain }, 'banner');
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' });
        }

        res.json(config.banner);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getBannerById = async (req, res) => {
    try {
        const config = await ConfigModel.findOne({ domain: req.domain });
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' });
        }

        const banner = config.banner.find(banner => banner._id.toString() === req.params.bannerId);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        res.json(banner);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateLogo = async (req, res) => {
    try {
        const { logo } = req.body;

        if (!logo) {
            return res.status(400).json({ status: false, message: 'Logo field is required' });
        }

        const config = await ConfigModel.findOneAndUpdate({ domain: req.domain }, { logo }, { new: true, upsert: true });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        res.status(200).json({ status: true, message: 'Logo updated successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
};

exports.updateMetadata = async (req, res) => {
    try {
        const { meta_description, meta_keyword, title, slogan } = req.body;
        const updateFields = {};

        if (meta_description) updateFields.meta_description = meta_description;
        if (meta_keyword) updateFields.meta_keyword = meta_keyword;
        if (title) updateFields.title = title;
        if (slogan) updateFields.slogan = slogan;

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ status: false, message: 'No fields provided for update' });
        }

        const config = await ConfigModel.findOneAndUpdate({ domain: req.domain }, updateFields, { new: true, upsert: true });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        res.status(200).json({ status: true, message: 'Metadata updated successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
};

exports.getConfigByDomain = async (req, res) => {
    try {
        const config = await ConfigModel.findOne({ domain: req.domain });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        res.status(200).json([config]);
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
};

exports.updateColors = async (req, res) => {
    try {
        const { colors } = req.body;

        if (!colors || !Array.isArray(colors)) {
            return res.status(400).json({ status: false, message: 'Colors field is required and should be an array' });
        }

        const config = await ConfigModel.findOne({ domain: req.domain });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        config.colors = colors; // Actualiza el campo 'colors'
        await config.save();

        res.status(200).json({ status: true, message: 'Colors updated successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
};

exports.updateCatalogo = async (req, res) => {
    try {
        const { catalogo } = req.body;

        // Validación para asegurar que el campo catalogo esté presente y sea un objeto
        if (!catalogo || typeof catalogo !== 'object') {
            return res.status(400).json({ status: false, message: "El campo 'catalogo' es requerido y debe ser un objeto." });
        }

        // Buscar la configuración basada en el dominio desde req.domain
        const config = await ConfigModel.findOne({ domain: req.domain });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuración no encontrada' });
        }

        // Actualizar el campo catalogo
        config.catalogo = catalogo;
        await config.save(); // Guardar los cambios

        // Respuesta exitosa
        res.status(200).json({ status: true, message: 'Catálogo actualizado correctamente' });
    } catch (err) {
        // Manejo de errores
        res.status(500).json({ status: false, message: err.message });
    }
};


exports.createConfig = async (req, res) => {
    try {
        const domain = req.headers['domain'];

        if (!domain) {
            return res.status(400).json({ status: false, message: 'Domain header is required' });
        }

        const existingConfig = await ConfigModel.findOne({ domain: domain });

        if (existingConfig) {
            return res.status(400).json({ status: false, message: 'Configuration already exists' });
        }

        const newConfig = new ConfigModel({ ...req.body, domain: domain }); // Incluir domain
        await newConfig.save();
        return res.status(201).json({ status: true, message: 'Configuration created successfully', config: newConfig });

    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
};
