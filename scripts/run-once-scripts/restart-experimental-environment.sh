#!/bin/bash -e

export ENV=$1
export REGION=us-east-1

# Getting the account-wide deployment settings and injecting them into the shell environment
# shellcheck disable=SC1091
. ./scripts/load-environment-from-secrets.sh
export SECRETS_LOADED=true

# Setting up calculated environment variables
DESTINATION_TABLE=$(./scripts/dynamo/get-destination-table.sh "${ENV}")
## we use the current-color from dynamo but name the variable DEPLOYING_COLOR since it's needed in the import judge script
DEPLOYING_COLOR=$(aws dynamodb get-item \
 --region us-east-1 \
 --table-name "efcms-deploy-${ENV}" \
 --key '{"pk":{"S":"current-color"},"sk":{"S":"current-color"}}' | jq -r ".Item.current.S")
export DESTINATION_TABLE
export DEPLOYING_COLOR

./check-env-variables.sh \
  "ENV" \
  "DESTINATION_TABLE" \
  "USTC_ADMIN_PASS" \
  "USTC_ADMIN_USER" \
  "REGION" \
  "DEFAULT_ACCOUNT_PASS" \
  "DEPLOYING_COLOR" \

export CI=true

# Deploying the API because this is what creates the elasticsearch domains we need as the first step
npm run deploy:api "${ENV}"

# Setting up indices
./web-api/setup-elasticsearch-index.sh "${ENV}"
npx ts-node --transpile-only ./web-api/elasticsearch/elasticsearch-alias-settings.ts

# Indexing data
npx ts-node --transpile-only ./web-api/reindex-dynamodb-records.ts "${DESTINATION_TABLE}"

# Setting up users
# shellcheck disable=SC1091
npx ts-node --transpile-only scripts/user/setup-test-users.ts

# Setting up Judge users
npx ts-node --transpile-only ./scripts/circleci/judge/bulkImportJudgeUsers.ts

unset CI
unset SECRETS_LOADED
