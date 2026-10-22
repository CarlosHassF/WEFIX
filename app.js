import express from 'express'
import fichasRoutes from './routes/fichas.routes.js'
import usuariosRoutes from './routes/usuarios.routes.js'
import authRoutes from './routes/auth.routes.js'
import clientesRoutes from './routes/clientes.routes.js'
import dispositivosRoutes from './routes/dispositivos.routes.js'
import integracoesRoutes from './routes/integracoes.routes.js'
import prazosRoutes from './routes/prazos.routes.js'
import metricasRoutes from './routes/metricas.routes.js'
import {
  trataErros,
  rotaNaoEncontrada,
} from './middlewares/trataErros.middleware.js'

// transforma IDs BigInt em texto nas responses
BigInt.prototype.toJSON = function () {
  return this.toString()
}

const app = express() // inicia express
app.use(express.json()) // utilizado JSON como leitura e resposta
app.use('/fichas', fichasRoutes) // registra rotas de fichas
app.use('/usuarios', usuariosRoutes) // registra rotas de usuarios
app.use('/auth', authRoutes) // registra rotas de autenticacao
app.use('/clientes', clientesRoutes) // clientes e seus dispositivos
app.use('/dispositivos', dispositivosRoutes) // edicao de dispositivos
app.use('/prazos', prazosRoutes) // prazos (SLA) por status
app.use('/metricas', metricasRoutes) // metricas do supervisor
app.use('/integracoes/n8n', integracoesRoutes) // chamadas do n8n
app.use(rotaNaoEncontrada) // 404 em JSON
app.use(trataErros) // converte erros em respostas { erro }

export default app
