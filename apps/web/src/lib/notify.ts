"use client";

export type NotifyPermission = "granted" | "denied" | "prompt" | "unsupported";

/**
 * El plugin siempre viaja dentro de un objeto: los plugins de Capacitor son un proxy y, si una
 * promesa los devuelve sueltos, JavaScript intenta llamar a su .then() y falla en Android.
 */
async function nativePlugin() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return null;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return { plugin: LocalNotifications };
}

function fromDisplay(display: string): NotifyPermission {
  return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
}

function browserPermission(): NotifyPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission === "default" ? "prompt" : Notification.permission;
}

export async function getNotifyPermission(): Promise<NotifyPermission> {
  const native = await nativePlugin();
  if (native) return fromDisplay((await native.plugin.checkPermissions()).display);
  return browserPermission();
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  const native = await nativePlugin();
  if (native) return fromDisplay((await native.plugin.requestPermissions()).display);
  if (typeof Notification === "undefined") return "unsupported";
  const result = await Notification.requestPermission();
  return result === "default" ? "prompt" : result;
}

let nextId = Math.floor(Date.now() / 1000) % 1_000_000;

/**
 * Notificación del sistema. En la app de Android es nativa, y el Galaxy Watch la replica y vibra.
 * Devuelve false si no hay permiso, para que la interfaz muestre el aviso dentro de la app.
 */
export async function notify(title: string, body: string): Promise<boolean> {
  const native = await nativePlugin();
  if (native) {
    const { display } = await native.plugin.checkPermissions();
    if (display !== "granted") return false;
    await native.plugin.schedule({ notifications: [{ id: nextId++, title, body }] });
    return true;
  }
  if (browserPermission() !== "granted") return false;
  new Notification(title, { body });
  return true;
}
