import { Message } from '../../../../../shared/src/business/entities/Message';
import {
  ROLE_PERMISSIONS,
  isAuthorized,
} from '../../../../../shared/src/authorization/authorizationClientService';
import { ServerApplicationContext } from '@web-api/applicationContext';
import { UnauthorizedError } from '@web-api/errors/errors';

/**
 * gets a message thread by parent id
 *
 * @param {object} applicationContext the application context
 * @param {object} providers the providers object
 * @param {string} providers.parentMessageId the id of the parent message for the thread
 * @returns {object} the message
 */
export const getMessageThreadInteractor = async (
  applicationContext: ServerApplicationContext,
  { parentMessageId }: { parentMessageId: string },
) => {
  const authorizedUser = applicationContext.getCurrentUser();

  if (!isAuthorized(authorizedUser, ROLE_PERMISSIONS.VIEW_MESSAGES)) {
    throw new UnauthorizedError('Unauthorized');
  }

  const messages = await applicationContext
    .getPersistenceGateway()
    .getMessageThreadByParentId({
      applicationContext,
      parentMessageId,
    });

  return Message.validateRawCollection(messages, {
    applicationContext,
  });
};
