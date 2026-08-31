import { stat } from 'fs/promises';
import prisma from '../database/connection.js';

export async function buscarTodasFichas(){
    return prisma.fichas.findMany();
}

export async function buscarFichaPorStatus(status){
    return prisma.fichas.findMany
    ({
        where: {status},
        orderBy: {id_manutencao:'desc'}
    });
}

export async function criaNovaFicha(dados){

    return prisma.fichas.create({
        data: dados
    })
}

export async function alteraStatusFicha(status, id_manutencao){
    return prisma.fichas.update({
        where:{id_manutencao},
        data:{status}
    })
}

export async function deletaFicha(id_manutencao){
    return prisma.fichas.delete({
        where:{id_manutencao}
    })
}
export async function alteraFichaModel(id_manutencao,dados){

    return prisma.fichas.update({
        data:dados,
        where:{id_manutencao}
    })


}