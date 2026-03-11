export const STAFF_ROLES = ['Admin', 'Manager', 'Staff', 'Administrador', 'Entrenador', 'Preparador Físico'];

export const isStaff = (role: string | null | undefined): boolean => {
    if (!role) return false;
    return STAFF_ROLES.includes(role);
};
