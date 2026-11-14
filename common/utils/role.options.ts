import { Role } from '../enums/role.enum';

export const RoleOptions = {
  [Role.Admin]: [
    { title: 'Client', value: Role.Client },
  ],

  [Role.Manager]: [
    { title: 'Client', value: Role.Cashier },
  ],

  [Role.Client]: [
    { title: 'Cashier', value: Role.Cashier },
  ],

  [Role.Cashier]: [],
} as const;