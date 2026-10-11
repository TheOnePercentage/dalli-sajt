/**
 * Trusted Devices Management - Phase 23
 * Architecture only
 */

const STORAGE_KEY = 'dalli_trusted_devices';

export function getTrustedDevices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addTrustedDevice(device) {
  const devices = getTrustedDevices();
  const newDevice = {
    id: device.id || `device_${Date.now()}`,
    name: device.name || 'Unknown Device',
    fingerprint: device.fingerprint || '',
    registeredAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    userAgent: navigator.userAgent
  };
  devices.push(newDevice);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    return newDevice;
  } catch (e) {
    return null;
  }
}

export function removeTrustedDevice(deviceId) {
  const devices = getTrustedDevices().filter(d => d.id !== deviceId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    return true;
  } catch (e) {
    return false;
  }
}
