const mongoose = require('mongoose');

const ConfigDataSchema = new mongoose.Schema({
    domain: { type: String, required: true, unique: true },
    origin: { type: String, default: null },
    title: String,
    owner_company: String,
    slogan: String,
    logo: String,
    theme: String,
    type_store: String,
    colors: [String],
    whatsapp_home: {
        number: String,
        message_custom: String,
        isActive: Boolean
    },
    order_notifications: {
        is_active: { type: Boolean, default: false },
        phone: { type: String, default: null }
    },
    catalogo: {
        button: {
            text: String,
            action: String,
            color_bg: String,
            color_text: String
        },
        whatsapp: {
            number: String,
            message_custom: String,
            isActive: Boolean
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
    opening_hours: [
        {
            days: String,
            hours: String,
            is_closed: { type: Boolean, default: false }
        }
    ],
    address: String,
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
    ],
    widgets: {
        toolbar: {
            is_active: { type: Boolean, default: true },
            items: [{
                action: String,
                is_center: Boolean,
                is_display: { type: Boolean, default: true }
            }]
        }
    }
});

module.exports = ConfigDataSchema;
