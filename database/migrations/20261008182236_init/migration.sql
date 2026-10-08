-- CreateEnum
CREATE TYPE "Tipos" AS ENUM ('novo', 'em_manutencao', 'entregue', 'cancelado', 'concertado');

-- CreateEnum
CREATE TYPE "Cargos" AS ENUM ('atendente', 'admin', 'tecnico');

-- CreateTable
CREATE TABLE "Fichas" (
    "id_manutencao" BIGSERIAL NOT NULL,
    "nome_cliente" VARCHAR(50),
    "valor_servico" DECIMAL(10,2) DEFAULT 50.0,
    "numero_cliente" VARCHAR(16),
    "observacao" VARCHAR(400),
    "status" "Tipos" NOT NULL DEFAULT 'novo',

    CONSTRAINT "Fichas_pkey" PRIMARY KEY ("id_manutencao")
);

-- CreateTable
CREATE TABLE "Usuarios" (
    "id_usuario" BIGSERIAL NOT NULL,
    "nome_usuario" VARCHAR(100) NOT NULL,
    "email_usuario" VARCHAR(100) NOT NULL,
    "senha_usuario" VARCHAR(255) NOT NULL,
    "cargo_usuario" "Cargos" NOT NULL,

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_email_usuario_key" ON "Usuarios"("email_usuario");
