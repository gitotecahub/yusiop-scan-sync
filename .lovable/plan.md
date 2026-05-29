# Playlists & Recomendaciones — YUSIOP

Feature grande dividida en 4 entregables. Manteniendo identidad visual Vapor Chrome (sin naranja), modo oscuro, carruseles y tarjetas existentes (`SongCarousel`, `chip-vapor`, `vapor-text`).

## 1. Base de datos (1 migración)

Nuevas tablas en `public` con GRANTs explícitos + RLS:

- **playlists** — `id, user_id, title, description, cover_url, is_public, share_token, created_at, updated_at`
  - RLS: dueño full CRUD; lectura pública si `is_public=true` o por `share_token`
- **playlist_tracks** — `id, playlist_id, song_id, position, added_at`
  - RLS: dueño de la playlist gestiona; lectura visible si la playlist es visible para el usuario
  - Validación: trigger que verifica que `song_id` esté en `user_downloads` del dueño al insertar
- **user_favorites** — `user_id, song_id, created_at` (PK compuesta)
- **user_listening_history** — `id, user_id, song_id, played_at, duration_ms, completed`
- **user_artist_follows** — `user_id, artist_id, created_at` (PK compuesta)
- **recommendation_events** — `id, user_id, song_id, source, score, shown_at, clicked_at` (telemetría señales)

Todas con: `GRANT SELECT,INSERT,UPDATE,DELETE ... TO authenticated`, `GRANT ALL ... TO service_role`, RLS scoped a `auth.uid()`. Sin grant `anon` salvo lectura de playlists públicas.

## 2. UI — Playlists en "Mi Biblioteca"

- Nuevo tab/sección **"Playlists"** en `src/pages/Library.tsx`
- Grid de tarjetas (portada gradient auto generada con los 4 primeros covers si no hay custom)
- `PlaylistDetail.tsx` nueva ruta `/library/playlist/:id` con:
  - cabecera (portada, título, descripción, contador, botón compartir)
  - lista reordenable (drag con `@dnd-kit` ya o nativo `pointermove`)
  - botón "Añadir canciones" → modal que lista SOLO canciones de `user_downloads`
  - quitar canción (no borra de biblioteca)
- `CreatePlaylistDialog.tsx` (título, descripción, público/privado, cover opcional via upload o auto)
- Editar / eliminar desde menú `⋯`

## 3. Compartir playlists

- Botón "Compartir" → copia link `https://app/p/:share_token`
- Ruta pública `/p/:token` (sin login requerido para ver, login para reproducir)
- Lógica de reproducción:
  - Si la canción está en `user_downloads` del visitante → reproducción completa
  - Si no → preview 20s (cortar en `AudioPlayer` cuando `currentTime >= 20` y no posee la canción)
  - CTA "Desbloquear" → redirige a `/store` o abre `RedeemCodeDialog`

## 4. Recomendaciones — "Para ti"

Nueva sección en `Index.tsx` ("Recomendado para ti") y varios carruseles:

- "Porque escuchaste {última canción}"
- "Más canciones de este estilo" (mismo género)
- "Artistas que podrían gustarte" (artistas con géneros solapados a los seguidos)
- "Tendencias en tu país" (top por `country_code`)
- "Nuevos lanzamientos para ti" (recientes filtrados por géneros del user)
- "Populares entre usuarios similares" (collaborative: usuarios que descargaron lo mismo)

Implementación: **hook `useRecommendations`** que ejecuta queries paralelas a Supabase (sin edge function en v1 — todo client-side con `select`s). Tracking en `recommendation_events` al mostrar/clickar.

Si la query collaborative es pesada, la movemos a una RPC `get_recommendations(user_id)` SQL en una iteración posterior.

## 5. Privacidad

- Todas las queries de "similares" usan IDs agregados, nunca exponen perfiles ajenos
- RLS estricto en `user_listening_history`, `user_favorites`, `user_artist_follows` (solo dueño lee)
- `recommendation_events` solo lectura/escritura del dueño

## 6. Detalles técnicos

- Géneros: usamos `songs` actuales — si no tienen columna `genre`, añadimos `genre text` (nullable) en la misma migración
- Cover auto: componente que renderiza grid 2x2 de covers con gradient vapor encima
- Preview 20s: prop `previewOnly: boolean` en `playerStore` → el reproductor pausa a los 20s y muestra CTA
- Tracking historial: hook `useTrackListen` que escribe en `user_listening_history` cuando una canción se reproduce >5s

## Orden de implementación

1. Migración DB (tablas + RLS + GRANTs + trigger validación + columna `genre` en songs si falta)
2. Playlists CRUD UI en Library
3. Detalle de playlist + drag-to-reorder + añadir/quitar canciones
4. Compartir + ruta pública + preview 20s
5. Tracking (favoritos, follows, historial)
6. Sección "Para ti" + carruseles de recomendación
7. Telemetría `recommendation_events`

¿Quieres que arranque por la migración + Playlists (pasos 1-3) en este turno, y dejemos compartir y recomendaciones para iteraciones siguientes? Es bastante código y prefiero entregarlo en bloques verificables.
