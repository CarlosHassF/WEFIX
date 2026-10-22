-- CreateEnum
CREATE TYPE "TipoDispositivo" AS ENUM ('notebook', 'desktop', 'celular', 'tablet', 'impressora', 'outro');

-- CreateEnum
CREATE TYPE "OrigemEvento" AS ENUM ('usuario', 'n8n');

-- CreateEnum
CREATE TYPE "StatusFicha" AS ENUM ('aberta', 'em_analise', 'em_espera', 'em_manutencao', 'em_aprovacao', 'consertado', 'cancelado');

-- CreateEnum
CREATE TYPE "Cargos" AS ENUM ('atendente', 'admin', 'tecnico');

-- CreateTable
CREATE TABLE "Cliente" (
    "id_cliente" BIGSERIAL NOT NULL,
    "nome_cliente" VARCHAR(100) NOT NULL,
    "whatsapp_cliente" VARCHAR(13) NOT NULL,
    "email_cliente" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "Dispositivo" (
    "id_dispositivo" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "tipo" "TipoDispositivo" NOT NULL,
    "marca" VARCHAR(50) NOT NULL,
    "modelo" VARCHAR(100) NOT NULL,
    "numero_serie" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispositivo_pkey" PRIMARY KEY ("id_dispositivo")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id_evento" BIGSERIAL NOT NULL,
    "id_manutencao" BIGINT NOT NULL,
    "status" "StatusFicha" NOT NULL,
    "origem" "OrigemEvento" NOT NULL,
    "id_usuario" BIGINT,
    "observacao" VARCHAR(400),
    "entrou_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saiu_em" TIMESTAMPTZ(6),
    "prazo_limite" TIMESTAMPTZ(6),
    "expirado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id_evento")
);

-- CreateTable
CREATE TABLE "Ficha" (
    "id_manutencao" BIGSERIAL NOT NULL,
    "id_cliente" BIGINT NOT NULL,
    "id_dispositivo" BIGINT NOT NULL,
    "id_atendente" BIGINT NOT NULL,
    "id_tecnico" BIGINT,
    "defeito_relatado" VARCHAR(400) NOT NULL,
    "acessorios" VARCHAR(200),
    "estado_entrada" VARCHAR(400),
    "senha_dispositivo" VARCHAR(100),
    "diagnostico" VARCHAR(1000),
    "valor_servico" DECIMAL(10,2),
    "observacao" VARCHAR(400),
    "status" "StatusFicha" NOT NULL DEFAULT 'aberta',
    "finalizada_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ficha_pkey" PRIMARY KEY ("id_manutencao")
);

-- CreateTable
CREATE TABLE "PrazoStatus" (
    "status" "StatusFicha" NOT NULL,
    "prazo_horas" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrazoStatus_pkey" PRIMARY KEY ("status")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" BIGSERIAL NOT NULL,
    "nome_usuario" VARCHAR(100) NOT NULL,
    "email_usuario" VARCHAR(100) NOT NULL,
    "senha_usuario" VARCHAR(255) NOT NULL,
    "cargo_usuario" "Cargos" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_whatsapp_cliente_key" ON "Cliente"("whatsapp_cliente");

-- CreateIndex
CREATE INDEX "Dispositivo_numero_serie_idx" ON "Dispositivo"("numero_serie");

-- CreateIndex
CREATE INDEX "Evento_id_manutencao_entrou_em_idx" ON "Evento"("id_manutencao", "entrou_em");

-- CreateIndex
CREATE INDEX "Evento_status_entrou_em_idx" ON "Evento"("status", "entrou_em");

-- CreateIndex
CREATE INDEX "Ficha_status_idx" ON "Ficha"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_usuario_key" ON "Usuario"("email_usuario");

-- AddForeignKey
ALTER TABLE "Dispositivo" ADD CONSTRAINT "Dispositivo_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "Cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_id_manutencao_fkey" FOREIGN KEY ("id_manutencao") REFERENCES "Ficha"("id_manutencao") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "Cliente"("id_cliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_id_dispositivo_fkey" FOREIGN KEY ("id_dispositivo") REFERENCES "Dispositivo"("id_dispositivo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_id_atendente_fkey" FOREIGN KEY ("id_atendente") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_id_tecnico_fkey" FOREIGN KEY ("id_tecnico") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
