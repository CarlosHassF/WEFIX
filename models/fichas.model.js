import db from '../database/connection.js';

export async function buscarTodasFichas(){
    const sql = "SELECT * FROM fichas ORDER BY status";
    const consulta = await db.query(sql);

    return consulta.rows;
}

export async function buscarFichaPorStatus(status){
    const sql = "SELECT * FROM fichas WHERE status = $1 ORDER BY id_manutencao DESC";
    const consulta = await db.query(sql, [status]);

    return consulta.rows;
}

export async function criaNovaFicha(nome_cliente, valor_servico, numero_cliente, observacao){
    const sql = "INSERT INTO fichas(nome_cliente, valor_servico, numero_cliente, observacao) VALUES ($1, $2, $3, $4)";
    const valores = [nome_cliente, valor_servico, numero_cliente, observacao];

    return db.query(sql, valores)

}

export async function alteraStatusFicha(status, id_manutencao){
    const sql = "UPDATE fichas SET status = $1 WHERE id_manutencao = $2";
    const valores = [status, id_manutencao];
    return db.query(sql, valores);
}

export async function deletaFicha(id_manutencao){
    const sql = "DELETE FROM fichas WHERE id_manutencao = $1";
    return db.query(sql,[id_manutencao]);
}

/* Caso seja necessario validar a existencia de uma ficha
export async function verificaFicha(id_manutencao){
    const sql = "SELECT id_manutencao FROM fichas WHERE id_manutencao = $1";
    return db.query(sql, [id_manutencao]);
}
*/

export async function alteraValorFicha(id_manutencao, valor_servico){

    const sql = "UPDATE fichas SET valor_servico = $1 WHERE id_manutencao = $2";

    const valores = [valor_servico, id_manutencao];

    return db.query(sql, valores);

}

export async function alteraNomeFicha(id_manutencao, nome_cliente){

    const sql = "UPDATE fichas SET nome_cliente = $1 WHERE id_manutencao = $2";

    const valores = [nome_cliente, id_manutencao];

    return db.query(sql, valores);

}

export async function alteraNumeroFicha(id_manutencao, numero_cliente){

    const sql = "UPDATE fichas SET numero_cliente = $1 WHERE id_manutencao = $2";

    const valores = [numero_cliente, id_manutencao];

    return db.query(sql, valores);

}

export async function alteraObservacao(id_manutencao, observacao){

    const sql = "UPDATE fichas SET observacao = $1 WHERE id_manutencao = $2";

    const valores = [observacao, id_manutencao];

    return db.query(sql, valores);

}