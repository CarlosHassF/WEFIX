import * as usuariosModel from "../models/usuarios.model.js";
import bycrypt from 'bcrypt';

export async function buscarTodosUsuarios(req, res) {

    try{
        const resultado = await usuariosModel.buscarTodosUsuariosModel();
        res.status(200).send(resultado);
    }catch(e){
        console.log(e);
        res.status(500).send({erro:"ocorreu um erro inesperado.."});
    }
    
}

export async function criaUsuario(req, res){
    try{
        const {nome_usuario, email_usuario, senha, cargo_usuario} = req.body;

        const senha_usuario = await bycrypt.hash(senha, 10);

        const dados = {nome_usuario, email_usuario, senha_usuario, cargo_usuario};

        await usuariosModel.criaUsuario(dados);
        res.status(201).send("usuario criado com sucesso");

    }catch(e){
        console.log(e);
        res.status(500).send({erro:"ocorreu um erro inesperado.."});
    }
    

}

export async function editaUsuario(req, res){
    try{
        const id_usuario = req.params.id_usuario;
        if(!id_usuario){
            res.status(400).send("Dados obrigatorios faltando");
        }
        const {nome_usuario, email_usuario, senha, cargo_usuario} = req.body;

        const senha_usuario = await bycrypt.hash(senha, 10);

        const dados = {nome_usuario, email_usuario, senha_usuario, cargo_usuario};

        await usuariosModel.editaUsuario(BigInt(id_usuario,10),dados);
        res.status(201).send("usuario editado com sucesso");

    }catch(e){
        console.log(e);
        res.status(500).send({erro:"ocorreu um erro inesperado.."});
    }
    
}

export async function deletaUsuario(req,res){
    try {
        const id_usuario = req.params.id_usuario;

        if(!id_usuario){
            res.status(400).send("Dados obrigatorios faltando");
        }

        await usuariosModel.deletaUsuario(id_usuario);
        res.status(204).send();

    } catch (e) {
        console.log(e);
        res.status(500).send({erro:"ocorreu um erro inesperado.."});
    }
}