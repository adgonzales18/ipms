import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './db/connection.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import categoryRoutes from './routes/category.js';
import locationRoutes from './routes/location.js';
import companyRoutes from './routes/company.js';
import productRoutes from './routes/product.js';

dotenv.config();

const app = express();

const allowedOrigins = [
    'http://localhost:5173'
]

app.use(cors({
    origin: (origin, callback) => {
        if(!origin || allowedOrigins.includes(origin)){
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    }, 

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/product', productRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/location', locationRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });
