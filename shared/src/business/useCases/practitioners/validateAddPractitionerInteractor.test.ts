import { RawPractitioner } from '@shared/business/entities/Practitioner';
import { applicationContext } from '../../test/createTestApplicationContext';
import { validateAddPractitionerInteractor } from './validateAddPractitionerInteractor';

describe('validateAddPractitionerInteractor', () => {
  it('returns the expected errors object on an empty practitioner', () => {
    const errors = validateAddPractitionerInteractor(applicationContext, {
      practitioner: {} as RawPractitioner,
    });

    expect(Object.keys(errors)).toEqual([
      'email',
      'admissionsDate',
      'admissionsStatus',
      'birthYear',
      'firstName',
      'lastName',
      'originalBarState',
      'practiceType',
      'practitionerType',
    ]);
  });

  it('should return null when the practitioner object is valid', () => {
    const errors = validateAddPractitionerInteractor(applicationContext, {
      practitioner: {
        admissionsDate: '2019-03-01',
        admissionsStatus: 'Active',
        birthYear: '2009',
        confirmEmail: 'test@example.com',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Practitioner',
        originalBarState: 'IL',
        practiceType: 'IRS',
        practitionerType: 'Attorney',
      } as RawPractitioner,
    });

    expect(errors).toBeNull();
  });
});
