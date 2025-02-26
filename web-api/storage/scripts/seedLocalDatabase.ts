import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { chunk } from 'lodash';
import { createApplicationContext } from '@web-api/applicationContext';
import { createUsers } from './createUsers';
import { seedEntries } from '../fixtures/seed';
import { migrateItems as validationMigration } from '../../src/lambdas/migration/migrations/0000-validate-all-items';

Error.stackTraceLimit = Infinity;
const applicationContext = createApplicationContext({});

export const putEntries = async entries => {
  const client = new DynamoDBClient({
    credentials: {
      accessKeyId: 'S3RVER',
      secretAccessKey: 'S3RVER',
    },
    endpoint: 'http://localhost:8000',
    region: 'us-east-1',
  });

  const docClient = DynamoDBDocumentClient.from(client);

  const chunks = chunk(entries, 25);

  await Promise.all(
    chunks.map(async aChunk => {
      try {
        validationMigration(aChunk, applicationContext);
      } catch (e) {
        console.log('Seed data is invalid, exiting.', e);
        process.exit(1);
      }

      const putRequests = aChunk.map(item => ({
        PutRequest: {
          Item: item,
        },
      }));

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            ['efcms-local']: putRequests as any,
          },
        }),
      );
    }),
  );
};

export const seedLocalDatabase = async (entriesOverride: any) => {
  await createUsers(); // TODO: we should probably remove this at some point
  await putEntries(entriesOverride ?? seedEntries);
};
