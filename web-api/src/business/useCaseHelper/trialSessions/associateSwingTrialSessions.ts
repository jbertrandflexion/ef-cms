import { NotFoundError } from '../../../errors/errors';
import {
  ROLE_PERMISSIONS,
  isAuthorized,
} from '../../../../../shared/src/authorization/authorizationClientService';
import { ServerApplicationContext } from '@web-api/applicationContext';
import { TrialSession } from '../../../../../shared/src/business/entities/trialSessions/TrialSession';
import { UnauthorizedError } from '@web-api/errors/errors';

/**
 * associateSwingTrialSessions
 *
 * @param {object} applicationContext the application context
 * @param {object} providers the providers object
 * @param {string} providers.swingSessionId the id of the trial session to add as a swing session
 * @param {string} providers.trialSession the trial session to add the swing session to
 * @returns {Object} the updated trial session object
 */
export const associateSwingTrialSessions = async (
  applicationContext: ServerApplicationContext,
  {
    swingSessionId,
    trialSessionEntity,
  }: { swingSessionId: string; trialSessionEntity: TrialSession },
) => {
  const user = applicationContext.getCurrentUser();

  if (!isAuthorized(user, ROLE_PERMISSIONS.TRIAL_SESSIONS)) {
    throw new UnauthorizedError('Unauthorized');
  }

  const swingTrialSession = await applicationContext
    .getPersistenceGateway()
    .getTrialSessionById({
      applicationContext,
      trialSessionId: swingSessionId,
    });

  if (!swingTrialSession) {
    throw new NotFoundError(`Trial session ${swingSessionId} was not found.`);
  }

  const swingSessionEntity = new TrialSession(swingTrialSession, {
    applicationContext,
  });

  trialSessionEntity.setAsSwingSession(swingSessionId);
  swingSessionEntity.setAsSwingSession(trialSessionEntity.trialSessionId);

  await applicationContext.getPersistenceGateway().updateTrialSession({
    applicationContext,
    trialSessionToUpdate: swingSessionEntity.validate().toRawObject(),
  });

  return trialSessionEntity.validate().toRawObject();
};
