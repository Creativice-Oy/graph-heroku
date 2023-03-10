import {
  IntegrationStep,
  createIntegrationEntity,
  Entity,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import { HerokuClient } from '../../heroku';
import { HerokuIntegrationConfig } from '../../types';

export const STEP_ID = 'fetch-enterprise-accounts';
export const ACCOUNT_TYPE = 'heroku_account';

const step: IntegrationStep<HerokuIntegrationConfig> = {
  id: STEP_ID,
  name: 'Fetch Enterprise Accounts',
  entities: [
    {
      resourceName: 'Enterprise Account',
      _type: ACCOUNT_TYPE,
      _class: 'Account',
    },
  ],
  relationships: [],
  async executionHandler({ logger, instance, jobState }) {
    const heroku = new HerokuClient(instance.config);

    logger.info('Calling /enterprise-accounts API...');
    const enterpriseAccounts = await heroku.getEnterpriseAccounts();

    await jobState.addEntities(enterpriseAccounts.map(createAccountEntity));
  },
};

export default step;

interface EnterpriseAccount {
  id: string;
  created_at: string;
  updated_at: string;
}

export function createAccountEntity(
  enterpriseAccount: EnterpriseAccount,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: enterpriseAccount,
      assign: {
        _key: enterpriseAccount.id,
        _type: ACCOUNT_TYPE,
        _class: 'Account',
        id: enterpriseAccount.id,
        createdOn: parseTimePropertyValue(enterpriseAccount.created_at),
        updatedOn: parseTimePropertyValue(enterpriseAccount.updated_at),
      },
    },
  });
}
