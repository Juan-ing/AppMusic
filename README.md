# AppMusic

Aplicación web de descubrimiento musical y comunidad. Incluye catálogo, perfiles de artista, biblioteca personal, playlists colaborativas, chat, reproductor, eventos y tienda. La interfaz usa modo oscuro y componentes standalone de Angular.

> El workspace existente utiliza Angular 21.2, Firebase 11 y TypeScript 5.9. Se conserva esa configuración en lugar de migrar la base del proyecto.

## Integrantes

- Juan Diego Navas
- Juan Jose Velasco

## Arquitectura

- `src/app/app.routes.ts`: rutas lazy-loaded, guards de autenticación y páginas públicas/privadas.
- `src/app/features/`: páginas independientes para landing, autenticación, dashboard, biblioteca, playlists, chat, tienda, eventos, perfiles y artista.
- `src/app/core/services/`: servicios por dominio para autenticación, catálogo, audio, biblioteca, playlists, chat, perfil, almacenamiento y tienda.
- `src/app/models/music.model.ts`: contratos TypeScript compartidos.
- `src/app/structures/`: estructuras de datos utilizadas por los servicios.
- `src/app/shared/components/`: navegación móvil, reproductor y selector reutilizable de playlists.

Las rutas del dashboard requieren una sesión Firebase y un perfil leído o creado en `users/{uid}`. Un fallo de Firestore bloquea la entrada al dashboard y se muestra en el login; no se sustituye por una sesión de prueba. Las páginas de autenticación usan un guard de invitado y el artista, la landing y la página 404 son públicas.

## Firebase

La inicialización reutiliza los valores existentes en `src/app/firebase/config.ts` y permite sobrescribirlos con `.env` basado en `.env.example`. Antes de desplegar, revisa la configuración del proyecto Firebase, habilita Email/Password y Google Authentication cuando corresponda, y establece reglas de seguridad para Firestore, Realtime Database y Storage. No publiques credenciales de servidor ni claves privadas.

### Configuración necesaria para login y registro

En Firebase Console, habilita **Authentication → Sign-in method → Email/Password**. El perfil se guarda en **Firestore**, no en Realtime Database. En **Firestore Database → Rules**, agrega este bloque dentro de `match /databases/{database}/documents` (sin reemplazar las reglas de las demás colecciones):

```text
match /users/{uid} {
  allow read, create, update: if request.auth != null && request.auth.uid == uid;
  match /{userData}/{documentId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
}
```

Publica las reglas en Firebase Console. Si el usuario aparece en Authentication pero el registro no redirige, normalmente se creó la cuenta pero las reglas no permitieron guardar `users/{uid}`. El formulario ahora informa ese caso y deja de esperar tras 12 segundos si Authentication o Firestore no responden.

Para permitir crear y editar playlists, agrega también este bloque al mismo `match /databases/{database}/documents`. Permite consultar playlists públicas y que solo su propietario o colaboradores las actualicen:

```text
match /playlists/{playlistId} {
  function signedIn() {
    return request.auth != null;
  }
  function ownerOrCollaborator() {
    return signedIn() && (
      resource.data.ownerId == request.auth.uid ||
      request.auth.uid in resource.data.get('collaboratorIds', [])
    );
  }

  allow read: if signedIn() && (
    resource.data.get('isPublic', false) == true ||
    ownerOrCollaborator()
  );
  allow create: if signedIn()
    && request.resource.data.ownerId == request.auth.uid
    && request.resource.data.songIds is list
    && request.resource.data.collaboratorIds is list;
  allow update: if ownerOrCollaborator()
    && request.resource.data.ownerId == resource.data.ownerId
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
      'name', 'description', 'isPublic', 'songIds',
      'collaboratorIds', 'isCollaborative', 'updatedAt'
    ]);
  allow delete: if signedIn() && resource.data.ownerId == request.auth.uid;
}
```

Publica de nuevo las reglas después de agregar ambos bloques. Sin la regla de `playlists`, Firestore bloquea `addSong` aunque el usuario haya iniciado sesión; la interfaz ahora muestra un mensaje indicando que es un problema de permisos.

### Colecciones de Firestore

