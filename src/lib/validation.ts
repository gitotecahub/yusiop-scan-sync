import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Email inválido")
  .max(255, "El email es demasiado largo");

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "El usuario debe tener al menos 3 caracteres")
  .max(50, "El usuario es demasiado largo")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Solo se permiten letras, números, guion y guion bajo",
  );

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre completo es obligatorio")
  .max(100, "El nombre completo es demasiado largo");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria").max(72),
});

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  fullName: fullNameSchema,
  role: z.enum(["user", "admin"]),
  downloads: z.number().int().min(0).max(1000),
});

export const qrCodeSchema = z
  .string()
  .trim()
  .min(1, "El código no puede estar vacío")
  .max(255, "El código es demasiado largo");

export const songTitleSchema = z
  .string()
  .trim()
  .min(1, "El título es obligatorio")
  .max(200, "El título es demasiado largo");

export const artistNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre del artista es obligatorio")
  .max(150, "El nombre del artista es demasiado largo");

export const urlSchema = z
  .string()
  .trim()
  .url("URL inválida")
  .max(2048, "La URL es demasiado larga")
  .optional()
  .or(z.literal(""));
