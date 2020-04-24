import {
  IntegrationStep,
  IntegrationStepExecutionContext,
  Entity,
  Relationship,
  createIntegrationRelationship,
  JobState,
} from '@jupiterone/integration-sdk';
import {
  STEP_ID as MEMBER_STEP,
  ACCOUNT_MEMBER_TYPE,
} from '../fetch-enterprise-account-members';
import {
  STEP_ID as TEAM_STEP,
  TEAM_TYPE,
} from '../fetch-enterprise-account-teams';
import { HerokuClient } from '../../heroku';

const step: IntegrationStep = {
  id: 'build-account-to-member-relationships',
  name: 'Build Account-to-Member Relationships',
  types: [],
  dependsOn: [TEAM_STEP, MEMBER_STEP],
  async executionHandler({
    instance,
    jobState,
  }: IntegrationStepExecutionContext) {
    const heroku = new HerokuClient(instance.config);

    const userIdMap = await createUserIdMap(jobState);

    await jobState.iterateEntities({ _type: TEAM_TYPE }, async (team) => {
      const teamMembers = await heroku.getTeamMembers(team.id as string);

      for (const teamMember of teamMembers) {
        const userId = teamMember.user ? teamMember.user.id : null;
        const user = userIdMap.get(userId);

        if (user) {
          await jobState.addRelationships([
            createTeamToMemberRelationship(team, user, teamMember.role),
          ]);
        }
      }
    });
  },
};

export default step;

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

export function createTeamToMemberRelationship(
  team: Entity,
  user: Entity,
  role: string,
): Relationship {
  return createIntegrationRelationship({
    _class: 'HAS',
    from: team,
    to: user,
    properties: { role },
  });
}