| Ruta | Uso |
| --- | --- |
| `users/{uid}` | Perfil: `uid`, `name`, `username`, `email`, `photoURL`, `createdAt`. |
| `users/{uid}/favorites/{songId}` | Canciones guardadas como favoritas. |
| `users/{uid}/history/{entryId}` | Reproducciones recientes (`songId`, `playedAt`). |
| `users/{uid}/savedAlbums/{albumId}` | Álbumes guardados. |
| `songs/{songId}` | Canciones con `title`, `artistId`, `artist`, `albumId`, `album`, `genre`, `duration`, `audioUrl` y `coverUrl`. |
| `albums/{albumId}` | Álbumes, artista, género, portada, fecha y `songIds`. |
| `artists/{artistId}` | Biografía, foto, géneros, discografía, eventos y `relatedArtistIds`. |
| `events/{eventId}` | Conciertos, venue, ciudad, fecha y coordenadas `latitude`/`longitude`. |
| `playlists/{playlistId}` | `name`, `description`, `ownerId`, `collaboratorIds`, `songIds`, `isCollaborative`, `isPublic` y `updatedAt`. |
| `chatRooms/{roomId}/messages/{messageId}` | Mensajes de chat ordenados por `createdAt`; la sala pública de la aplicación usa el ID `lobby`. |
| `products/{productId}` | Productos con nombre, descripción, categoría, precio, imagen y stock. |

El catálogo y sus imágenes se leen desde Firestore. El chat y las playlists usan listeners `onSnapshot` para actualizar la interfaz en tiempo real. Las fotos de usuario usan `users/{uid}/profile` en Storage; las imágenes de artistas y productos usan los servicios de carga bajo `artists/` y `products/`. La compra es una simulación local y no procesa pagos.

Cuando una colección de Firestore está vacía o no hay conexión, la interfaz muestra un catálogo local claramente identificado como demostración: 25 canciones en cinco géneros, artistas y álbumes derivados, tres eventos y 10 productos. El catálogo de demostración no se escribe en Firebase; las colecciones con datos reales tienen prioridad. Las canciones demo no incluyen audio con licencia: agrega una URL de streaming en `audioUrl` para habilitar su reproducción. Las reglas de Firebase deben permitir solo las operaciones autorizadas y restringir escrituras administrativas.

## Estructuras de datos

- **Queue** (`structures/queue.ts`): cola FIFO genérica con `enqueue`, `dequeue`, `peek`, `size` y `shuffle`; el reproductor la usa para gestionar canciones siguientes.
- **Stack** (`structures/stack.ts`): historial LIFO con `push`, `pop`, `undo` y `redo`; las playlists lo usan para deshacer y rehacer cambios de orden.
- **MusicCatalogTree** (`structures/tree.ts`): jerarquía Género → Artista → Álbum → Canción, con búsqueda de canciones.
- **Trie** (`structures/trie.ts`): índice normalizado de nombres y géneros, con `insert`, `search`, `startsWith` y `autocomplete`.
- **Graph** (`structures/graph.ts`): nodos de artista y conexiones bidireccionales para recomendar artistas relacionados.

Las canciones marcadas con Me gusta se guardan por usuario en Firestore. El dashboard usa los artistas relacionados en el grafo para recomendar canciones de artistas conectados a los favoritos. Desde las filas de canciones también se puede agregar la pista a una playlist existente o crear una nueva en Firebase.

## Requisitos e instalación

- Node.js compatible con Angular CLI 21.
- npm.
- Un proyecto Firebase con Authentication, Firestore y Storage habilitados.

```bash
npm install
npm start
```

La aplicación se sirve con Angular CLI. Para generar una compilación de producción:

```bash
npm run build
```

El script `scripts/generate-env.mjs` genera `src/assets/env.js` desde las variables `NG_APP_FIREBASE_*` del archivo `.env`; `src/assets/` debe existir para que el script pueda escribir el archivo. `src/assets/env.js` está ignorado por Git.

## Git Flow

1. Mantener `main` para versiones listas para publicar y `develop` para integrar trabajo.
2. Crear ramas `feature/<nombre>` o `fix/<nombre>` desde `develop`.
3. Ejecutar `npm run build` antes de abrir un Pull Request hacia `develop`.
4. Integrar una versión estable de `develop` a `main` mediante Pull Request y etiquetar el release.
5. Resolver conflictos en la rama de trabajo y no incluir `.env`, `node_modules/`, `.angular/` ni `dist/` en commits.
