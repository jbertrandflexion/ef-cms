import { Case } from '../../../../../shared/src/business/entities/cases/Case';
import { CaseDeadline } from '../../../../../shared/src/business/entities/CaseDeadline';
import {
  ROLE_PERMISSIONS,
  isAuthorized,
} from '../../../../../shared/src/authorization/authorizationClientService';
import { ServerApplicationContext } from '@web-api/applicationContext';
import { UnauthorizedError } from '@web-api/errors/errors';
import { withLocking } from '@web-api/business/useCaseHelper/acquireLock';

export const createCaseDeadline = async (
  applicationContext: ServerApplicationContext,
  { caseDeadline }: { caseDeadline: CaseDeadline },
) => {
  const user = applicationContext.getCurrentUser();

  if (!isAuthorized(user, ROLE_PERMISSIONS.CASE_DEADLINE)) {
    throw new UnauthorizedError('Unauthorized for create case deadline');
  }

  const caseDetail = await applicationContext
    .getPersistenceGateway()
    .getCaseByDocketNumber({
      applicationContext,
      docketNumber: caseDeadline.docketNumber,
    });
  let caseEntity = new Case(caseDetail, { applicationContext });

  const newCaseDeadline = new CaseDeadline(
    {
      ...caseDeadline,
      associatedJudge: caseEntity.associatedJudge,
      associatedJudgeId: caseEntity.associatedJudgeId,
    },
    {
      applicationContext,
    },
  );

  await applicationContext.getPersistenceGateway().createCaseDeadline({
    applicationContext,
    caseDeadline: newCaseDeadline.validate().toRawObject(),
  });

  caseEntity = await applicationContext
    .getUseCaseHelpers()
    .updateCaseAutomaticBlock({
      applicationContext,
      caseEntity,
    });

  await applicationContext.getUseCaseHelpers().updateCaseAndAssociations({
    applicationContext,
    caseToUpdate: caseEntity,
  });

  return newCaseDeadline;
};

export const createCaseDeadlineInteractor = withLocking(
  createCaseDeadline,
  (_applicationContext, { caseDeadline }) => ({
    identifiers: [`case|${caseDeadline.docketNumber}`],
  }),
);
