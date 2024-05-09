#!/bin/bash

# this should only be ran from inside a container built from our `Dockerfile-integration`

mkdir /tmp/web-client/

CI=true \
AWS_ACCESS_KEY_ID=S3RVER \
AWS_SECRET_ACCESS_KEY=S3RVER \
npm run start:api:ci > /tmp/web-client/server-output.txt &
URL=http://localhost:4000/api/swagger ./wait-until.sh
URL=http://localhost:9200 ./wait-until.sh
URL=http://0.0.0.0:9001/ ./wait-until.sh
sleep 20 # figure out why we need to sleep here since we wait above ^

# can specify which tests you want to run here
npm run test:file web-client/integration-tests/noticeOfChangeOfAddressQCJourney.test.js
