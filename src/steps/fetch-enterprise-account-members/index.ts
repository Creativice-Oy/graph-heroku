import {
  IntegrationStep,
  createIntegrationEntity,
  Entity,
  parseTimePropertyValue,
} from '@jupiterone/integration-sdk-core';
import { HerokuClient } from '../../heroku';
import {
  STEP_ID as ACCOUNT_STEP,
  ACCOUNT_TYPE,
} from '../fetch-enterprise-accounts';
import { HerokuIntegrationConfig } from '../../types';
import { HerokuEnterpriseAccountMember } from '../../types/herokuTypes';
export const STEP_ID = 'fetch-account-members';
export const ACCOUNT_MEMBER_TYPE = 'heroku_account_member';

const step: IntegrationStep<HerokuIntegrationConfig> = {
  id: STEP_ID,
  name: 'Fetch account members',
  entities: [
    {
      resourceName: 'User',
      _type: ACCOUNT_MEMBER_TYPE,
      _class: 'User',
    },
  ],
  relationships: [],
  dependsOn: [ACCOUNT_STEP],
  async executionHandler({ logger, instance, jobState }) {
    const heroku = new HerokuClient(instance.config);

    logger.info('Calling /enterprise-accounts/:id/members API...');
    await jobState.iterateEntities({ _type: ACCOUNT_TYPE }, async (account) => {
      const members = await heroku.getEnterpriseAccountMembers(
        account.id as string,
      );

      await jobState.addEntities(
        members.map((member) =>
          createAccountMemberEntity(member, account.id as string),
        ),
      );
    });
  },
};

export default step;

export function createAccountMemberEntity(
  member: HerokuEnterpriseAccountMember,
  accountId: string,
): Entity {
  return createIntegrationEntity({
    entityData: {
      source: member,
      assign: {
        _key: member.user.id,
        _type: ACCOUNT_MEMBER_TYPE,
        _class: 'User',
        id: member.user.id,
        createdOn: parseTimePropertyValue(member.created_at),
        updatedOn: parseTimePropertyValue(member.updated_at),
        enterpriseAccountId: accountId,
        username: member.user.email,
        name: member.user.email,
      },
    },
  });
}
