import { ErroHttp } from './erroHttp.js'

// DECISAO: formato da paginacao — escolhido: ?pagina=&limite= (padrao 1/20, maximo 100) devolvendo so a lista; alternativas: cursor, envelope { itens, total }
export function paginacao(query) {
  const pagina = Number(query.pagina ?? 1)
  const limite = Number(query.limite ?? 20)
  if (!Number.isInteger(pagina) || pagina < 1) {
    throw new ErroHttp(400, 'pagina inválida')
  }
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    throw new ErroHttp(400, 'limite deve ser entre 1 e 100')
  }
  return { skip: (pagina - 1) * limite, take: limite }
}
