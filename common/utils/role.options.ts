import { Role } from '../enums/role.enum';

export const RoleOptions = {
  [Role.Admin]: [
    { title: 'Agent', value: Role.Agent },
    { title: 'Client', value: Role.Client },
  ],

  [Role.Agent]: [
    { title: 'Client', value: Role.Client },
  ],

  [Role.Client]: [
    { title: 'Cashier', value: Role.Cashier },
  ],

  [Role.Cashier]: [],
} as const;