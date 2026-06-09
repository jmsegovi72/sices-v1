/* ============================================================
    🛠️ HELPER: mapUserResponse
    ------------------------------------------------------------
    📌 Propósito: 
    Limpiar datos sensibles (password, intentos) y formatear
    booleanos de las vistas de MariaDB.
   ============================================================ */
export const mapUserResponse = (user: any) => {
  if (!user) return null;

  const {
    password,
    loginAttempts,
    lockedUntil,
    isActive,
    isFirstLogin,
    ...rest
  } = user;

  return {
    ...rest,
    isActive: !!isActive, // Transforma 1/0 a true/false
    firstLogin: !!isFirstLogin, // Transforma 1/0 a true/false
  };
};
