import * as fichasModel from "../models/fichas.model.js";

export async function listarTodasFichas(req, res){
    try{
        const resultado = await fichasModel.buscarTodasFichas();
        res.status(200).send(resultado);
    }catch(e){
        console.log(e);
        res.status(500).send({erro:"ocorreu um erro inesperado.."});
    }
}

export async function listarFichasStatus(req, res){
    try{
        const {status} = req.params;
        const resultado = await fichasModel.buscarFichaPorStatus(status);
        res.status(200).send(resultado);
    }catch(e){
        console.log(e);
        res.status(500).send({erro:"ocorreu um erro inesperado.."});
    }
}

export async function criaFicha(req, res){
    try{

        const {id_manutencao,nome_cliente, valor_servico, numero_cliente, observacao} = req.body;

        if(!nome_cliente || !valor_servico || !numero_cliente){
            return res.status(400).send("Dados obrigatorios faltando!");
        }
        await fichasModel.criaNovaFicha(id_manutencao,nome_cliente, valor_servico, numero_cliente, observacao);
        res.status(201).send("Ficha criada com sucesso numero da ficha é #" + id_manutencao);
    }catch(e){
        console.log(e);
        res.status(500).send("Algo deu errado..");
    }
}

export async function alteraStatus(req, res){
    try{
        const {id_manutencao, status} = req.body;

        if(!id_manutencao){
            return res.status(400).send("Dados obrigatorios faltando!");
        }
        await fichasModel.alteraStatusFicha(status, id_manutencao);
        res.status(200).send("Ficha alterada com sucesso");

    }catch(e){
        console.log(e);
        res.status(500).send("Algo deu errado");
    }
}