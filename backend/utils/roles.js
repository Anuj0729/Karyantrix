
const ADMIN_ROLES = ['admin', 'staff'];

const isAdminRole = (role) => ADMIN_ROLES.includes(role);

module.exports = { ADMIN_ROLES, isAdminRole };
