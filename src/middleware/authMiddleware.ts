import { GraphQLError } from 'graphql';

// Definición de tipos para el contexto y usuario
export interface User {
  id: string;
  email?: string;
  role: string;
}

export interface Context {
  user?: User;
}

// Tipos de errores de autenticación
const AuthErrors = {
  UNAUTHENTICATED: {
    message: 'No autenticado. Por favor, inicie sesión para continuar.',
    code: 'UNAUTHENTICATED'
  },
  FORBIDDEN: {
    message: 'No autorizado. No tiene permisos suficientes para realizar esta acción.',
    code: 'FORBIDDEN'
  }
};

// Middleware para verificar si el usuario está autenticado
export const isAuthenticated = (context: Context) => {
  if (!context.user) {
    throw new GraphQLError(AuthErrors.UNAUTHENTICATED.message, {
      extensions: { code: AuthErrors.UNAUTHENTICATED.code }
    });
  }
  return context.user;
};

// Middleware para verificar si el usuario tiene uno de los roles especificados
export const hasRole = (context: Context, allowedRoles: string[]) => {
  const user = isAuthenticated(context);
  
  if (!allowedRoles.includes(user.role.toLowerCase())) {
    throw new GraphQLError(
      `${AuthErrors.FORBIDDEN.message} Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`, 
      { extensions: { code: AuthErrors.FORBIDDEN.code } }
    );
  }
  
  return user;
};

// Funciones específicas para roles comunes
export const isAdmin = (context: Context) => {
  return hasRole(context, ['admin']);
};

export const isSeller = (context: Context) => {
  return hasRole(context, ['seller']);
};

export const isCustomer = (context: Context) => {
  return hasRole(context, ['customer']);
};

export const isAdminOrSeller = (context: Context) => {
  return hasRole(context, ['admin', 'seller']);
};

// Middleware para verificar si el usuario es propietario de un recurso
export const isOwner = (context: Context, resourceUserId: string) => {
  const user = isAuthenticated(context);
  
  if (user.role !== 'admin' && user.id !== resourceUserId) {
    throw new GraphQLError(
      'No autorizado. Solo puede acceder a sus propios recursos.', 
      { extensions: { code: AuthErrors.FORBIDDEN.code } }
    );
  }
  
  return user;
};