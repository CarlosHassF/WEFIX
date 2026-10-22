import pkg from '@prisma/client'
import prisma from '../database/connection.js'

const { Prisma } = pkg

// intervalo [de 00:00, ate+1 00:00) no fuso de Sao Paulo
function noPeriodo(coluna, { de, ate }) {
  // ::timestamp antes do AT TIME ZONE: interpreta a meia-noite como horario de SP
  return Prisma.sql`${Prisma.raw(coluna)} >= (${de}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
    AND ${Prisma.raw(coluna)} < ((${ate}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')`
}

function doTecnico({ id_tecnico }) {
  return id_tecnico === undefined
    ? Prisma.sql`TRUE`
    : Prisma.sql`f.id_tecnico = ${id_tecnico}`
}

// bigint/Decimal do postgres para number (null continua null)
function numeros(linhas, campos) {
  return linhas.map((linha) => {
    const convertida = { ...linha }
    for (const campo of campos) {
      if (convertida[campo] !== null)
        convertida[campo] = Number(convertida[campo])
    }
    return convertida
  })
}

export async function concluidasPorDia(filtros) {
  const onde = Prisma.sql`f.status IN ('consertado', 'cancelado')
    AND ${noPeriodo('f.finalizada_em', filtros)} AND ${doTecnico(filtros)}`
  const dia = Prisma.sql`to_char(f.finalizada_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')`
  const contagens = Prisma.sql`count(*) FILTER (WHERE f.status = 'consertado') AS consertadas,
    count(*) FILTER (WHERE f.status = 'cancelado') AS canceladas`

  const total = await prisma.$queryRaw`
    SELECT ${dia} AS dia, ${contagens}
    FROM "Ficha" f WHERE ${onde}
    GROUP BY 1 ORDER BY 1`
  const por_tecnico = await prisma.$queryRaw`
    SELECT f.id_tecnico, u.nome_usuario AS nome_tecnico, ${dia} AS dia, ${contagens}
    FROM "Ficha" f JOIN "Usuario" u ON u.id_usuario = f.id_tecnico
    WHERE ${onde}
    GROUP BY f.id_tecnico, u.nome_usuario, 3 ORDER BY 3, 2`

  const campos = ['consertadas', 'canceladas']
  return {
    total: numeros(total, campos),
    por_tecnico: numeros(por_tecnico, campos),
  }
}

// soma as passagens de cada ficha pelo mesmo status antes de agregar
export async function tempoPorStatus(filtros) {
  const linhas = await prisma.$queryRaw`
    WITH passagens AS (
      SELECT e.id_manutencao, e.status,
        sum(EXTRACT(EPOCH FROM e.saiu_em - e.entrou_em))::float8 / 3600 AS horas
      FROM "Evento" e JOIN "Ficha" f ON f.id_manutencao = e.id_manutencao
      WHERE e.saiu_em IS NOT NULL AND ${noPeriodo('e.saiu_em', filtros)}
        AND ${doTecnico(filtros)}
      GROUP BY e.id_manutencao, e.status
    )
    SELECT status::text AS status, count(*) AS fichas,
      round(avg(horas)::numeric, 2) AS media_horas,
      round(percentile_cont(0.5) WITHIN GROUP (ORDER BY horas)::numeric, 2) AS mediana_horas,
      round(max(horas)::numeric, 2) AS max_horas
    FROM passagens GROUP BY status ORDER BY status`
  return numeros(linhas, [
    'fichas',
    'media_horas',
    'mediana_horas',
    'max_horas',
  ])
}

export async function tempoTotal(filtros) {
  const duracoes = Prisma.sql`
    SELECT f.id_tecnico,
      EXTRACT(EPOCH FROM f.finalizada_em - f.created_at)::float8 / 3600 AS horas
    FROM "Ficha" f
    WHERE f.status = 'consertado' AND ${noPeriodo('f.finalizada_em', filtros)}
      AND ${doTecnico(filtros)}`
  const agregados = Prisma.sql`count(*) AS fichas,
    round(avg(horas)::numeric, 2) AS media_horas,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY horas)::numeric, 2) AS mediana_horas`

  const [total] = await prisma.$queryRaw`
    SELECT ${agregados} FROM (${duracoes}) d`
  const por_tecnico = await prisma.$queryRaw`
    SELECT d.id_tecnico, u.nome_usuario AS nome_tecnico, ${agregados}
    FROM (${duracoes}) d JOIN "Usuario" u ON u.id_usuario = d.id_tecnico
    GROUP BY d.id_tecnico, u.nome_usuario ORDER BY u.nome_usuario`

  const campos = ['fichas', 'media_horas', 'mediana_horas']
  return {
    total: numeros([total], campos)[0],
    por_tecnico: numeros(por_tecnico, campos),
  }
}

// evento conta como expirado se fechou estourado ou se segue aberto apos o prazo
export async function prazos(filtros) {
  const eventos = Prisma.sql`
    SELECT e.status, f.id_tecnico,
      CASE WHEN e.saiu_em IS NULL THEN e.prazo_limite < now() ELSE e.expirado END AS estourado
    FROM "Evento" e JOIN "Ficha" f ON f.id_manutencao = e.id_manutencao
    WHERE e.prazo_limite IS NOT NULL AND ${noPeriodo('e.entrou_em', filtros)}
      AND ${doTecnico(filtros)}`
  const contagens = Prisma.sql`count(*) AS eventos,
    count(*) FILTER (WHERE estourado) AS expirados,
    round(100.0 * count(*) FILTER (WHERE estourado) / count(*), 2) AS percentual`

  const por_status = await prisma.$queryRaw`
    SELECT status::text AS status, ${contagens}
    FROM (${eventos}) ev GROUP BY status ORDER BY status`
  const por_tecnico = await prisma.$queryRaw`
    SELECT ev.id_tecnico, u.nome_usuario AS nome_tecnico, ${contagens}
    FROM (${eventos}) ev JOIN "Usuario" u ON u.id_usuario = ev.id_tecnico
    GROUP BY ev.id_tecnico, u.nome_usuario ORDER BY u.nome_usuario`
  // todas as etapas abertas estouradas agora, independente do periodo
  const fichas_atrasadas = await prisma.$queryRaw`
    SELECT e.id_manutencao, e.status::text AS status, e.entrou_em, e.prazo_limite, f.id_tecnico
    FROM "Evento" e JOIN "Ficha" f ON f.id_manutencao = e.id_manutencao
    WHERE e.saiu_em IS NULL AND e.prazo_limite < now() AND ${doTecnico(filtros)}
    ORDER BY e.prazo_limite`

  const campos = ['eventos', 'expirados', 'percentual']
  return {
    por_status: numeros(por_status, campos),
    por_tecnico: numeros(por_tecnico, campos),
    fichas_atrasadas,
  }
}
