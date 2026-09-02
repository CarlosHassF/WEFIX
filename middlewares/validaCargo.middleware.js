export function validaCargo(cargos){
    return function(req, res, next){
        if(!req.usuario){
            return res.status(400).send({erro: "Token invalido ou expirado"})
        }
        if(!cargos.includes(req.usuario.cargo)){
            return res.status(401).send({erro:"Ação não permitida"})
        }

        next();
    };
}