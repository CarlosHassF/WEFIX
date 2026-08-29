import db from '../database/connection.js';

export async function buscarTodasFichas(){
    const sql = "SELECT * FROM fichas";
    const consulta = await db.query(sql);

    return consulta.rows;
}

export async function buscarFichaPorStatus(status){
    const sql = "SELECT * FROM fichas WHERE status = $1";
    const consulta = await db.query(sql, [status]);

    return consulta.rows;
}

export async function criaNovaFicha(id_manutencao,nome_cliente, valor_servico, numero_cliente, observacao){
    const sql = "INSERT INTO fichas(id_manutencao,nome_cliente, valor_servico, numero_cliente, observacao) VALUES ($1, $2, $3, $4,$5)";
    const valores = [id_manutencao, nome_cliente, valor_servico, numero_cliente, observacao];

    return db.query(sql, valores)

}
