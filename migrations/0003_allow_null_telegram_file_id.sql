-- Migration pour permettre NULL sur telegram_file_id
-- Le nouveau workflow upload le PDF plus tard (POST /notify) au lieu de lors de l'enregistrement (POST /parution)
ALTER TABLE "parutions" ALTER COLUMN "telegram_file_id" DROP NOT NULL;
