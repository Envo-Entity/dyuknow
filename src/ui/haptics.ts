import * as Haptics from 'expo-haptics';

/** Save / send / book / confirm succeeded. */
export function commit(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Something was refused (limit reached, not allowed). */
export function warn(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** A picker tick: a chip, a day, a segment, a choice. */
export function select(): void {
  Haptics.selectionAsync().catch(() => {});
}
