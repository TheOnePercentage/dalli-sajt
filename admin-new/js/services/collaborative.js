/**
 * Collaborative Editing - Operational Transform for real-time co-editing
 * Supports concurrent editing of text, forms, and structured data
 */

import { realtimeService } from './realtime.js';

class CollaborativeEditor {
  constructor(userId) {
    this.userId = userId;
    this.documents = new Map();
    this.pendingOps = new Map();
    this.appliedOps = new Map();
    this.listeners = new Map();
    this.unsubscribers = [];
    this.setupRealtimeListeners();
  }

  setupRealtimeListeners() {
    this.unsubscribers.push(
      realtimeService.on('doc:operation', (data) => {
        this.applyRemoteOperation(data.docId, data.operation);
      })
    );

    this.unsubscribers.push(
      realtimeService.on('doc:sync', (data) => {
        this.syncDocument(data.docId, data.state);
      })
    );

    this.unsubscribers.push(
      realtimeService.on('doc:cursor', (data) => {
        this.updateCursor(data.docId, data.userId, data.cursor);
      })
    );
  }

  createDocument(docId, initialContent = '') {
    const state = {
      content: initialContent,
      revision: 0,
      operations: [],
      cursors: new Map(),
    };
    this.documents.set(docId, state);
    this.pendingOps.set(docId, []);
    this.appliedOps.set(docId, new Set());
    return state;
  }

  getDocument(docId) {
    return this.documents.get(docId);
  }

  applyLocalOperation(docId, operation) {
    const doc = this.documents.get(docId);
    if (!doc) throw new Error(`Document ${docId} not found`);

    const op = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.userId,
      timestamp: Date.now(),
      revision: doc.revision,
    };

    // Apply locally first (optimistic)
    this.applyOperation(doc, op);
    doc.operations.push(op);
    doc.revision++;

    // Queue for sending
    const pending = this.pendingOps.get(docId) || [];
    pending.push(op);
    this.pendingOps.set(docId, pending);

    // Send to other clients
    realtimeService.send('doc:operation', { docId, operation: op });

