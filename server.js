import express from 'express';
import fichasRoutes from './Routes/fichas.routes.js';

const app = express();
app.use(express.json());
app.use('/fichas', fichasRoutes);
app.listen(3000, ()=>console.log("Follow the rabbit..."));