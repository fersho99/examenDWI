# Android y Galaxy Watch 8: compilar e instalar por adb

Solo APK de depuración, instaladas con `adb install -r` (conserva los datos al actualizar). Sin Play Store y sin firma de lanzamiento.

| | Teléfono | Reloj |
|---|---|---|
| Proyecto | `apps/android` (Capacitor) | `apps/wear` (Kotlin + Compose for Wear OS) |
| `applicationId` | `mx.bloque21.app` | `mx.bloque21.app` (debe ser idéntico para vincularlos) |
| `versionName` | `0.1.0` | `0.1.0` |
| `versionCode` | Minutos desde el 1 de enero de 2026: sube solo en cada compilación | Igual |
| Qué contiene | El envoltorio nativo, la página local sin conexión y la URL del servidor. Cambiar la web **no** requiere reinstalar | La app completa. Lee Binance directo por su propia conexión: no necesita la PC ni servidor |

## Lo que necesitas en Windows

Revisado en esta PC el 10 de noviembre de 2026:

- **Node 22 o superior** (tienes 24.18).
- **JDK 21.** Tienes Temurin 21 en `C:\Program Files\Eclipse Adoptium`. Tu `JAVA_HOME` apunta al JDK 25 de Android Studio, que **Gradle 8.14 no soporta**; los scripts eligen el JDK 21 solos. Si lo mueves, define `BLOQUE21_JAVA_HOME` en `.env.local`.
- **Android SDK** con plataforma 36 y build-tools 36 (ya están) y la variable `ANDROID_HOME`.
- **Gradle:** no lo instales. Cada proyecto trae su wrapper (Gradle 8.14.3, Android Gradle Plugin 8.13).
- **adb 30 o superior.** Tienes dos copias en el `PATH`; si `adb` se reinicia solo, deja únicamente la del SDK (`%ANDROID_HOME%\platform-tools`).

## Configuración, una vez

1. Copia `.env.example` como `.env.local` en la raíz y llena los valores.
2. Para usar el servidor desplegado, deja `BLOQUE21_ENV=prod` y pon tu dominio en `BLOQUE21_URL`.
3. Para probar contra tu PC, usa `BLOQUE21_ENV=dev` y deja corriendo `npm run dev`: los dispositivos llegan a `localhost:3000` mediante `adb reverse`, que los scripts activan solos.

`BLOQUE21_ENV` se lee **al compilar**. Si cambias de modo, vuelve a instalar.

## Teléfono

En el teléfono: Ajustes > Acerca del teléfono > Información de software, toca 7 veces "Número de compilación". Después, en Opciones de desarrollador, activa "Depuración USB". Conéctalo por USB y acepta la huella de la PC.

```bash
adb devices -l
```

```bash
npm run android:install
```

Si tienes el teléfono y el reloj conectados a la vez, copia el serial del teléfono de `adb devices -l` a `ADB_PHONE` en `.env.local`.

Sin cable: en Opciones de desarrollador activa "Depuración inalámbrica" y sigue los mismos pasos que el reloj (emparejar y conectar).

## Galaxy Watch 8

Reloj y PC en la **misma red Wi-Fi**. Una red de invitados suele aislar dispositivos y no funciona.

1. En el reloj: Ajustes > Acerca del reloj > Información de software, toca varias veces "Versión de software" hasta que aparezca el aviso de Opciones de desarrollador.
2. Ajustes > Opciones de desarrollador: activa "Depuración ADB" y "Depuración inalámbrica".
3. Entra a "Depuración inalámbrica" > "Emparejar nuevo dispositivo". Anota el código y la IP:puerto de esa pantalla, y empareja **una sola vez**:

   ```bash
   adb pair IP:PUERTO_DE_EMPAREJAMIENTO
   ```

4. Regresa a "Depuración inalámbrica". Ahí aparece otra IP:puerto, normalmente con un puerto distinto. Guárdalo en `ADB_WATCH` de `.env.local` y conecta:

   ```bash
   npm run wear:connect
   ```

5. Instala:

   ```bash
   npm run wear:install
   ```

Si el nombre de algún menú no coincide en tu versión de One UI Watch, avísame y lo corrijo aquí.

### Si el reloj pierde la conexión o cambia de IP

- El puerto de conexión cambia cada vez que se reinicia la depuración inalámbrica o el reloj. Lee la nueva IP:puerto en "Depuración inalámbrica", actualiza `ADB_WATCH` y repite `npm run wear:connect`. **No hace falta emparejar otra vez.**
- Si sigue fallando:

  ```bash
  adb kill-server
  ```

  ```bash
  adb start-server
  ```

  Luego apaga y prende "Depuración inalámbrica" en el reloj.
- Para que la IP no cambie, resérvala en tu router (DHCP estático) para el reloj.
- Apaga la depuración inalámbrica cuando termines: gasta batería.

## Comandos, en el orden en que los usas

| Comando | Qué hace |
|---|---|
| `npm run android:debug` | `cap sync` y `assembleDebug` del teléfono |
| `npm run android:install` | Lo anterior y `adb install -r`; en dev también `adb reverse` |
| `npm run wear:connect` | `adb connect` con `ADB_WATCH` |
| `npm run wear:debug` | `assembleDebug` del reloj con la URL de la API |
| `npm run wear:install` | Lo anterior y `adb install -r`; en dev también `adb reverse` |
| `npm run devices` | Lista dispositivos conectados |

Las APK quedan en:

- `apps/android/android/app/build/outputs/apk/debug/app-debug.apk`
- `apps/wear/app/build/outputs/apk/debug/app-debug.apk`

## Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | La APK instalada se firmó con otro keystore (otra PC). Desinstala con `adb uninstall mx.bloque21.app` e instala de nuevo. Compila siempre teléfono y reloj en la misma PC para que coincidan las firmas |
| La app del teléfono muestra "No pudimos abrir Bloque 21" | No llega al servidor. En dev: `npm run dev` corriendo y `adb reverse tcp:3000 tcp:3000`. En prod: revisa `BLOQUE21_URL` |
| El reloj dice "Sin conexión" | El reloj no tiene red, o en dev falta `adb reverse` hacia el reloj |
| `more than one device/emulator` | Define `ADB_PHONE` y `ADB_WATCH` en `.env.local` |
| Gradle falla con "Unsupported class file major version" | Se usó un JDK que no es 21. Define `BLOQUE21_JAVA_HOME` |

## Qué hace el reloj

- **Lista:** tu moneda principal arriba y las otras 9 con precio y variación de 24 h. Abajo, cambiar entre pesos y dólares, y ver las alertas.
- **Detalle:** precio, variación, gráfica de las últimas 24 h, rango del día y antigüedad del dato.
- **Principal:** en el detalle, el interruptor "Principal" elige la moneda del tile y de la carátula.
- **Alertas del reloj:** en el detalle, cada toque en "Alerta" cambia el umbral: ±2, ±3, ±5, ±10 % y apagada. El reloj las revisa cada 15 min aunque la app esté cerrada y vibra dos veces.
- **Tile:** precio de la moneda principal, variación, rango del día y antigüedad.
- **Complication:** mantén presionada la carátula > Personalizar > elige un espacio > Bloque 21 "Precio de cripto".

Para poner el tile en el carrusel desde la PC:

```bash
adb -s IP:PUERTO shell am broadcast -a com.google.android.wearable.app.DEBUG_SURFACE --es operation add-tile --ecn component mx.bloque21.app/.PriceTileService
```
