import { z } from "zod";

// Inputs numéricos HTML sempre mandam string (inclusive "" quando vazios) pro
// react-hook-form. z.coerce.number() sozinho transforma "" em 0, o que quebra
// .positive() num campo opcional deixado em branco — normaliza "" para
// undefined antes de coagir, então .optional() funciona de verdade.
export function optionalPositiveNumber(message = "Informe um valor válido") {
  return z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    z.coerce.number().positive(message).optional(),
  );
}