    this.notifyListeners(docId);
    return op;
  }

  applyRemoteOperation(docId, operation) {
    const doc = this.documents.get(docId);
    if (!doc) {
      // Request sync
      realtimeService.send('doc:request-sync', { docId });
      return;
    }

    // Check if already applied
    const applied = this.appliedOps.get(docId) || new Set();
    if (applied.has(operation.id)) return;

    // Transform against pending local operations
    const pending = this.pendingOps.get(docId) || [];
    let transformedOp = operation;
    for (const localOp of pending) {
      if (localOp.id !== operation.id) {
        transformedOp = this.transformOperation(transformedOp, localOp);
      }
    }

    // Apply transformed operation
    this.applyOperation(doc, transformedOp);
    doc.operations.push(transformedOp);
    doc.revision = Math.max(doc.revision, operation.revision + 1);

    applied.add(operation.id);
    this.appliedOps.set(docId, applied);

    // Remove acknowledged operations from pending
    this.cleanupPendingOps(docId);

    this.notifyListeners(docId);
  }

  applyOperation(doc, op) {
    switch (op.type) {
      case 'insert':
        if (op.text && op.position >= 0 && op.position <= doc.content.length) {
          doc.content = doc.content.slice(0, op.position) + op.text + doc.content.slice(op.position);
        }
        break;
      case 'delete':
        if (op.position >= 0 && op.position + (op.length || 0) <= doc.content.length) {
          doc.content = doc.content.slice(0, op.position) + doc.content.slice(op.position + (op.length || 0));
        }
        break;
      case 'retain':
        // No-op for retain, used for attribute changes
        break;
    }

    // Update cursors after operation
    this.adjustCursors(doc, op);
  }

  adjustCursors(doc, op) {
    for (const [userId, cursor] of doc.cursors) {
      if (userId === op.userId) continue;

      let newPosition = cursor.position;
      if (op.type === 'insert' && op.position <= cursor.position) {
        newPosition += op.text?.length || 0;
      } else if (op.type === 'delete' && op.position < cursor.position) {
        const deleteEnd = op.position + (op.length || 0);
        if (deleteEnd <= cursor.position) {
          newPosition -= op.length || 0;
        } else if (op.position < cursor.position) {
          newPosition = op.position;
        }
      }
      cursor.position = Math.max(0, Math.min(newPosition, doc.content.length));

      if (cursor.selection) {
        let { start, end } = cursor.selection;
        if (op.type === 'insert' && op.position <= start) {
          start += op.text?.length || 0;
          end += op.text?.length || 0;
        } else if (op.type === 'delete') {
          const deleteEnd = op.position + (op.length || 0);
          if (deleteEnd <= start) {
            start -= op.length || 0;
            end -= op.length || 0;
          } else if (op.position < start) {
            start = op.position;
            end = Math.max(start, end - (op.length || 0));
          }
        }
        cursor.selection = { start: Math.max(0, start), end: Math.max(0, end) };
      }
    }
  }

  transformOperation(op1, op2) {
    // Simple transform - in production use a proper OT/CRDT library
    const transformed = { ...op1 };

    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        transformed.position += op2.text?.length || 0;
      }
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      if (op2.position < op1.position) {
        const deleteEnd = op2.position + (op2.length || 0);
        if (deleteEnd <= op1.position) {
          transformed.position -= op2.length || 0;
        } else if (op2.position < op1.position) {
          transformed.position = op2.position;
        }
      }
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        transformed.position += op2.text?.length || 0;
      }
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      const op1End = op1.position + (op1.length || 0);
      const op2End = op2.position + (op2.length || 0);

      if (op2End <= op1.position) {
        transformed.position -= op2.length || 0;
      } else if (op2.position >= op1End) {
        // No change
      } else if (op2.position <= op1.position && op2End >= op1End) {
        // op2 completely covers op1
        transformed.length = 0;
      } else if (op2.position <= op1.position) {
        transformed.position = op2.position;
        transformed.length = (op1.length || 0) - (op2End - op1.position);
      } else if (op2End >= op1End) {
        transformed.length = (op1.length || 0) - (op2.position - op1.position);
      } else {
        // Overlapping in middle
        transformed.length = (op1.length || 0) - (op2.length || 0);
      }
    }

    return transformed;
  }

  cleanupPendingOps(docId) {
    const doc = this.documents.get(docId);
    const pending = this.pendingOps.get(docId) || [];

    // Remove operations that are older than the current revision
    const acknowledged = pending.filter(op => op.revision < doc.revision - 100);
    acknowledged.forEach(op => {
      const applied = this.appliedOps.get(docId);
      if (applied) applied.delete(op.id);
    });

    this.pendingOps.set(docId, pending.filter(op => op.revision >= doc.revision - 100));
  }

  syncDocument(docId, state) {
    const existing = this.documents.get(docId);
    if (existing) {
      // Merge operations
      const newOps = state.operations.filter(op =>
        !existing.operations.some(existingOp => existingOp.id === op.id)
      );
      existing.operations.push(...newOps);
      existing.content = state.content;
      existing.revision = state.revision;
      existing.cursors = state.cursors;
    } else {
      this.documents.set(docId, state);
    }
    this.notifyListeners(docId);
  }

  updateCursor(docId, userId, cursor) {
    const doc = this.documents.get(docId);
    if (doc) {
      doc.cursors.set(userId, { ...cursor, user: { id: userId } });
      this.notifyListeners(docId);
    }
  }

  sendCursor(docId, position, selection) {
    realtimeService.send('doc:cursor', { docId, userId: this.userId, cursor: { position, selection } });
  }

  requestSync(docId) {
    realtimeService.send('doc:request-sync', { docId });
  }

  onChange(docId, callback) {
    if (!this.listeners.has(docId)) {
      this.listeners.set(docId, new Set());
    }
    this.listeners.get(docId).add(callback);
    return () => this.listeners.get(docId)?.delete(callback);
  }

  notifyListeners(docId) {
    const doc = this.documents.get(docId);
    if (doc) {
      this.listeners.get(docId)?.forEach(cb => cb(doc));
    }
  }

  // Helper methods for common operations
  insertText(docId, position, text) {
    return this.applyLocalOperation(docId, { type: 'insert', position, text });
  }

  deleteText(docId, position, length) {
    return this.applyLocalOperation(docId, { type: 'delete', position, length });
  }

  retainAttributes(docId, position, length, attributes) {
    return this.applyLocalOperation(docId, { type: 'retain', position, length, attributes });
  }

  destroy() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.documents.clear();
    this.pendingOps.clear();
    this.appliedOps.clear();
    this.listeners.clear();
  }
}

export { CollaborativeEditor };
export default CollaborativeEditor;