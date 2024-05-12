import {
  ROLES,
  Role,
} from '../../../../../shared/src/business/entities/EntityConstants';
import { RawUser } from '@shared/business/entities/User';
import { ServerApplicationContext } from '@web-api/applicationContext';

export const createOrUpdatePractitionerUser = async ({
  applicationContext,
  user,
}: {
  applicationContext: ServerApplicationContext;
  user: Omit<RawUser, 'userId'>;
}) => {
  let userId = applicationContext.getUniqueId();
  const practitionerRoleTypes: Role[] = [
    ROLES.privatePractitioner,
    ROLES.irsPractitioner,
    ROLES.inactivePractitioner,
  ];

  if (!practitionerRoleTypes.includes(user.role)) {
    throw new Error(
      `Role must be ${ROLES.privatePractitioner}, ${ROLES.irsPractitioner}, or ${ROLES.inactivePractitioner}`,
    );
  }

  const userEmail = user.email || user.pendingEmail;

  if (userEmail) {
    const existingUser = await applicationContext
      .getUserGateway()
      .getUserByEmail(applicationContext, {
        email: userEmail,
      });

    if (!existingUser) {
      await applicationContext.getUserGateway().createUser(applicationContext, {
        email: userEmail,
        name: user.name,
        role: user.role,
        sendWelcomeEmail: true,
        userId,
      });
    } else {
      await applicationContext.getUserGateway().updateUser(applicationContext, {
        attributesToUpdate: {
          role: user.role,
        },
        email: userEmail,
      });

      // eslint-disable-next-line prefer-destructuring
      userId = existingUser.userId;
    }
  }

  return await applicationContext.getPersistenceGateway().createUserRecords({
    applicationContext,
    user,
    userId,
  });
};
