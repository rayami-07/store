# Servidor de mensajes del CRM (WhatsApp, Messenger/Marketplace, Instagram)

## Qué hace
- `metaWebhook`: Meta le avisa cada mensaje nuevo. Lo guarda en el CRM del negocio dueño del canal
  (`<base>/chats`, `<base>/mensajes`) y, si es un contacto nuevo, crea el prospecto con su origen.
- `enviarMensaje`: el CRM lo llama desde la pestaña **Chats** para contestar (solo dentro de las 24 h
  desde el último mensaje del cliente, regla de Meta).
- Los canales se conectan desde el CRM: **Más → Negocios → Canales** (o "Canales de mi CRM").
  Se guardan en `channels/` y el token en `secrets/` (nadie lo puede leer desde el navegador).

## Para encenderlo (una sola vez)
1. Firebase: pasar el proyecto `rayami-store` al plan **Blaze** y poner alerta de presupuesto.
2. Meta (developers.facebook.com): crear la app, agregar **WhatsApp** (y **Messenger** / **Instagram**).
   - Política de privacidad: https://rayami-07.github.io/store/privacidad/
   - Eliminar datos: https://rayami-07.github.io/store/privacidad/#eliminar
3. Subir el servidor (opción A o B):
   - **A. GitHub Actions:** crear los secretos `FIREBASE_SERVICE_ACCOUNT`, `META_APP_SECRET`,
     `META_VERIFY_TOKEN` y correr **Actions → Encender servidor de mensajes**.
   - **B. Desde una compu:** `npm i -g firebase-tools`, `firebase login`,
     `firebase functions:secrets:set META_APP_SECRET`, `firebase functions:secrets:set META_VERIFY_TOKEN`,
     `cd functions && npm ci && cd .. && firebase deploy --only functions,database`.
4. En Meta → WhatsApp/Messenger/Instagram → **Webhook**:
   - URL: `https://us-central1-rayami-store.cloudfunctions.net/metaWebhook`
   - Token de verificación: el mismo `META_VERIFY_TOKEN`.
   - Suscribirse a: WhatsApp `messages`; Página `messages`; Instagram `messages`.
5. En el CRM, conectar el canal con su ID y token.

## Pruebas
`cd functions && npm test` (mensajes simulados de los 3 canales, sin internet).
