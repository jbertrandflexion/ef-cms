import { DeleteRequest } from '@web-api/persistence/dynamo/dynamoTypes';
import { batchWrite, getDocumentClient } from '../dynamo/getDynamoCypress';
import { getCognito } from './getCognitoCypress';
import { getCypressEnv } from '../../env/cypressEnvironment';

export const DEFAULT_FORGOT_PASSWORD_CODE = '385030';

export const confirmUser = async ({ email }: { email: string }) => {
  const userPoolId = await getUserPoolId();
  const clientId = await getClientId(userPoolId);

  const initAuthResponse = await getCognito().adminInitiateAuth({
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    AuthParameters: {
      PASSWORD: getCypressEnv().defaultAccountPass,
      USERNAME: email.toLowerCase(),
    },
    ClientId: clientId,
    UserPoolId: userPoolId,
  });

  if (initAuthResponse.Session) {
    await getCognito().adminRespondToAuthChallenge({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      ChallengeResponses: {
        NEW_PASSWORD: getCypressEnv().defaultAccountPass,
        USERNAME: email.toLowerCase(),
      },
      ClientId: clientId,
      Session: initAuthResponse.Session,
      UserPoolId: userPoolId,
    });
  }

  return null;
};

const getClientId = async (userPoolId: string): Promise<string> => {
  const results = await getCognito().listUserPoolClients({
    MaxResults: 60,
    UserPoolId: userPoolId,
  });
  const clientId = results?.UserPoolClients?.[0].ClientId;
  if (!clientId) {
    throw new Error(`Could not find clientIdd for userPool: ${userPoolId}`);
  }
  return clientId;
};

const getUserPoolId = async (): Promise<string> => {
  const results = await getCognito().listUserPools({
    MaxResults: 50,
  });
  const userPoolId = results?.UserPools?.find(
    pool => pool.Name === `efcms-${getCypressEnv().env}`,
  )?.Id;

  if (!userPoolId) {
    throw new Error('Could not get userPoolId');
  }
  return userPoolId;
};

export const getCognitoUserIdByEmail = async (
  email: string,
): Promise<string> => {
  const userPoolId = await getUserPoolId();
  const foundUser = await getCognito().adminGetUser({
    UserPoolId: userPoolId,
    Username: email.toLowerCase(),
  });

  const userId = foundUser.UserAttributes?.find(
    element => element.Name === 'custom:userId',
  )?.Value!;

  return userId;
};

const deleteAccount = async (
  user: { userId: string; email: string },
  userPoolId: string,
): Promise<void> => {
  const params = {
    UserPoolId: userPoolId,
    Username: user.email.toLowerCase(),
  };
  await getCognito().adminDeleteUser(params);

  const userRecords = await getDocumentClient().query({
    ExpressionAttributeNames: {
      '#pk': 'pk',
    },
    ExpressionAttributeValues: {
      ':pk': `user|${user.userId}`,
    },
    KeyConditionExpression: '#pk = :pk ',
    TableName: getCypressEnv().dynamoDbTableName,
  });

  const userRecord = userRecords.Items?.find(record => {
    return record.sk === `user|${user.userId}`;
  });

  const deleteRequests: DeleteRequest[] = [];
  if (userRecord) {
    deleteRequests.push({
      DeleteRequest: {
        Key: {
          pk: `user-email|${userRecord.email}`,
          sk: `user|${user.userId}`,
        },
      },
    });

    deleteRequests.push({
      DeleteRequest: {
        Key: {
          pk: `privatePractitioner|${userRecord.barNumber}`,
          sk: `user|${user.userId}`,
        },
      },
    });
    deleteRequests.push({
      DeleteRequest: {
        Key: {
          pk: `privatePractitioner|${userRecord.name}`,
          sk: `user|${user.userId}`,
        },
      },
    });

    userRecords.Items?.map(record =>
      deleteRequests.push({
        DeleteRequest: {
          Key: {
            pk: record.pk,
            sk: record.sk,
          },
        },
      }),
    );

    await batchWrite(deleteRequests);
  }
};

const getAllCypressTestAccounts = async (
  userPoolId: string,
): Promise<{ email: string; userId: string }[]> => {
  const params = {
    Filter: 'email ^= "cypress_test_account"',
    UserPoolId: userPoolId,
  };

  const result = await getCognito().listUsers(params);
  if (!result || !result.Users) return [];

  const usernames = result.Users.map(user => {
    const userId = user.Attributes?.find(
      element => element.Name === 'custom:userId',
    )?.Value!;
    const email = user.Attributes?.find(
      element => element.Name === 'email',
    )?.Value!;

    return {
      email,
      userId,
    };
  });

  return usernames;
};

export const deleteAllCypressTestAccounts = async (): Promise<null> => {
  const userPoolId = await getUserPoolId();
  if (!userPoolId) return null;
  const accounts = await getAllCypressTestAccounts(userPoolId);
  await Promise.all(accounts.map(user => deleteAccount(user, userPoolId)));
  return null;
};
