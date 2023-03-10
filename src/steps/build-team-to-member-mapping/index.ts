import {
  IntegrationStep,
  Entity,
  createDirectRelationship,
  JobState,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import {
  STEP_ID as MEMBER_STEP,
  ACCOUNT_MEMBER_TYPE,
} from '../fetch-enterprise-account-members';
import {
  STEP_ID as TEAM_STEP,
  TEAM_TYPE,
} from '../fetch-enterprise-account-teams';
import { HerokuClient } from '../../heroku';
import { HerokuIntegrationConfig } from '../../types';
import { HerokuTeamMember } from '../../types/herokuTypes';

const step: IntegrationStep<HerokuIntegrationConfig> = {
  id: 'build-team-to-member-relationships',
  name: 'Build Team-to-Member Relationships',
  entities: [],
  relationships: [
    {
      _type: 'heroku_team_has_account_member',
      sourceType: TEAM_TYPE,
      _class: RelationshipClass.HAS,
      targetType: ACCOUNT_MEMBER_TYPE,
    },
  ],
  dependsOn: [TEAM_STEP, MEMBER_STEP],
  async executionHandler(context) {
    const { instance, jobState, logger } = context;

    const heroku = new HerokuClient(instance.config);
    const userIdMap = await createUserIdMap(jobState);
    const teamEntities = await collectTeamEntities(jobState);

    logger.info(
      {
        numTeamEntities: teamEntities.length,
      },
      'Total teams to fetch members for',
    );

    for (const teamEntity of teamEntities) {
      try {
        const teamMembers = await heroku.getTeamMembers(
          teamEntity.id as string,
        );

        logger.info(
          {
            numTeamMembers: teamMembers.length,
          },
          'Successfully fetched team members',
        );

        await createTeamHasUserRelationships({
          userIdMap,
          teamMembers,
          teamEntity: teamEntity,
          jobState,
        });
      } catch (err) {
        if (err.code === 'PROVIDER_AUTHORIZATION_ERROR') {
          logger.publishEvent({
            name: 'missing_scope',
            description: `Could not fetch team members. Missing required OAuth scope (endpoint=${err.endpoint}, scope=global)`,
          });

          return;
        }

        throw err;
      }
    }
  },
};

async function collectTeamEntities(jobState: JobState): Promise<Entity[]> {
  const teamEntities: Entity[] = [];

  await jobState.iterateEntities(
    {
      _type: TEAM_TYPE,
    },
    async (teamEntity) => {
      teamEntities.push(teamEntity);
    },
  );

  return teamEntities;
}

async function createTeamHasUserRelationships({
  userIdMap,
  teamMembers,
  teamEntity,
  jobState,
}: {
  userIdMap: Map<string, Entity>;
  teamMembers: HerokuTeamMember[];
  teamEntity: Entity;
  jobState: JobState;
}) {
  for (const teamMember of teamMembers) {
    const userId = teamMember.user ? teamMember.user.id : null;
    const userEntity = userIdMap.get(userId);

    if (!userEntity) {
      return;
    }

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: teamEntity,
        to: userEntity,
        properties: { role: teamMember.role },
      }),
    );
  }
}

async function createUserIdMap(
  jobState: JobState,
): Promise<Map<string, Entity>> {
  const userIdMap = new Map<string, Entity>();
  await jobState.iterateEntities({ _type: ACCOUNT_MEMBER_TYPE }, (user) => {
    // unfortunately need to cast because of EntityPropertyValue type
    userIdMap.set(user.id as string, user);
  });
  return userIdMap;
}

export default step;
