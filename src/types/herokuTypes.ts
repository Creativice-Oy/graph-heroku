/* eslint-disable @typescript-eslint/no-explicit-any */
import { Opaque } from 'type-fest';

export type HerokuAppError = Opaque<any, 'HerokuError'>;

export type HerokuEnterpriseAccount = Opaque<any, ''>;

export type HerokuUser = Opaque<any, 'HerokuUser'>;

export type HerokuEnterpriseAccountTeam = Opaque<
  any,
  'HerokuEnterpriseAccountTeam'
>;

export type HerokuEnterpriseAccountMember = Opaque<
  any,
  'HerokuEnterpriseAccountMember'
>;

export type HerokuTeamMember = Opaque<any, 'HerokuTeamMember'>;

export type HerokuTeamApp = Opaque<any, 'HerokuTeamApp'>;

export type HerokuAppAddon = Opaque<any, 'HerokuAppAddon'>;
