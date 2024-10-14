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

// get un enlace social
exports.getSocialLink = async (req, res) => {
    const domain = req.headers.domain; // Obtener el domain de los headers
 

    if (!domain) return res.status(400).json({ message: 'Domain no proporcionado en los headers' });

    try {
        // Encuentra la configuración según el dominio
        const config = await ConfigModel.findOne({ domain });
        if (!config) return res.status(404).json({ message: 'Configuración no encontrada' });

        // Retornar solo la lista de social_links actualizada
        res.status(200).json(config.social_links); // Aquí se retorna directamente el array
    } catch (error) {
        res.status(500).json({ message: 'Error al agregar enlace social', error });
    }
};

// Agregar un enlace social
exports.addSocialLink = async (req, res) => {
    const domain = req.headers.domain; // Obtener el domain de los headers
    const { title, icon, url, is_active } = req.body;

    if (!domain) return res.status(400).json({ message: 'Domain no proporcionado en los headers' });

    try {
        // Encuentra la configuración según el dominio
        const config = await ConfigModel.findOne({ domain });
        if (!config) return res.status(404).json({ message: 'Configuración no encontrada' });

        // Agregar nuevo enlace social
        config.social_links.push({ title, icon, url, is_active });
        await config.save();

        // Retornar solo la lista de social_links actualizada
        res.status(200).json(config.social_links); // Aquí se retorna directamente el array
    } catch (error) {
        res.status(500).json({ message: 'Error al agregar enlace social', error });
    }
};

// Editar un enlace social existente
exports.editSocialLink = async (req, res) => {
    try {
        const domain = req.headers.domain; // Obtener el dominio de los headers
        const { linkId } = req.params; // Obtener el ID del enlace social desde los parámetros de la URL
        const { title, icon, url, is_active } = req.body; // Datos actualizados del enlace social

        if (!domain) return res.status(400).json({ status: false, message: 'Domain no proporcionado en los headers' });

        // Encuentra la configuración según el dominio
        const config = await ConfigModel.findOne({ domain });
        if (!config) return res.status(404).json({ status: false, message: 'Configuración no encontrada' });

        // Encuentra el índice del enlace social por ID
        const socialLinkIndex = config.social_links.findIndex(link => link._id.toString() === linkId);
        if (socialLinkIndex === -1) return res.status(404).json({ status: false, message: 'Enlace social no encontrado' });

        // Actualizar los campos del enlace social
        if (title) config.social_links[socialLinkIndex].title = title;
        if (icon) config.social_links[socialLinkIndex].icon = icon;
        if (url) config.social_links[socialLinkIndex].url = url;
        if (is_active !== undefined) config.social_links[socialLinkIndex].is_active = is_active;

        // Guarda los cambios en la configuración
        await config.save();

        // Retorna la lista actualizada de enlaces sociales
        res.status(200).json(config.social_links); // Aquí se retorna directamente el array
    } catch (error) {
        // Manejar errores
        res.status(500).json({ status: false, message: 'Error al actualizar el enlace social', error: error.message });
    }
};

exports.deleteSocialLink = async (req, res) => {
    try {
        // Encuentra la configuración según el dominio en el header
        const config = await ConfigModel.findOne({ domain: req.headers.domain });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuración no encontrada' });
        }

        // Encuentra el índice del enlace social según el ID proporcionado en la URL
        const socialLinkIndex = config.social_links.findIndex(link => link._id.toString() === req.params.linkId);
        if (socialLinkIndex === -1) {
            return res.status(404).json({ status: false, message: 'Enlace social no encontrado' });
        }

        // Elimina el enlace social de la lista
        config.social_links.splice(socialLinkIndex, 1);

        // Guarda los cambios en la configuración
        await config.save();

        // Retorna una respuesta exitosa con la lista actualizada de enlaces sociales
        res.status(200).json(config.social_links);
    } catch (err) {
        // En caso de error, retorna un mensaje de error
        res.status(500).json({ status: false, message: err.message });
    }
};

exports.updateTheme = async (req, res) => {
    try {
        const { theme } = req.body;

        if (!theme) {
            return res.status(400).json({ status: false, message: 'Theme field is required' });
        }

        const config = await ConfigModel.findOneAndUpdate({ domain: req.domain }, { theme }, { new: true, upsert: true });
        if (!config) {
            return res.status(404).json({ status: false, message: 'Configuration not found' });
        }

        res.status(200).json({ status: true, message: 'Theme updated successfully' });
    } catch (err) {
        res.status(500).json({ status: false, message: err.message });
    }
};
