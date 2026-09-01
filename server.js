import express from 'express'
import fichasRoutes from './routes/fichas.routes.js'
import usuariosRoutes from './routes/usuarios.routes.js'

// transforma IDs BigInt em texto nas responses
BigInt.prototype.toJSON = function () {
  return this.toString()
}

const app = express() // inicia express
app.use(express.json()) // utilizado JSON como leitura e resposta
app.use('/fichas', fichasRoutes) // registra rotas de fichas
app.use('/usuarios', usuariosRoutes) // registra rotas de usuarios
app.listen(3000, () => console.log('Follow the rabbit...')) // inicia o servidor na porta 3000
