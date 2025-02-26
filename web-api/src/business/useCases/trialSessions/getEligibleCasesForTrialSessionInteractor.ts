import { EligibleCase } from '../../../../../shared/src/business/entities/cases/EligibleCase';
import { NotFoundError } from '../../../errors/errors';
import {
  ROLE_PERMISSIONS,
  isAuthorized,
} from '../../../../../shared/src/authorization/authorizationClientService';
import { ServerApplicationContext } from '@web-api/applicationContext';
import {
  type TCaseOrder,
  TrialSession,
} from '../../../../../shared/src/business/entities/trialSessions/TrialSession';
import { TRIAL_SESSION_ELIGIBLE_CASES_BUFFER } from '../../../../../shared/src/business/entities/EntityConstants';
import { UnauthorizedError } from '@web-api/errors/errors';

/**
 * get eligible cases for trial session
 *
 * @param {object} applicationContext the application context
 * @param {object} providers the providers object
 * @param {string} providers.trialSessionId the id of the trial session to get the eligible cases
 * @returns {Promise} the promise of the getEligibleCasesForTrialSession call
 */
export const getEligibleCasesForTrialSessionInteractor = async (
  applicationContext: ServerApplicationContext,
  { trialSessionId }: { trialSessionId: string },
) => {
  const user = applicationContext.getCurrentUser();

  if (!isAuthorized(user, ROLE_PERMISSIONS.TRIAL_SESSIONS)) {
    throw new UnauthorizedError('Unauthorized');
  }

  const trialSession = await applicationContext
    .getPersistenceGateway()
    .getTrialSessionById({
      applicationContext,
      trialSessionId,
    });

  if (!trialSession) {
    throw new NotFoundError(`Trial session ${trialSessionId} was not found.`);
  }

  // Some manually added cases are considered calendared even when the
  // trial session itself is not considered calendared (see issue #3254).
  let calendaredCases: (RawCase & TCaseOrder)[] = [];
  if (trialSession.isCalendared === false && trialSession.caseOrder) {
    calendaredCases = await applicationContext
      .getPersistenceGateway()
      .getCalendaredCasesForTrialSession({
        applicationContext,
        trialSessionId,
      });
  }

  const trialSessionEntity = new TrialSession(trialSession, {
    applicationContext,
  });

  trialSessionEntity.validate();

  const eligibleCases = await applicationContext
    .getPersistenceGateway()
    .getEligibleCasesForTrialSession({
      applicationContext,
      limit:
        trialSessionEntity.maxCases! +
        TRIAL_SESSION_ELIGIBLE_CASES_BUFFER -
        calendaredCases.length,
      skPrefix: trialSessionEntity.generateSortKeyPrefix(),
    });

  let eligibleCasesFiltered = calendaredCases
    .concat(eligibleCases)
    .map(rawCase => {
      return new EligibleCase(rawCase).validate().toRawObject();
    });

  return eligibleCasesFiltered;
};
