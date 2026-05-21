# Plan: Verificación de artistas y reclamaciones seguras en YUSIOP

Este es un sistema grande que toca base de datos, panel admin, panel artista y notificaciones. Lo divido en fases para que sea manejable. Confirma si quieres todas las fases o empezamos por las críticas (1, 2, 3 y 5).

## Fase 1 — Identidad del artista (BD + UI)

**Base de datos:**
- Nueva tabla `artist_profiles` (1 fila por artista), vinculada a `auth.users`:
  - `artist_code` (texto único, formato `YUS-ART-000001`, generado por secuencia + trigger, no editable)
  - `artist_username` (texto único, citext)
  - `legal_name`, `stage_name`, `country`, `phone`, `phone_verified`, `email_verified`
  - `verification_status` enum: `unverified | basic_verified | artist_verified | under_review | rejected | suspended`
  - `verified_at`, `verified_by`, `rejection_reason`, `risk_score`
- Trigger que bloquea cambios a `artist_code` y a `artist_username` cuando `verification_status = artist_verified` (solo admin puede modificarlos).
- RLS: el artista lee/edita su fila (campos no bloqueados); admin ve y edita todo.

**UI:**
- En `ArtistDashboard`: tarjeta con el `artist_code` visible y badge de estado de verificación.

## Fase 2 — Verificación documental (artist_verified)

**Base de datos:**
- Tabla `artist_verification_requests`:
  - `artist_profile_id`, `id_document_url`, `selfie_url`, `official_links` (jsonb array), `country`, `stage_name`, `legal_name`, `phone`, `email`
  - `status` (pending/under_review/approved/rejected), `admin_note`, `reviewed_by`, `reviewed_at`
- Bucket privado `artist-verification` con RLS por carpeta `{user_id}/...`.

**UI artista:**
- Página `/artist/verification` con formulario (subida de DNI, selfie, links oficiales, datos).
- Envío → status pasa a `under_review`.

**Verificación básica automática:**
- Si `email_verified` (auth) y `phone_verified` → trigger sube a `basic_verified`. Estructura `phone_otp` queda preparada (tabla `phone_otp_codes` con expiración) pero el flujo OTP se deja inactivo si aún no hay proveedor SMS.

## Fase 3 — Reclamaciones de colaboración (rehacer las existentes)

**Base de datos:**
- Nueva tabla `collaboration_claims_v2` (no rompemos la actual; migramos después):
  - `claimant_user_id`, `claimant_artist_code`, `claimant_stage_name`
  - `song_id`, `participation_type` enum (`singer | composer | producer | beatmaker | featuring | label | other`)
  - `claimed_percent`, `proof_links` jsonb, `document_url`, `comment`
  - `status` enum: `pending | under_review | approved | rejected | disputed | blocked`
  - `admin_note`, `reviewed_by`, `reviewed_at`, `rejection_reason`
  - `risk_flags` jsonb, `ip_address`
- RLS: el reclamante ve solo las suyas; admin ve todas.

**UI artista:**
- Página `/artist/claim-collab` con formulario completo.
- Lista “Mis reclamaciones” con estado en vivo.

**Aprobación automática (función SQL `try_auto_approve_claim`):**
Aprueba solo si: `artist_verified` + `artist_code` coincide + email y teléfono verificados + ≥1 link oficial + sin riesgo + sin conflicto. Si no, pasa a `under_review`.

## Fase 4 — Retención de ganancias

- Función `is_claim_locked(artist_id, song_id)` → bloquea retiros cuando hay reclamación `pending/under_review/disputed`.
- En `ArtistWallet` y `WithdrawalRequestDialog`: si hay reclamaciones abiertas asociadas, mostrar “Ganancias retenidas hasta completar verificación” y bloquear el botón.
- En `artist_earnings`: nuevo flag `is_held` actualizado por trigger según estado de reclamaciones.

## Fase 5 — Panel admin “Verificación y reclamaciones”

Nueva entrada en `AdminSidebar` → `/admin/verifications` con dos pestañas:
- **Artistas pendientes**: lista de `artist_verification_requests`, ver documentos/links, aprobar/rechazar, cambiar estado, nota interna.
- **Reclamaciones**: lista de `collaboration_claims_v2`, aprobar/rechazar/bloquear/marcar disputado, bloquear ganancias, nota interna.

## Fase 6 — Antifraude

Función `compute_claim_risk_score(claim)` que evalúa:
- N reclamaciones del usuario en últimos 7 días
- Artista famoso (top N descargas) sin historial del reclamante
- Cambios recientes de `stage_name`
- Datos incompletos / email no verificado
- Conflictos con otras reclamaciones de la misma canción/porcentaje

Si score ≥ umbral → `status = under_review` + `risk_flags` + notificación a admin.

## Fase 7 — Logs y notificaciones

- Tabla `claim_audit_log` (claim_id, action, actor_id, before, after, ip, created_at) escrita por triggers.
- Notificaciones in-app (tabla `notifications` ya existe) + email (función `send-transactional-email` ya existe) en: enviada, en revisión, aprobada, rechazada, info adicional, ganancias desbloqueadas. Nuevas plantillas en `_shared/transactional-email-templates/`.

## Detalles técnicos clave

- Enums nuevos: `artist_verification_status`, `participation_type`, `claim_status_v2`.
- Secuencia `artist_code_seq` + función `format('YUS-ART-%06s', nextval(...))`.
- Todas las tablas con RLS estricto usando `is_admin(auth.uid())` (helper ya existe) y `auth.uid() = user_id`.
- Storage bucket privado para documentos sensibles.
- No se modifica el flujo actual de `collaboration_claims` hasta que el nuevo esté en producción; luego migramos datos.

## Lo que NO hace este sistema (según pediste)

- No requiere confirmación del artista principal.
- Decisión final = ID único + documentos + links + admin + antifraude + retención.

---

**Pregunta:** ¿Empiezo por las **Fases 1, 2, 3, 4 y 5** (núcleo funcional) y dejamos 6 y 7 (antifraude avanzado + emails) para una segunda iteración, o lo hago todo de una vez?
