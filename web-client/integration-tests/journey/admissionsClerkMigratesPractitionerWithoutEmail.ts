import { applicationContextForClient as applicationContext } from '@web-client/test/createClientTestApplicationContext';
import { faker } from '@faker-js/faker';
import { refreshElasticsearchIndex } from '../helpers';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const { SERVICE_INDICATOR_TYPES } = applicationContext.getConstants();

faker.seed(faker.number.int());

const axiosInstance = axios.create({
  headers: {
    Authorization:
      // mocked admissions clerk user
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWlzc2lvbnNjbGVya0BleGFtcGxlLmNvbSIsIm5hbWUiOiJUZXN0IEFkbWlzc2lvbnMgQ2xlcmsiLCJyb2xlIjoiYWRtaXNzaW9uc2NsZXJrIiwic2VjdGlvbiI6ImFkbWlzc2lvbnMiLCJ1c2VySWQiOiI5ZDdkNjNiNy1kN2E1LTQ5MDUtYmE4OS1lZjcxYmYzMDA1N2YiLCJjdXN0b206cm9sZSI6ImFkbWlzc2lvbnNjbGVyayIsInN1YiI6IjlkN2Q2M2I3LWQ3YTUtNDkwNS1iYTg5LWVmNzFiZjMwMDU3ZiIsImlhdCI6MTYwOTQ0NTUyNn0.kow3pAUloDseD3isrxgtKBpcKsjMktbRBzY41c1NRqA',
    'Content-Type': 'application/json',
  },
  timeout: 2000,
});

const mockUserId = uuidv4();
const mockBarNumber = `ZZ${faker.number.int({ max: 9999, min: 1000 })}`;

const practitionerWithoutEmail = {
  user: {
    admissionsDate: '1991-01-11',
    admissionsStatus: 'Active',
    barNumber: mockBarNumber,
    birthYear: 1970,
    contact: {
      address1: 'Suite 111 1st Floor',
      address2: '123 Main Street',
      address3: null,
      city: 'Somewhere',
      countryType: 'domestic',
      phone: '1234567890',
      postalCode: '48839',
      state: 'TN',
    },
    day: '11',
    entityName: 'Practitioner',
    firstName: 'Test',
    lastName: 'Practitioner',
    middleName: 'V.',
    month: '1',
    name: 'Test V. Practitioner',
    originalBarState: 'TN',
    practiceType: 'Private',
    practitionerType: 'Attorney',
    role: 'privatePractitioner',
    section: 'privatePractitioner',
    serviceIndicator: SERVICE_INDICATOR_TYPES.SI_PAPER,
    userId: mockUserId,
    year: '1991',
  },
};

export const admissionsClerkMigratesPractitionerWithoutEmail = cerebralTest => {
  return it('Admissions Clerk migrates practitioner without email', async () => {
    await axiosInstance.post(
      'http://localhost:4000/practitioners',
      practitionerWithoutEmail,
    );

    cerebralTest.barNumber = practitionerWithoutEmail.user.barNumber;

    await refreshElasticsearchIndex();
  });
};
