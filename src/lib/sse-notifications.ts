export const notificationClients = new Map<string, Set<(data: any) => void>>();

export function broadcastNotificationToUser(employeeId: string, notification: any) {
  const userClients = notificationClients.get(employeeId);
  if (userClients) {
    userClients.forEach((send) => {
      try {
        send(notification);
      } catch (e) {}
    });
  }
}
