import { put } from '../requests';

/**
 * removeCaseFromTrialInteractor
 *
 * @param {object} applicationContext the application context
 * @param {object} providers the providers object
 * @param {string} providers.docketNumber the docket number of the case to remove from trial
 * @param {string} providers.disposition the reason the case is being removed from trial
 * @param {string} providers.trialSessionId the id of the trial session containing the case to set to removedFromTrial
 * @returns {Promise<*>} the promise of the api call
 */
export const removeCaseFromTrialInteractor = (
  applicationContext,
  {
    associatedJudge,
    associatedJudgeId,
    caseStatus,
    disposition,
    docketNumber,
    trialSessionId,
  },
) => {
  return put({
    applicationContext,
    body: { associatedJudge, associatedJudgeId, caseStatus, disposition },
    endpoint: `/trial-sessions/${trialSessionId}/remove-case/${docketNumber}`,
  });
};
