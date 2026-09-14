# GrowthRush — Guía de instalación (Neon.tech + Next.js)

Plataforma SMM completa: panel de superadministrador, panel de revendedor con Landing Studio, tienda/storefront white-label, CRM, blog, emails automáticos, multi-moneda, multi-idioma y multi-tema.

**Stack:** Next.js 16 (Node) + Prisma + **PostgreSQL en Neon.tech**. No es PHP.

---

## Español

### 🖱️ Instalación 100% web (sin terminal) — la más fácil

No necesitas escribir ni un comando: todo se hace desde el navegador.

**1. Base de datos en Neon (copia y pega 2 archivos):**

1. Crea tu cuenta/proyecto en [neon.tech](https://neon.tech) → en el menú lateral entra a **SQL Editor**.
2. Abre en GitHub el archivo **`prisma/postgres-schema.sql`** de este repo → botón **“Copy raw file”** (arriba a la derecha del archivo) → pégalo en el SQL Editor → **Run**. ✔️ Crea las 35 tablas.
3. Igual con **`prisma/seed.postgres.sql`** → copiar → pegar → **Run**. ✔️ Carga el catálogo (172 servicios, 60 categorías), planes, pasarelas, usuarios demo, FAQs, blog, CRM de ejemplo y ajustes.
4. Comprueba en la barra lateral de Neon (*Tables*) que las tablas existen.

**1.b. Si tu base de datos ya existía de una instalación anterior (upgrades):**

Cuando un deploy nuevo espera columnas/tablas que tu base de datos no tiene (síntoma: *"Internal server error"* al importar servicios o crear servicios), tienes dos salidas:

- **Opción fácil (recomendada):** entra a tu panel → **Admin → Settings → Database** → verás lo que falta y un botón **“Repair database”** que lo arregla con un clic (solo añade lo que falta, nunca borra datos).
- **Opción SQL:** abre en GitHub **`prisma/postgres-upgrade.sql`** → *Copy raw file* → pégalo en el SQL Editor de Neon → **Run**. Es 100% inocuo (idempotente): puedes ejecutarlo las veces que quieras y conserva todos tus datos.

**2. Desplegar en Vercel (importar y 2 variables):**

1. Entra en [vercel.com/new](https://vercel.com/new) → **Import** el repositorio.
2. Framework: Next.js (se detecta solo). Abre **Build and Output Settings** → activa **Override** en *Build Command* y pega:

   ```
   npx prisma generate --schema prisma/schema.postgres.prisma && next build
   ```

3. En **Environment Variables** añade:

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | tu connection string **pooled** de Neon (Dashboard → Connect) |
   | `CRON_SECRET` | una cadena larga y aleatoria (ej: `gr_7kd93mfp29xq`) |

4. **Deploy** → en ~2 minutos tu plataforma está online.

**3. Primer acceso:** entra con `admin@growthrush.io` / `admin123` (**¡cambia la contraseña en Cuenta → Seguridad!**). El registro público está abierto (la verificación por email se activa desde Admin → Email y notificaciones).

**4. Cron del motor de pedidos:** en [cron-job.org](https://cron-job.org) (gratis) crea un job cada 1 minuto → `https://tu-app.vercel.app/api/cron/tick?secret=TU_CRON_SECRET`. El endpoint acepta GET y POST (el botón "Test run" de cron-job.org ya no da 405); también valen el header `x-cron-secret` o `Authorization: Bearer`.

> Si prefieres la terminal o un hosting propio (cPanel/VPS), sigue los pasos de abajo.

### Requisitos

| Requisito | Detalle |
|---|---|
| Node.js | **20 o superior** (o Bun 1.x) |
| Base de datos | **PostgreSQL — cuenta gratis en [neon.tech](https://neon.tech)** |
| Hosting | Debe permitir aplicaciones **Node.js** (Vercel, Railway, Render, VPS, cPanel con "Setup Node.js App", Plesk…). La base de datos NO va en tu hosting: vive en Neon. |

### Paso 1 — Crear la base de datos en Neon.tech (gratis)

1. Crea una cuenta en **https://neon.tech** (plan Free suficiente para empezar).
2. Crea un proyecto (p. ej. `growthrush`).
3. En el **Dashboard** pulsa **Connect** → copia la **connection string** (formato
   `postgresql://usuario:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`).
   Usa la variante **pooled** (con `-pooler` en el host): es la recomendada para apps serverless/Node.

### Paso 2 — Subir y descomprimir

Sube el ZIP a tu hosting y descomprímelo (por ejemplo en `~/growthrush`). **No subas la carpeta `node_modules`** — se instala en el paso 4.

> ¿Despliegas en **Vercel**? Sube el proyecto a GitHub e impórtalo en Vercel; luego sigue los pasos 3, 5 y 7 desde el panel (Environment Variables, Build Command y cron). El paso 6 (db push) puedes ejecutarlo desde tu máquina local apuntando al mismo `DATABASE_URL` de Neon.

### Paso 3 — Configurar el entorno

```bash
cp .env.example .env
```

Edita `.env` y pega tu connection string de Neon:

```env
DATABASE_URL="postgresql://usuario:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
CRON_SECRET="una-cadena-larga-y-aleatoria"
```

### Paso 4 — Instalar dependencias

```bash
npm install            # o: bun install
```

### Paso 5 — Crear las tablas en Neon (PostgreSQL)

La app incluye el esquema Prisma para PostgreSQL en `prisma/schema.postgres.prisma`:

```bash
npx prisma db push --schema prisma/schema.postgres.prisma
npx prisma generate --schema prisma/schema.postgres.prisma
```

*(Alternativa sin terminal: importa `prisma/postgres-schema.sql` desde el SQL Editor de Neon o con `psql`. Después ejecuta igualmente `prisma generate`.)*

### Paso 6 — Datos de demostración (opcional pero recomendado)

Crea el catálogo, planes, pasarelas, usuarios demo, plantillas de email, FAQs y posts:

```bash
npx tsx scripts/seed.ts    # o: bun scripts/seed.ts
```

### Paso 7 — Compilar y arrancar

```bash
npm run build
npm run start:node       # Node:  node .next/standalone/server.js
# con Bun: npm run start
```

La app escucha en el puerto **3000** (configurable con `PORT`). En cPanel ("Setup Node.js App") define *Application startup file* → usa `node_modules/next/dist/bin/next` con comando `start`, o ejecuta `npm run start:node` como script de inicio.

> En Vercel: no uses `npm run build` — usa la sección **“Despliegue con GitHub + Vercel”** de abajo (build command con `prisma generate` del esquema PostgreSQL).

### Paso 8 — Cron del motor de pedidos (importante)

Los pedidos avanzan (IN_PROGRESS → COMPLETED, parciales, recargas) mediante un worker por intervalos. Crea un **cron job cada 1 minuto**:

```bash
curl -s -X POST http://127.0.0.1:3000/api/cron/tick -H "x-cron-secret: TU_CRON_SECRET"
```

- **Vercel:** crea `vercel.json` con un cron que llame a `https://tu-dominio/api/cron/tick` con el header `x-cron-secret`.
- **cPanel/VPS:** cron del sistema con el comando de arriba.

### Paso 9 — Servicio realtime (opcional)

Para actualizaciones de pedidos en vivo (WebSocket). El servicio corre en el puerto **3032**:

```bash
cd mini-services/realtime
npm install
node index.ts        # o: bun index.ts
```

> En el preview el navegador lo alcanza a través del gateway incluido (`/?XTransformPort=3032`). En tu hosting puedes exponer el 3032 con un proxy inverso (Nginx/Caddy) o ejecutar la plataforma sin realtime — todo lo demás funciona igual.

---

## Despliegue con GitHub + Vercel (recomendado)

1. **Neon.tech** — crea tu proyecto y copia la connection string **pooled**
   (`postgresql://…-pooler….aws.neon.tech/neondb?sslmode=require`).

2. **Crea las tablas y (opcional) los datos demo** desde tu máquina — solo una vez:

   ```bash
   git clone https://github.com/interfame/testinion.git growthrush && cd growthrush
   cp .env.example .env        # pega tu DATABASE_URL de Neon (variante pooled)
   npm install
   npx prisma db push --schema prisma/schema.postgres.prisma
   npx tsx scripts/seed.ts     # opcional: catálogo, planes, usuarios demo…
   ```

3. **Vercel** — entra en https://vercel.com/new e importa el repo `growthrush`:
   - Framework: **Next.js** (se detecta solo)
   - **Build Command:** `npx prisma generate --schema prisma/schema.postgres.prisma && next build`
   - **Environment Variables** (Settings → Environment Variables):

     | Variable | Valor |
     |---|---|
     | `DATABASE_URL` | connection string **pooled** de Neon |
     | `CRON_SECRET` | una cadena larga y aleatoria |
     | `NEXT_PUBLIC_REALTIME_URL` | *(opcional)* URL pública del servicio realtime (paso 6) |

4. **Deploy** — en ~2 minutos tendrás el panel en `https://tu-proyecto.vercel.app`.

5. **Cron del motor de pedidos** (importante):
   - **Opción gratis (recomendada):** job cada 1 minuto en [cron-job.org](https://cron-job.org) →
     `https://tu-proyecto.vercel.app/api/cron/tick?secret=TU_CRON_SECRET`.
     El endpoint acepta **GET y POST** (el botón "Test run" de cron-job.org ya no da 405) y
     autoriza con el header `x-cron-secret: TU_CRON_SECRET`, con `Authorization: Bearer` o con
     el query param `?secret=` — usa el que prefieras.
   - **Opción Vercel Cron (plan Pro):** añade `vercel.json` a la raíz:

     ```json
     { "crons": [{ "path": "/api/cron/tick", "schedule": "* * * * *" }] }
     ```

     Vercel inyecta automáticamente `Authorization: Bearer $CRON_SECRET` y el endpoint ya lo acepta.
   - Nota: el plan gratuito (Hobby) de Vercel limita sus crons a 1 vez/día — para 1/min gratis usa cron-job.org.

6. **Realtime (opcional):** el WebSocket vive en `mini-services/realtime` y Vercel no aloja
   servicios separados. Súbelo a Railway/Render (comando `node index.ts`, puerto 3032, variable
   `REALTIME_PORT=3032`) y pon su URL pública en `NEXT_PUBLIC_REALTIME_URL` en Vercel.
   Sin realtime la plataforma funciona igual: la UI cae automáticamente a *polling*.

7. **Tras el primer deploy:** entra con `admin@growthrush.io` / `admin123` (¡cambia la contraseña!) y
   revisa **Admin → Ajustes** (motor de pedidos, verificación de email, pasarelas).

### Conectar un proveedor API real e importar servicios en masa (con tu %)

1. **Admin → Proveedores** (revendedor: **Mis proveedores**, requiere el add-on External API) →
   **Añadir proveedor** con la API URL + API key del proveedor (cualquier API estándar SMM Panel v2:
   JustAnotherPanel, N1Panel, etc.) → **Test connection** muestra su saldo.
2. **Sync** en la tarjeta del proveedor → elige tu margen % (o una categoría fija) → todos sus
   servicios se importan con precio = precio del proveedor + tu %. Repite **Sync** cuando quieras
   refrescar precios/disponibilidad — se emparejan por ID, nunca se duplican.
3. **Catálogo en cero:** la plataforma se entrega sin servicios. Si quieres vaciarlo de nuevo:
   **Admin → Proveedores → Danger zone → Reset catalog** (con o sin borrar historial de pedidos).
   También puedes pegar en el SQL Editor de Neon: `DELETE FROM "Order"; DELETE FROM "Service";`

### Subdominios y dominios propios (tiendas white-label)

- La app **detecta automáticamente el dominio donde está instalada** — las URLs de tienda que ves
  en los paneles (ej. `https://slug.tu-dominio.com`) son siempre reales.
- **Subdominios** (`cliente.tu-dominio.com`): añade en tu registrador un DNS wildcard
  `* A 76.76.21.21` (o `* CNAME cname.vercel-dns.com`) y añade el dominio wildcard en
  **Vercel → Settings → Domains** (requiere plan Pro de Vercel). Después funciona solo.
- **Dominio propio** (cliente/revendedor): se introduce en **Website → Domains**; se muestran los
  registros DNS (A `76.76.21.21` / CNAME `cname.vercel-dns.com`) y el botón **Verify DNS** hace una
  comprobación DNS-over-HTTPS REAL y pasa el estado a ACTIVE cuando resuelve. El dominio también
  debe añadirse en el proyecto de Vercel para emitir el SSL.
- Cualquier tienda siempre es accesible vía `https://tu-dominio/?storefront=slug` aunque falte el DNS.

### Pasarelas de pago reales

- **Admin → Pasarelas** (y cada revendedor en **Finanzas → Métodos de pago**): configura las
  credenciales reales (PayPal REST, MercadoPago, Cryptomus, CoinPayments…).
- Con credenciales configuradas el depósito va al checkout real del proveedor (redirección +
  webhook firmado). **Nunca se acredita dinero automáticamente.**
- Sin credenciales (Pix, Payoneer o cualquier método manual): el depósito queda **PENDIENTE con
  instrucciones** y se acredita solo al aprobarlo en la cola de depósitos (Admin o dueño de la
  plataforma). Los webhooks verifican firma HMAC/md5 sobre el cuerpo exacto.

---

### WhatsApp por QR (puente propio — estilo "Linked devices")

El panel de revendedor ofrece **dos formas de vincular WhatsApp** en CRM → Canales → Conectar:

| Modo | Qué necesitas | Cómo funciona |
|---|---|---|
| **Cloud API (Meta)** | App de Meta + token + Phone Number ID | Validación en vivo contra Graph API; webhook oficial. |
| **QR (WhatsApp Web)** | Tu **puente** siempre encendido (gratis en Railway) | Se genera un QR real; lo escaneás con *WhatsApp → Dispositivos vinculados*; los chats entran al Inbox. |

**¿Por qué hace falta un puente para el QR?** El protocolo de WhatsApp Web necesita un socket
siempre abierto — algo que el hosting serverless (Vercel) **no puede mantener**. El puente vive
en tu propia cuenta de Railway/Render (plan gratuito alcanza) y el panel se comunica con él.

**Montar el puente 100% desde el navegador (sin terminal):**

1. En GitHub: entra a `interfame/testinion` → carpeta `mini-services/whatsapp-bridge` → copiá
   esos 2 archivos en un **repo nuevo propio** (mismos nombres: `package.json`, `index.ts`)
   con un `Dockerfile` mínimo:
   ```dockerfile
   FROM oven/bun:1
   WORKDIR /app
   COPY package.json ./
   RUN bun install
   COPY . .
   EXPOSE 3040
   CMD ["bun", "index.ts"]
   ```
2. En [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo** → elegí tu
   repo. En **Settings → Networking → Generate Domain** exponé el puerto **3040**.
3. Copiá la URL pública (p. ej. `https://tu-puente.up.railway.app`).
4. En el panel: **CRM → Canales → WhatsApp → Conectar → pestaña QR** → pegá la URL →
   **Generate QR** → escanealo con el teléfono. Queda vinculado solo.

> El puente guarda la sesión en su disco (`sessions/`), así que **no hay que re-escanear** después
> de un reinicio. Cualquier mensaje entrante se reenvía al Inbox vía el webhook del canal.

---

### Usuarios de demostración (creados por el seed — ¡cámbialos!)

| Rol | Email | Contraseña |
|---|---|---|
| Super administrador | `admin@growthrush.io` | `admin123` |
| Revendedor | `reseller@growthrush.io` | `reseller123` |
| Cliente | `client@growthrush.io` | `client123` |

> El admin puede desactivar la verificación por email en **Admin → Email y notificaciones**. Con la verificación activada, el código de 6 dígitos se guarda en el Outbox (Admin → Logs) hasta que configures SMTP.

---

## English

### 🖱️ 100% web install (no terminal) — easiest path

Everything from the browser:

1. **Neon.tech** → create account/project → open the **SQL Editor**:
   - Open **`prisma/postgres-schema.sql`** on GitHub → **“Copy raw file”** → paste into the SQL Editor → **Run** (creates the 35 tables).
   - Same with **`prisma/seed.postgres.sql`** → paste → **Run** (demo users, plans, gateways, categories, FAQs, blog, CRM, settings — the SERVICE catalog is intentionally empty: import real services from your provider API in Admin → Providers → **Sync**).
2. **Vercel** → [vercel.com/new](https://vercel.com/new) → **Import** the repo → in **Build and Output Settings** override the Build Command with:
   `npx prisma generate --schema prisma/schema.postgres.prisma && next build`
   → add env vars `DATABASE_URL` (Neon **pooled** string) and `CRON_SECRET` (long random string) → **Deploy**.
3. Log in with `admin@growthrush.io` / `admin123` (change the password immediately).
4. Order-engine cron: [cron-job.org](https://cron-job.org) every 1 min → `https://your-app.vercel.app/api/cron/tick?secret=YOUR_SECRET` (GET or POST; header `x-cron-secret` also accepted — the built-in “Test run” button works).

### Connect a real provider API & mass-import services (with your %)

1. **Admin → Providers** (resellers: **My Providers**, needs the External API add-on) → **Add provider** with the provider's API URL + API key (any standard SMM Panel API v2: JustAnotherPanel, N1Panel, etc.) → **Test connection** shows their balance.
2. **Sync** on the provider card → choose your markup % (or a fixed category) → all their services are imported with prices = provider price + your %. Re-run **Sync** anytime to refresh prices/availability — services are matched by ID, never duplicated.
3. **Start from zero:** the catalog ships empty. To wipe it again (Admin → Providers → Danger zone → **Reset catalog**; optional purge of order history).

### Subdomains & custom domains (white-label stores)

- The app **auto-detects the domain it is installed on** — store URLs shown in the panels (e.g. `https://slug.your-domain.com`) are always real.
- **Subdomains** (`client.your-domain.com`): add a wildcard DNS record `* A 76.76.21.21` (or `* CNAME cname.vercel-dns.com`) at your registrar and add the wildcard domain in **Vercel → Settings → Domains**. Works automatically after that.
- **Custom domains** (reseller buys/plans): the reseller enters the domain in **Website → Domains**; DNS instructions (A `76.76.21.21` / CNAME `cname.vercel-dns.com`) are displayed and the **Verify DNS** button performs a REAL DNS-over-HTTPS lookup and flips the status to ACTIVE when records resolve. The domain must also be added to the Vercel project for SSL.
- Any store is always reachable via `https://your-domain/?storefront=slug` even without DNS.

### Requirements

- **Node.js 20+** (or Bun 1.x) — the app is Next.js (Node), **not PHP**.
- **PostgreSQL database — free account at [neon.tech](https://neon.tech)** (the DB lives on Neon, not on your hosting).
- Hosting that supports Node.js apps (Vercel, Railway, Render, VPS, cPanel "Setup Node.js App", Plesk…).

### Steps

1. **Create a Neon project** → copy the **pooled** connection string (`…-pooler…neon.tech/neondb?sslmode=require`).
2. **Upload & unzip** the package (e.g. `~/growthrush`).
3. `cp .env.example .env` and set `DATABASE_URL="postgresql://…neon.tech…"` plus a random `CRON_SECRET`.
4. `npm install`.
5. `npx prisma db push --schema prisma/schema.postgres.prisma` then `npx prisma generate --schema prisma/schema.postgres.prisma` (no SSH? import `prisma/postgres-schema.sql` from the Neon SQL Editor instead).
6. Optional demo content: `npx tsx scripts/seed.ts` (catalog, plans, gateways, demo users, email templates, FAQs, posts).
7. `npm run build` then `npm run start:node` (port 3000).
8. **Cron every 1 minute:** `curl -s -X POST http://127.0.0.1:3000/api/cron/tick -H "x-cron-secret: YOUR_SECRET"` — drives the order engine.
9. Optional realtime: run `mini-services/realtime` (see above).

### Deploying with GitHub + Vercel (recommended)

1. **Neon.tech** — create the project and copy the **pooled** connection string.
2. **Push the schema once** from your machine:
   `git clone` → `cp .env.example .env` (paste the Neon URL) → `npm install` →
   `npx prisma db push --schema prisma/schema.postgres.prisma` → `npx tsx scripts/seed.ts` (optional demo data).
3. **Vercel** — https://vercel.com/new → import the repo:
   - **Build Command:** `npx prisma generate --schema prisma/schema.postgres.prisma && next build`
   - **Env vars:** `DATABASE_URL` (Neon pooled string) · `CRON_SECRET` (long random string) ·
     optional `NEXT_PUBLIC_REALTIME_URL`.
4. **Cron:** free option — cron-job.org every 1 min → `https://your-app.vercel.app/api/cron/tick?secret=YOUR_SECRET`
   (GET or POST; header `x-cron-secret` and `Authorization: Bearer` also accepted). Vercel Hobby
   limits built-in crons to once per day.
5. **Realtime (optional):** host `mini-services/realtime` on Railway/Render and set
   `NEXT_PUBLIC_REALTIME_URL`. Without it, the UI falls back to polling automatically.

### Demo accounts (change immediately)

| Role | Email | Password |
|---|---|---|
| Super admin | `admin@growthrush.io` | `admin123` |
| Reseller | `reseller@growthrush.io` | `reseller123` |
| Client | `client@growthrush.io` | `client123` |

---

## Notas / Notes

- **Landing Studio**: Revendedor → Landing Studio — editor visual completo (secciones reordenables/ocultables, plantillas, vista previa móvil/tablet, páginas personalizadas como Términos/Privacidad, newsletter con leads reales).
- **Pagos**: el admin y cada revendedor configuran sus pasarelas (PayPal, MercadoPago, Pix, Cryptomus, CoinPayments, Payoneer, tarjetas…) desde **Finanzas → Métodos de pago**.
- **Dominio propio**: opcional por plataforma (Configuración del sitio web del revendedor).
- **Emails**: plantillas editables + SMTP por plataforma desde los paneles; sin SMTP queda en Outbox.
- **Neon tips**: el plan Free pausa proyectos inactivos; la primera petición tras la pausa tarda ~500 ms extra. Para producción seria considera un plan pago o un upgrade de compute.
- Security: keep `CRON_SECRET` private, use HTTPS, and change all demo passwords before going live.
