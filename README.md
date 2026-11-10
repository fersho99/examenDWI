# Bloque 21

Precios de criptomonedas en la web, una app Android y una app para Galaxy Watch 8. El plan completo está en [docs/PLAN.md](docs/PLAN.md).

| Carpeta | Contenido |
|---|---|
| `apps/web` | Next.js: sitio, API `/api/v1`, ingesta de velas a Neon |
| `apps/android` | Capacitor: carga la web desplegada |
| `apps/wear` | Kotlin + Compose for Wear OS |
| `packages/shared` | Esquemas Zod, formato de precios, monedas iniciales y fixtures |

## Puesta en marcha

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` como `.env.local` y llena `DATABASE_URL`, `DATABASE_URL_UNPOOLED` y `CRON_SECRET`.
3. Crea las tablas, registra las monedas y trae las primeras velas:

   ```bash
   npm run db:migrate
   ```

   ```bash
   npm run db:seed
   ```

   ```bash
   npm run ingest
   ```

4. Levanta el servidor y abre <http://localhost:3000/app>:

   ```bash
   npm run dev
   ```

Android y reloj: [docs/ANDROID.md](docs/ANDROID.md).

## Calidad

```bash
npm run check
```

Corre tipos, lint, pruebas (incluida una de integración con Postgres en memoria) y el build de producción.

## Ingesta

`/api/internal/ingest` guarda velas de 5 min, 1 h y 1 día de Binance en Neon. Acepta `GET` o `POST` con `Authorization: Bearer CRON_SECRET`. En Vercel Hobby el cron propio solo corre una vez al día, así que la llama un programador externo cada 15 min.

## Fuentes de datos

- [Binance Market Data](https://developers.binance.com/docs/binance-spot-api-docs/faqs/market_data_only): precios y velas, par contra USDT.
- [CoinGecko](https://docs.coingecko.com/docs/keyless-public-api): capitalización, suministro, ATH y tipos de cambio en el sitio actual.
- [Alternative.me](https://alternative.me/crypto/fear-and-greed-index/): índice de miedo y codicia.

## Sitio anterior

`/`, `/login` y `/dashboard` siguen siendo el sitio de Bitcoin con login **simulado** (usuario `demo@bloque21.test`, contraseña `satoshi21`). Se reemplazan en los hitos 2 a 4 del plan.
