import { IrsPractitioner } from '../../../../../shared/src/business/entities/IrsPractitioner';
import {
  ROLE_PERMISSIONS,
  isAuthorized,
} from '../../../../../shared/src/authorization/authorizationClientService';
import { ServerApplicationContext } from '@web-api/applicationContext';
import { UnauthorizedError } from '@web-api/errors/errors';

/**
 * getIrsPractitionersBySearchKeyInteractor
 *
 * @param {object} applicationContext the application context
 * @param {object} params the params object
 * @param {string} params.searchKey the search string entered by the user
 * @returns {*} the result
 */
export const getIrsPractitionersBySearchKeyInteractor = async (
  applicationContext: ServerApplicationContext,
  { searchKey }: { searchKey: string },
) => {
  const authenticatedUser = applicationContext.getCurrentUser();

  if (
    !isAuthorized(authenticatedUser, ROLE_PERMISSIONS.ASSOCIATE_USER_WITH_CASE)
  ) {
    throw new UnauthorizedError('Unauthorized');
  }

  const users = await applicationContext
    .getPersistenceGateway()
    .getUsersBySearchKey({
      applicationContext,
      searchKey,
      type: 'irsPractitioner',
    });

  return IrsPractitioner.validateRawCollection(users, {
    applicationContext,
  });
};
