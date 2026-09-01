import { stat } from 'fs/promises';
import prisma from '../database/connection.js';


export async function buscarTodosUsuariosModel(){
    return prisma.usuarios.findMany();
}

export async function criaUsuario(dados){
    return prisma.usuarios.create({
        data: dados
    })
}
export async function editaUsuario(id_usuario, dados){
    return prisma.usuarios.update({
        data: dados,
        where: {id_usuario}
    })
}

export async function deletaUsuario(id_usuario){
    return prisma.usuarios.delete({
        where:{id_usuario}
    })
}