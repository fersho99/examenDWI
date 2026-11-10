"use client";

export type NotifyPermission = "granted" | "denied" | "prompt" | "unsupported";

async function native() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return null;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications;
}

function browserPermission(): NotifyPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission === "default" ? "prompt" : Notification.permission;
}

export async function getNotifyPermission(): Promise<NotifyPermission> {
  const plugin = await native();
  if (plugin) {
    const { display } = await plugin.checkPermissions();
    return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
  }
  return browserPermission();
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  const plugin = await native();
  if (plugin) {
    const { display } = await plugin.requestPermissions();
    return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
  }
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
  const plugin = await native();
  if (plugin) {
    const { display } = await plugin.checkPermissions();
    if (display !== "granted") return false;
    await plugin.schedule({ notifications: [{ id: nextId++, title, body }] });
    return true;
  }
  if (browserPermission() !== "granted") return false;
  new Notification(title, { body });
  return true;
}
