import {
  CASE_TYPES_MAP,
  CONTACT_TYPES,
  COUNTRY_TYPES,
  PARTY_TYPES,
  ROLES,
  SERVICE_INDICATOR_TYPES,
} from '../../../../../shared/src/business/entities/EntityConstants';
import { MOCK_CASE } from '../../../../../shared/src/test/mockCase';
import { applicationContext } from '../../../../../shared/src/business/test/createTestApplicationContext';
import { associateIrsPractitionerWithCaseInteractor } from './associateIrsPractitionerWithCaseInteractor';

describe('associateIrsPractitionerWithCaseInteractor', () => {
  let caseRecord = {
    caseCaption: 'Caption',
    caseType: CASE_TYPES_MAP.deficiency,
    docketEntries: MOCK_CASE.docketEntries,
    docketNumber: '123-19',
    filingType: 'Myself',
    partyType: PARTY_TYPES.petitioner,
    petitioners: [
      {
        address1: '123 Main St',
        city: 'Somewhere',
        contactType: CONTACT_TYPES.primary,
        countryType: COUNTRY_TYPES.DOMESTIC,
        email: 'fieri@example.com',
        name: 'Guy Fieri',
        phone: '1234567890',
        postalCode: '12345',
        state: 'CA',
      },
    ],
    preferredTrialCity: 'Fresno, California',
    procedureType: 'Regular',
    userId: 'e8577e31-d6d5-4c4a-adc6-520075f3dde5',
  };

  let mockCurrentUser;
  let mockUserById;

  beforeAll(() => {
    applicationContext.getCurrentUser.mockImplementation(() => mockCurrentUser);

    applicationContext
      .getPersistenceGateway()
      .getUserById.mockImplementation(() => mockUserById);

    applicationContext
      .getPersistenceGateway()
      .getCaseByDocketNumber.mockImplementation(() => caseRecord);
  });

  it('should throw an error when not authorized', async () => {
    mockCurrentUser = {};

    await expect(
      associateIrsPractitionerWithCaseInteractor(applicationContext, {
        docketNumber: caseRecord.docketNumber,
        serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
        userId: 'c54ba5a9-b37b-479d-9201-067ec6e335bb',
      }),
    ).rejects.toThrow('Unauthorized');
  });

  it('should add mapping for an irsPractitioner', async () => {
    mockCurrentUser = {
      barNumber: 'BN1234',
      name: 'Emmett Lathrop "Doc" Brown, Ph.D.',
      role: ROLES.adc,
      userId: 'c54ba5a9-b37b-479d-9201-067ec6e335bb',
    };
    mockUserById = {
      barNumber: 'BN1234',
      name: 'Emmett Lathrop "Doc" Brown, Ph.D.',
      role: ROLES.irsPractitioner,
      userId: 'c54ba5a9-b37b-479d-9201-067ec6e335bb',
    };
    applicationContext
      .getPersistenceGateway()
      .verifyCaseForUser.mockReturnValue(false);

    await associateIrsPractitionerWithCaseInteractor(applicationContext, {
      docketNumber: caseRecord.docketNumber,
      serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
      userId: 'c54ba5a9-b37b-479d-9201-067ec6e335bb',
    });

    expect(
      applicationContext.getPersistenceGateway().updateCase,
    ).toHaveBeenCalled();
  });
});
