import express from 'express';
import fichasRoutes from './Routes/fichas.routes.js';
import usuariosRoutes from './Routes/usuarios.routes.js'

BigInt.prototype.toJSON = function() {
    return this.toString();
};

const app = express();
app.use(express.json());
app.use('/fichas', fichasRoutes);
app.use('/usuarios', usuariosRoutes)
app.listen(3000, ()=>console.log("Follow the rabbit..."));