import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { JWT_SECRET } from './auth.js';

let io = null;
let pubClient = null;
let subClient = null;

export function initSocket(httpServer, redisUrl) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL?.split(',') || [
        'http://localhost:5173',
        'http://localhost:8000',
        'http://localhost:8001',
        'http://localhost:3000',
        'https://dalli.rs',
        'https://www.dalli.rs',
      ],
      credentials: true,
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for scaling (optional)
  if (redisUrl) {
    try {
      pubClient = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
      subClient = pubClient.duplicate();
      // io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.io Redis adapter enabled');
    } catch (e) {
      console.warn('Redis adapter failed, using in-memory:', e.message);
    }
  }

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    const adminToken = socket.handshake.auth.adminToken || socket.handshake.query.adminToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = { id: decoded.sub, email: decoded.email, role: 'user' };
        return next();
      } catch (e) {
        return next(new Error('Invalid user token'));
      }
    }

    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, JWT_SECRET);
        socket.admin = { id: decoded.sub, email: decoded.email, role: decoded.role };
        return next();
      } catch (e) {
        return next(new Error('Invalid admin token'));
      }
    }

    // Allow anonymous connections for public features (stock, search suggestions)
    socket.anonymous = true;
    next();
  });

  io.on('connection', socket => {
    console.log(
      `Socket connected: ${socket.id} (${socket.user ? 'user' : socket.admin ? 'admin' : 'anonymous'})`
    );

    // User joins their personal room
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
    }

    // Admin joins admin room
    if (socket.admin) {
      socket.join('admins');
      socket.join(`admin:${socket.admin.id}`);
    }

    // Order tracking room
    socket.on('track:order', orderId => {
      socket.join(`order:${orderId}`);
      console.log(`Socket ${socket.id} tracking order ${orderId}`);
    });

    socket.on('untrack:order', orderId => {
      socket.leave(`order:${orderId}`);
    });

    // Product stock updates room
    socket.on('watch:product', productId => {
      socket.join(`product:${productId}`);
    });

    socket.on('unwatch:product', productId => {
      socket.leave(`product:${productId}`);
    });

    // Live chat / support
    socket.on('join:chat', chatId => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('leave:chat', chatId => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('chat:message', data => {
      if (!socket.user && !socket.admin) return;
      io.to(`chat:${data.chatId}`).emit('chat:message', {
        id: data.id,
        chatId: data.chatId,
        userId: socket.user?.id || socket.admin?.id,
        userName: socket.user?.email || socket.admin?.email,
        role: socket.user ? 'user' : 'admin',
        content: data.content,
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicator
    socket.on('chat:typing', data => {
      socket.to(`chat:${data.chatId}`).emit('chat:typing', {
        userId: socket.user?.id || socket.admin?.id,
        userName: socket.user?.email || socket.admin?.email,
      });
    });

    socket.on('chat:stop-typing', data => {
      socket.to(`chat:${data.chatId}`).emit('chat:stop-typing', {
        userId: socket.user?.id || socket.admin?.id,
      });
    });

    // Disconnect
    socket.on('disconnect', reason => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

// Event emitters for server-side triggers
export const SocketEvents = {
  // Order status changes
  orderStatusChanged: (orderId, data) => {
    if (io) io.to(`order:${orderId}`).emit('order:status', { orderId, ...data });
    if (io) io.to('admins').emit('admin:order:status', { orderId, ...data });
  },

  // Stock level changes
  stockChanged: (productId, data) => {
    if (io) io.to(`product:${productId}`).emit('product:stock', { productId, ...data });
    if (io) io.to('admins').emit('admin:product:stock', { productId, ...data });
  },

  // New order notification
  newOrder: order => {
    if (io) io.to('admins').emit('admin:order:new', order);
  },

  // Payment status update
  paymentStatusChanged: (orderId, data) => {
    if (io) io.to(`order:${orderId}`).emit('order:payment', { orderId, ...data });
  },

  // User notification
  userNotification: (userId, notification) => {
    if (io) io.to(`user:${userId}`).emit('notification', notification);
  },

  // Broadcast to all users
  broadcast: (event, data) => {
    if (io) io.emit(event, data);
  },

  // Admin only broadcast
  adminBroadcast: (event, data) => {
    if (io) io.to('admins').emit(event, data);
  },

  // Price change notification
  priceChanged: (productId, data) => {
    if (io) io.to(`product:${productId}`).emit('product:price', { productId, ...data });
  },

  // Inventory low alert
  lowStockAlert: (productId, data) => {
    if (io) io.to('admins').emit('admin:inventory:low', { productId, ...data });
  },

  // Cart abandonment reminder
  cartAbandoned: (userId, data) => {
    if (io) io.to(`user:${userId}`).emit('cart:abandoned', data);
  },
};

export function closeSocket() {
  if (pubClient) pubClient.quit();
  if (subClient) subClient.quit();
  if (io) io.close();
}
