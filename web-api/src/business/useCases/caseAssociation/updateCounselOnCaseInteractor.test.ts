import {
  CASE_TYPES_MAP,
  CONTACT_TYPES,
  COUNTRY_TYPES,
  PARTY_TYPES,
  ROLES,
  SERVICE_INDICATOR_TYPES,
} from '../../../../../shared/src/business/entities/EntityConstants';
import { IrsPractitioner } from '../../../../../shared/src/business/entities/IrsPractitioner';
import { MOCK_CASE } from '../../../../../shared/src/test/mockCase';
import { MOCK_LOCK } from '../../../../../shared/src/test/mockLock';
import { PrivatePractitioner } from '../../../../../shared/src/business/entities/PrivatePractitioner';
import { ServiceUnavailableError } from '@web-api/errors/errors';
import { applicationContext } from '../../../../../shared/src/business/test/createTestApplicationContext';
import { updateCounselOnCaseInteractor } from './updateCounselOnCaseInteractor';

describe('updateCounselOnCaseInteractor', () => {
  const mockPrivatePractitioners = [
    new PrivatePractitioner({
      barNumber: 'BN1234',
      name: 'Saul Goodman',
      representing: ['9d914ca2-7876-43a7-acfa-ccb645717e11'],
      role: ROLES.privatePractitioner,
      userId: 'e23e2d08-561b-4930-a2e0-1f342a481268',
    }),
    new PrivatePractitioner({
      barNumber: 'BN1234',
      name: 'Saul Goodman',
      representing: ['7805d1ab-18d0-43ec-bafb-654e83405416'],
      role: ROLES.privatePractitioner,
      userId: '9d914ca2-7876-43a7-acfa-ccb645717e11',
    }),
    new PrivatePractitioner({
      barNumber: 'BN1234',
      name: 'Saul Goodman',
      role: ROLES.privatePractitioner,
      userId: '4cae261f-3653-4d2f-8d8c-31f03df62e54',
    }),
  ];

  const mockIrsPractitioners = [
    new IrsPractitioner({
      barNumber: 'BN1234',
      name: 'Saul Goodman',
      role: ROLES.irsPractitioner,
      userId: '9a4390b3-9d1a-4987-b918-312675956bcc',
    }),
    new IrsPractitioner({
      barNumber: 'BN5678',
      name: 'Saul Goodman',
      role: ROLES.irsPractitioner,
      userId: '76c86b6b-6aad-4128-8fa2-53c5735cc0af',
    }),
    new IrsPractitioner({
      barNumber: 'BN5432',
      name: 'Saul Goodman',
      role: ROLES.irsPractitioner,
      userId: 'dd60c66f-2f82-4f8f-824a-d15a3e8e49a3',
    }),
  ];

  const mockPetitioners = [
    {
      name: 'Saul Goodman',
      role: ROLES.petitioner,
      userId: 'aa335271-9a0f-4ad5-bcf1-3b89bd8b5dd6',
    },
  ];
  let mockLock;
  beforeAll(() => {
    applicationContext
      .getPersistenceGateway()
      .getLock.mockImplementation(() => mockLock);
  });

  beforeEach(() => {
    mockLock = undefined;
    applicationContext.getCurrentUser.mockReturnValue({
      name: 'Saul Goodman',
      role: ROLES.docketClerk,
      userId: '001',
    });
    applicationContext
      .getPersistenceGateway()
      .getUserById.mockImplementation(({ userId }) => {
        return mockPrivatePractitioners
          .concat(mockIrsPractitioners)
          .concat(mockPetitioners)
          .find(user => user.userId === userId);
      });
    applicationContext
      .getPersistenceGateway()
      .getCaseByDocketNumber.mockImplementation(({ docketNumber }) => ({
        caseCaption: 'Caption',
        caseType: CASE_TYPES_MAP.deficiency,
        docketEntries: MOCK_CASE.docketEntries,
        docketNumber,
        filingType: 'Myself',
        irsPractitioners: mockIrsPractitioners,
        partyType: PARTY_TYPES.petitionerSpouse,
        petitioners: [
          {
            address1: '123 Main St',
            city: 'Somewhere',
            contactId: '9d914ca2-7876-43a7-acfa-ccb645717e11',
            contactType: CONTACT_TYPES.primary,
            countryType: COUNTRY_TYPES.DOMESTIC,
            email: 'fieri@example.com',
            name: 'Guy Fieri',
            phone: '1234567890',
            postalCode: '12345',
            serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
            state: 'CA',
          },
          {
            address1: '123 Main St',
            city: 'Somewhere',
            contactId: '3d914ca2-7876-43a7-acfa-ccb645717e11',
            contactType: CONTACT_TYPES.secondary,
            countryType: COUNTRY_TYPES.DOMESTIC,
            name: 'Guy Fieri',
            phone: '1234567890',
            postalCode: '12345',
            serviceIndicator: SERVICE_INDICATOR_TYPES.SI_PAPER,
            state: 'CA',
          },
        ],
        preferredTrialCity: 'Fresno, California',
        privatePractitioners: mockPrivatePractitioners,
        procedureType: 'Regular',
        userId: 'e8577e31-d6d5-4c4a-adc6-520075f3dde5',
      }));
  });

  it('returns an unauthorized error for a petitioner user', async () => {
    applicationContext.getCurrentUser.mockReturnValue({});

    await expect(
      updateCounselOnCaseInteractor(applicationContext, {
        docketNumber: MOCK_CASE.docketNumber,
        userData: {
          representing: ['9d914ca2-7876-43a7-acfa-ccb645717e11'],
        },
        userId: '9d914ca2-7876-43a7-acfa-ccb645717e11',
      }),
    ).rejects.toThrow('Unauthorized');
  });

  it('should throw a ServiceUnavailableError if the Case is currently locked', async () => {
    mockLock = MOCK_LOCK;

    await expect(
      updateCounselOnCaseInteractor(applicationContext, {
        docketNumber: MOCK_CASE.docketNumber,
        userData: {
          name: 'Saul Goodman',
          representing: ['9d914ca2-7876-43a7-acfa-ccb645717e11'],
          serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
        },
        userId: '9d914ca2-7876-43a7-acfa-ccb645717e11',
      }),
    ).rejects.toThrow(ServiceUnavailableError);

    expect(
      applicationContext.getPersistenceGateway().getCaseByDocketNumber,
    ).not.toHaveBeenCalled();
  });

  it('should acquire and remove the lock on the case', async () => {
    await updateCounselOnCaseInteractor(applicationContext, {
      docketNumber: MOCK_CASE.docketNumber,
      userData: {
        name: 'Saul Goodman',
        representing: ['9d914ca2-7876-43a7-acfa-ccb645717e11'],
        serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
      },
      userId: '9d914ca2-7876-43a7-acfa-ccb645717e11',
    });

    expect(
      applicationContext.getPersistenceGateway().createLock,
    ).toHaveBeenCalledWith({
      applicationContext,
      identifier: `case|${MOCK_CASE.docketNumber}`,
      ttl: 30,
    });

    expect(
      applicationContext.getPersistenceGateway().removeLock,
    ).toHaveBeenCalledWith({
      applicationContext,
      identifiers: [`case|${MOCK_CASE.docketNumber}`],
    });
  });

  it('updates a practitioner with the given userId on the associated case', async () => {
    await updateCounselOnCaseInteractor(applicationContext, {
      docketNumber: MOCK_CASE.docketNumber,
      userData: {
        name: 'Saul Goodman',
        representing: ['9d914ca2-7876-43a7-acfa-ccb645717e11'],
        serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
      },
      userId: '9d914ca2-7876-43a7-acfa-ccb645717e11',
    });

    expect(
      applicationContext.getPersistenceGateway().updateCase,
    ).toHaveBeenCalled();
  });

  it('updates an irsPractitioner with the given userId on the associated case', async () => {
    await updateCounselOnCaseInteractor(applicationContext, {
      docketNumber: MOCK_CASE.docketNumber,
      userData: {
        name: 'Saul Goodman',
        representing: ['9d914ca2-7876-43a7-acfa-ccb645717e11'],
        serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
      },
      userId: '76c86b6b-6aad-4128-8fa2-53c5735cc0af',
    });

    expect(
      applicationContext.getPersistenceGateway().updateCase,
    ).toHaveBeenCalled();
  });

  it('updates only editable practitioner fields on the case', async () => {
    await updateCounselOnCaseInteractor(applicationContext, {
      docketNumber: MOCK_CASE.docketNumber,
      userData: {
        email: 'not.editable@example.com',
        name: 'Saul Goodman',
        representing: ['9d914ca2-7876-43a7-acfa-ccb645717e11'],
        serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
      },
      userId: '76c86b6b-6aad-4128-8fa2-53c5735cc0af',
    });

    const updatedPractitioner = applicationContext
      .getPersistenceGateway()
      .updateCase.mock.calls[0][0].caseToUpdate.irsPractitioners.find(
        p => p.userId === '76c86b6b-6aad-4128-8fa2-53c5735cc0af',
      );
    expect(updatedPractitioner.email).toBeUndefined();
    expect(updatedPractitioner.representing).toBeUndefined();
    expect(updatedPractitioner.serviceIndicator).toBe(
      SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
    );
  });

  it('updates the service indicator on the contacts when they are being represented', async () => {
    const results = await updateCounselOnCaseInteractor(applicationContext, {
      docketNumber: MOCK_CASE.docketNumber,
      userData: {
        email: 'not.editable@example.com',
        name: 'Saul Goodman',
        representing: ['9d914ca2-7876-43a7-acfa-ccb645717e11'],
        serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
      },
      userId: 'e23e2d08-561b-4930-a2e0-1f342a481268',
    });

    expect(results.petitioners[0].serviceIndicator).toBe(
      SERVICE_INDICATOR_TYPES.SI_NONE,
    );
    expect(results.petitioners[1].serviceIndicator).toBe(
      SERVICE_INDICATOR_TYPES.SI_PAPER,
    );
  });

  it('reverts the service indicator on the contacts when they are no longer being represented', async () => {
    const results = await updateCounselOnCaseInteractor(applicationContext, {
      docketNumber: MOCK_CASE.docketNumber,
      userData: {
        email: 'not.editable@example.com',
        name: 'Saul Goodman',
        representing: ['b7315e1b-b804-4e09-84c5-e0f3b4f229c5'],
        serviceIndicator: SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
      },
      userId: 'e23e2d08-561b-4930-a2e0-1f342a481268',
    });

    expect(results.petitioners[0].serviceIndicator).toBe(
      SERVICE_INDICATOR_TYPES.SI_ELECTRONIC,
    );
    expect(results.petitioners[1].serviceIndicator).toBe(
      SERVICE_INDICATOR_TYPES.SI_PAPER,
    );
  });

  it('does not change the service indicator if contacts are neither represented nor not being represented', async () => {
    applicationContext
      .getPersistenceGateway()
      .getCaseByDocketNumber.mockImplementation(() => ({
        ...MOCK_CASE,
        privatePractitioners: [mockPrivatePractitioners[1]],
      }));

    const results = await updateCounselOnCaseInteractor(applicationContext, {
      docketNumber: MOCK_CASE.docketNumber,
      userData: {
        representing: ['9905d1ab-18d0-43ec-bafb-654e83405416'],
      },
      userId: 'e23e2d08-561b-4930-a2e0-1f342a481268',
    });

    expect(results.petitioners[0].serviceIndicator).toBe(
      MOCK_CASE.petitioners[0].serviceIndicator,
    );
  });

  it('throws an error if the userId is not a privatePractitioner or irsPractitioner role', async () => {
    await expect(
      updateCounselOnCaseInteractor(applicationContext, {
        docketNumber: MOCK_CASE.docketNumber,
        userData: {
          email: 'petitioner@example.com',
        },
        userId: 'aa335271-9a0f-4ad5-bcf1-3b89bd8b5dd6',
      }),
    ).rejects.toThrow('User is not a practitioner');
  });
});
