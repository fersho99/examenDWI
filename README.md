# Bloque 21

Sitio web sobre Bitcoin con precio en vivo, gráfica histórica, métricas de mercado,
índice de miedo y codicia, y conversor a MXN, USD y EUR.

Construido con Next.js (App Router), TypeScript y Tailwind CSS.

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>.

## Acceso de demostración

El login es **simulado**: no usa base de datos ni un servicio de autenticación. Las
credenciales están fijas en `src/lib/session.ts` y también se muestran en `/login`.

| Campo      | Valor                |
| ---------- | -------------------- |
| Correo     | `demo@bloque21.test` |
| Contraseña | `satoshi21`          |

Al entrar se guarda una cookie de sesión de demostración, y `src/proxy.ts` protege la
ruta `/dashboard`.

## Fuentes de datos

Ninguna requiere clave de acceso.

- [Binance Market Data](https://developers.binance.com/docs/binance-spot-api-docs/faqs/market_data_only):
  precio en vivo, variación de 24 horas e historial de la gráfica (par BTC/USDT).
- [CoinGecko](https://docs.coingecko.com/docs/keyless-public-api): capitalización,
  volumen global, suministro, máximo histórico y tipos de cambio.
- [Alternative.me](https://alternative.me/crypto/fear-and-greed-index/): índice de miedo
  y codicia.

La API pública de CoinGecko limita las consultas por IP, así que sus datos se guardan en
caché varios minutos. Si una fuente falla, se conserva el último dato conocido y la
página sigue funcionando con lo disponible.

## Scripts

| Comando         | Descripción                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Servidor de desarrollo       |
| `npm run build` | Compilación para producción  |
| `npm run start` | Servidor de producción       |
| `npm run lint`  | Revisión de código con ESLint |



Este es un cambio en la rama dev
