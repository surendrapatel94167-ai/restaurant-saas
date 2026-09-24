import { getIO } from '../config/socket.js';

export function emitNewOrder(tenantId, order) {
  getIO().to(`tenant:${tenantId}`).emit('new_order', order);
}

export function emitOrderStatusUpdate(tenantId, order) {
  getIO().to(`tenant:${tenantId}`).emit('order_status_update', order);
}

export function emitAssistanceRequest(tenantId, order, requestType) {
  getIO().to(`tenant:${tenantId}`).emit('assistance_request', {
    orderId: order._id,
    tableNumber: order.tableNumber,
    type: requestType,
  });
}

export function emitMenuAvailabilityChange(tenantId, menuItem) {
  getIO().to(`tenant:${tenantId}`).emit('menu_availability_change', menuItem);
}
