const mongoose = require('mongoose');

const ConfigDataSchema = new mongoose.Schema({
    domain: { type: String, required: true, unique: true },
    title: String,
    slogan: String,
    logo: String,
    theme: String,
    type_store: String,
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

module.exports = ConfigDataSchema;
