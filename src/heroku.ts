import Heroku from 'heroku-client';
import {
  HerokuEnterpriseAccount,
  HerokuEnterpriseAccountTeam,
  HerokuEnterpriseAccountMember,
  HerokuUser,
  HerokuTeamMember,
  HerokuTeamApp,
  HerokuAppAddon,
} from './types/herokuTypes';
import { HerokuClientError } from './types';
import {
  IntegrationProviderAPIError,
  IntegrationProviderAuthorizationError,
} from '@jupiterone/integration-sdk-core';

interface HerokuIntegrationConfig {
  apiKey: string;
}

export function routeToEndpoint(route: string): string {
  return `https://api.heroku.com${route}`;
}

export function createRequestError(
  endpoint: string,
  err: HerokuClientError,
): IntegrationProviderAPIError {
  const { statusCode: status } = err;
  const statusText = err.body?.message || 'Heroku API request error received';

  if (status === 403) {
    return new IntegrationProviderAuthorizationError({
      cause: {
        name: err.body.id,
        message: err.body.message,
      },
      endpoint,
      status,
      statusText,
    });
  }

  return new IntegrationProviderAPIError({
    code: 'UNKNOWN_HEROKU_API_ERROR',
    endpoint,
    status,
    statusText: statusText,
    fatal: false,
  });
}

export class HerokuClient {
  private readonly heroku: Heroku;

  constructor(config: HerokuIntegrationConfig) {
    this.heroku = new Heroku({
      token: config.apiKey,
    });
  }

  async request<T>(route: string): Promise<T[]> {
    try {
      const response = await this.heroku.get(route);
      return response;
    } catch (err) {
      throw createRequestError(routeToEndpoint(route), err);
    }
  }

  /**
   * WARNING: Heroku labels this API as in DEVELOPMENT
   * https://devcenter.heroku.com/articles/platform-api-reference#enterprise-account-list
   *
   */
  getEnterpriseAccounts(): Promise<HerokuEnterpriseAccount[]> {
    return this.request('/enterprise-accounts');
  }

  /**
   * WARNING: Heroku labels this API as in DEVELOPMENT
   * https://devcenter.heroku.com/articles/platform-api-reference#team-list-by-enterprise-account
   */
  getEnterpriseAccountTeams(
    enterpriseAccountId: string,
  ): Promise<HerokuEnterpriseAccountTeam[]> {
    return this.request(`/enterprise-accounts/${enterpriseAccountId}/teams`);
  }

  /**
   * WARNING: Heroku labels this API as in DEVELOPMENT
   * https://devcenter.heroku.com/articles/platform-api-reference#enterprise-account-member-list
   */
  getEnterpriseAccountMembers(
    enterpriseAccountId: string,
  ): Promise<HerokuEnterpriseAccountMember[]> {
    return this.request(`/enterprise-accounts/${enterpriseAccountId}/members`);
  }

  /**
   * WARNING: Heroku labels this API as in DEVELOPMENT
   * https://devcenter.heroku.com/articles/platform-api-reference#team-member-list
   */
  getTeamMembers(teamId: string): Promise<HerokuTeamMember[]> {
    return this.request(`/teams/${teamId}/members`);
  }

  /**
   * Heroku labels this API as in PRODUCTION
   * https://devcenter.heroku.com/articles/platform-api-reference#account-info-by-user
   */
  getUser(userId: string): Promise<HerokuUser[]> {
    return this.request(`/users/${userId}`);
  }

  /**
   * WARNING: Heroku labels this API as in DEVELOPMENT
   * https://devcenter.heroku.com/articles/platform-api-reference#team-app-list-by-team
   */
  getTeamApps(teamId: string): Promise<HerokuTeamApp[]> {
    return this.request(`/teams/${teamId}/apps`);
  }

  /**
   * Heroku labels this API as in PRODUCTION
   * https://devcenter.heroku.com/articles/platform-api-reference#add-on-list-by-app
   */
  getAppAddons(appid: string): Promise<HerokuAppAddon[]> {
    return this.request(`/apps/${appid}/addons`);
  }
}
