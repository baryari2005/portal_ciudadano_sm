ALTER TABLE "PublicoObjetivo"
ADD COLUMN "generosAdmitidos" "Genero"[] NOT NULL DEFAULT ARRAY[]::"Genero"[];
