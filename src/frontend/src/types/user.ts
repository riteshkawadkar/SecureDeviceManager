export interface Role {
  id: string;
  name: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  createdOn: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  roleId: string;
  isActive: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}
