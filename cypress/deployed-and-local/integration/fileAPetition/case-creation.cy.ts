import { createAndServePaperPetition } from '../../../helpers/fileAPetition/create-and-serve-paper-petition';
import {
  loginAsPetitioner,
  loginAsPetitionsClerk1,
  loginAsPrivatePractitioner,
} from '../../../helpers/authentication/login-as-helpers';
import { petitionerCreatesElectronicCase } from '../../../helpers/fileAPetition/petitioner-creates-electronic-case';
import { petitionsClerkQcsAndServesElectronicCase } from '../../../helpers/documentQC/petitions-clerk-qcs-and-serves-electronic-case';
import { practitionerCreatesElectronicCase } from '../../../helpers/fileAPetition/practitioner-creates-electronic-case';

describe('users should be able to create cases', () => {
  it('a petitioner should be able to create a case and petitions clerk QCs and serves it', () => {
    loginAsPetitioner();
    petitionerCreatesElectronicCase().then(docketNumber => {
      petitionsClerkQcsAndServesElectronicCase(docketNumber);
    });
  });

  it('a practitioner should be able to create a case', () => {
    loginAsPrivatePractitioner();
    practitionerCreatesElectronicCase();
  });

  it('a petitionsclerk should be able to create and serve a paper case', () => {
    loginAsPetitionsClerk1();
    createAndServePaperPetition();
  });
});
