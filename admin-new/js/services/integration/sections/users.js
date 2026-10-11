import { apiService } from '../../api.js';

function unwrapArray(res) {
  const data = res && res.data !== undefined ? res.data : res;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.users)) return data.users;
  if (data && Array.isArray(data.roles)) return data.roles;
  return [];
}

export const usersAPI = {
  list: async (params) => unwrapArray(await apiService.getUsers(params)),
  get: (id) => apiService.getUser(id),
  create: (data) => apiService.createUser(data),
  update: (id, data) => apiService.updateUser(id, data),
  delete: (id) => apiService.deleteUser(id),
  getRoles: async () => unwrapArray(await apiService.getRoles()),
  createRole: (data) => apiService.createRole(data),
  updateRole: (id, data) => apiService.updateRole(id, data),
  deleteRole: (id) => apiService.deleteRole(id),
};

export default usersAPI;