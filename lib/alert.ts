/**
 * lib/alert.ts
 * Utilidad de alertas compatible con web y móvil.
 *
 * En web:  usa window.confirm / window.alert del navegador
 * En móvil: usa Alert.alert de React Native
 *
 * Uso:
 *   import { webAlert, webConfirm } from "@/lib/alert";
 *
 *   // Alerta simple
 *   webAlert("Título", "Mensaje");
 *
 *   // Confirmación (retorna Promise<boolean>)
 *   const ok = await webConfirm("¿Estás seguro?", "Esta acción no se puede deshacer.");
 *   if (ok) { ... }
 */
import { Platform, Alert } from "react-native";

/** Muestra una alerta simple. */
export function webAlert(title: string, message?: string): void {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

/**
 * Muestra un diálogo de confirmación.
 * Retorna Promise<boolean> — true si el usuario confirmó.
 */
export function webConfirm(title: string, message?: string): Promise<boolean> {
  if (Platform.OS === "web") {
    const result = window.confirm(message ? `${title}\n\n${message}` : title);
    return Promise.resolve(result);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancelar", style: "cancel",      onPress: () => resolve(false) },
        { text: "Confirmar", style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * Versión de Alert.alert totalmente compatible para uso general.
 * Acepta los mismos parámetros que Alert.alert.
 */
export function crossAlert(
  title: string,
  message?: string,
  buttons?: { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }[]
): void {
  if (Platform.OS === "web") {
    // En web mostramos la alerta y ejecutamos el primer botón no-cancelar
    window.alert(message ? `${title}\n\n${message}` : title);
    const defaultBtn = buttons?.find((b) => b.style !== "cancel");
    defaultBtn?.onPress?.();
  } else {
    Alert.alert(title, message, buttons as any);
  }
}
