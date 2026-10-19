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
        },
        stock: {
            show_out_of_stock_products: { type: Boolean, default: true },
            allow_purchase_without_stock: { type: Boolean, default: false },
            show_stock_quantity: { type: Boolean, default: true },
            out_of_stock_label: { type: String, default: 'Agotado' }
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
    },
    storefront_appearance: {
        background: {
            type: { type: String, default: 'solid' },
            solid_color: { type: String, default: '#F8FAFC' },
            gradient_from: { type: String, default: '#FFF7ED' },
            gradient_to: { type: String, default: '#F1F5F9' },
            gradient_angle: { type: Number, default: 135 },
            image_url: { type: String, default: '' },
            image_opacity: { type: Number, default: 1 }
        },
        accessories: [{
            id: String,
            name: String,
            kind: { type: String, default: 'image' },
            image_url: { type: String, default: '' },
            placement: { type: String, default: 'top-right' },
            size: { type: String, default: 'medium' },
            animation: { type: String, default: 'none' },
            is_active: { type: Boolean, default: true }
        }]
    }
});

module.exports = ConfigDataSchema;
