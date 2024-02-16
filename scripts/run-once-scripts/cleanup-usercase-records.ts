/**
 * To run: npx ts-node --transpile-only scripts/run-once-scripts/cleanup-usercase-records.ts
 */
import {
  BatchWriteCommandOutput,
  DynamoDBDocument,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  IServerApplicationContext,
  createApplicationContext,
} from '../../web-api/src/applicationContext';
import {
  PutRequest,
  TDynamoRecord,
} from '../../web-api/src/persistence/dynamo/dynamoTypes';
import { UserCase } from '../../shared/src/business/entities/UserCase';
import { chunk, isEmpty } from 'lodash';
import { filterEmptyStrings } from '../../shared/src/business/utilities/filterEmptyStrings';

const dynamodb = new DynamoDBClient({ maxAttempts: 0, region: 'us-east-1' });
const documentClient = DynamoDBDocument.from(dynamodb, {
  marshallOptions: { removeUndefinedValues: true },
});

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  const applicationContext = createApplicationContext({});

  console.time('es query');
  const users = await getAllExternalUsers(applicationContext);
  console.timeEnd('es query');

  const migratedRecords: TDynamoRecord[] = [];

  console.time('dynamo query');
  await Promise.all(
    users.map(async user => {
      const userId = user._source.pk.S.split('|')[1];

      const userCaseRecords = await getUserCaseRecords(
        applicationContext,
        userId,
      );

      if (isEmpty(userCaseRecords)) {
        return;
      }

      const migratedUserCaseRecords = cleanupUserCaseRecords(userCaseRecords);

      migratedRecords.push(...migratedUserCaseRecords);
    }),
  );
  console.timeEnd('dynamo query');

  console.time('dynamo batchWrite');
  await updateUserCaseRecords(applicationContext, migratedRecords);
  console.timeEnd('dynamo batchWrite');
})();

async function getAllExternalUsers(
  applicationContext: IServerApplicationContext,
) {
  const users = [];
  let role: string = '';
  let pk: string = '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = {
      _source: ['pk', 'role'],
      body: {
        query: {
          bool: {
            must: [
              {
                terms: {
                  'role.S': [
                    'petitioner',
                    'privatePractitioner',
                    'irsPractitioner',
                    'inactivePractitioner',
                  ],
                },
              },
            ],
          },
        },
        search_after: [role, pk],
        sort: [{ 'role.S': 'asc' }, { 'pk.S': 'asc' }],
      },
      index: 'efcms-user',
      size: 10000,
      track_total_hits: true,
    };

    const results = await applicationContext.getSearchClient().search(query);

    users.push(...results.body.hits.hits);

    if (isEmpty(results.body.hits.hits)) {
      return users;
    }

    const lastUser =
      results.body.hits.hits?.[results.body.hits.hits.length - 1];
    role = lastUser.sort[0];
    pk = lastUser.sort[1];
  }
}

async function getUserCaseRecords(
  applicationContext: IServerApplicationContext,
  userId: string,
): Promise<TDynamoRecord[]> {
  const userCases = await applicationContext
    .getPersistenceGateway()
    .getCasesForUser({
      applicationContext,
      userId,
    });

  return userCases;
}

function cleanupUserCaseRecords(
  userCaseRecords: TDynamoRecord[],
): TDynamoRecord[] {
  const itemsAfter: TDynamoRecord[] = [];

  for (const userCase of userCaseRecords) {
    const updated = new UserCase(userCase);
    updated.validate();

    itemsAfter.push({
      ...updated.toRawObject(),
      gsi1pk: userCase.gsi1pk,
      pk: userCase.pk,
      sk: userCase.sk,
    });
  }

  return itemsAfter;
}

async function updateUserCaseRecords(
  applicationContext: IServerApplicationContext,
  migratedRecords: TDynamoRecord[],
): Promise<void> {
  const putRequests: PutRequest[] = migratedRecords.map(userCaseRecord => {
    return {
      PutRequest: { Item: userCaseRecord },
    };
  });
  await batchWrite(applicationContext, putRequests);
}

async function batchWrite(
  applicationContext: IServerApplicationContext,
  commands: PutRequest[],
): Promise<void> {
  commands.forEach(command => filterEmptyStrings(command));

  const chunks = chunk(commands, 25);
  const parallelRequests = 10;

  for (let i = 0; i < chunks.length; i += parallelRequests) {
    await Promise.all(
      chunks
        .slice(i, i + parallelRequests)
        .map(commandChunk => writeChunk(applicationContext, commandChunk, 0)),
    );
  }

  return;
}

async function writeChunk(
  applicationContext: IServerApplicationContext,
  commandChunk: PutRequest[],
  attempt: number,
) {
  let result: BatchWriteCommandOutput;
  try {
    result = await documentClient.batchWrite({
      RequestItems: {
        [applicationContext.environment.dynamoDbTableName]: commandChunk,
      },
    });
  } catch (err) {
    const wholeError = JSON.stringify(err);
    console.log('An error occurred: ', wholeError);
    if (wholeError.includes('ThrottlingException')) {
      console.log('All requests in the chunk failed.', err);

      await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));

      return writeChunk(applicationContext, commandChunk, attempt + 1);
    }
    console.log('Unhandled Exception occurred!');
  }

  if (isEmpty(result.UnprocessedItems)) {
    console.log('Successfully processed Chunk');
    return;
  } else {
    console.log(
      'Unprocessed items: ',
      result.UnprocessedItems[applicationContext.environment.dynamoDbTableName]
        .length,
      'Attempt #',
      attempt,
    );

    await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));

    return writeChunk(
      applicationContext,
      result.UnprocessedItems[applicationContext.environment.dynamoDbTableName],
      attempt + 1,
    );
  }
}
