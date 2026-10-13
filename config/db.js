const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGO_URI_CRECEIDEA;
        if (!mongoUri) {
            throw new Error('MONGO_URI o MONGO_URI_CRECEIDEA no está configurada');
        }

        await mongoose.connect(mongoUri);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
