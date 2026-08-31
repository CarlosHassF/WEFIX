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

        const {nome_cliente, valor_servico, numero_cliente, observacao} = req.body;

        if(!nome_cliente || !valor_servico || !numero_cliente){
            return res.status(400).send("Dados obrigatorios faltando!");
        }
        await fichasModel.criaNovaFicha(nome_cliente, valor_servico, numero_cliente, observacao);
        res.status(201).send("Ficha criada com sucesso");
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

export async function deletaFicha(req, res){
    try{
        const {id_manutencao} = req.params;
        await fichasModel.deletaFicha(id_manutencao);
        res.status(200).send("Ficha deletada com sucesso");
    }catch(e){
        console.log(e);
        res.status(500).send("algo deu errado");
    }
}

export async function alteraFicha(req, res){
    try{
        const {id_manutencao,nome_cliente, valor_servico, numero_cliente, observacao} = req.body;

        if(!id_manutencao){
            return res.status(400).send("Ficha não encontrada");
        }

        if(nome_cliente){
            await fichasModel.alteraNomeFicha(id_manutencao,nome_cliente);
        }

        if(valor_servico){
            await fichasModel.alteraValorFicha(id_manutencao, valor_servico);
        }

        if(numero_cliente){
            await fichasModel.alteraNumeroFicha(id_manutencao, numero_cliente);
        }

        if(observacao){
            await fichasModel.alteraObservacao(id_manutencao, observacao);
        }
        return res.status(200).send("Ficha alterada com sucesso");
    }catch(e){
        console.log(e);
        res.status(500).send("algo deu errado");
    }
}

