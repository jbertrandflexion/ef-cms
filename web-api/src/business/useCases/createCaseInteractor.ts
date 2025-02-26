import { Case } from '../../../../shared/src/business/entities/cases/Case';
import {
  CreatedCaseType,
  INITIAL_DOCUMENT_TYPES,
  PETITIONS_SECTION,
  ROLES,
} from '../../../../shared/src/business/entities/EntityConstants';
import { DocketEntry } from '../../../../shared/src/business/entities/DocketEntry';
import { ElectronicPetition } from '@shared/business/entities/cases/ElectronicPetition';
import {
  ROLE_PERMISSIONS,
  isAuthorized,
} from '../../../../shared/src/authorization/authorizationClientService';
import { ServerApplicationContext } from '@web-api/applicationContext';
import { UnauthorizedError } from '@web-api/errors/errors';
import { UserCase } from '../../../../shared/src/business/entities/UserCase';
import { UserRecord } from '@web-api/persistence/dynamo/dynamoTypes';
import { WorkItem } from '../../../../shared/src/business/entities/WorkItem';
import { setServiceIndicatorsForCase } from '../../../../shared/src/business/utilities/setServiceIndicatorsForCase';

export type ElectronicCreatedCaseType = Omit<CreatedCaseType, 'trialCitiies'>;

const addPetitionDocketEntryToCase = ({
  applicationContext,
  caseToAdd,
  docketEntryEntity,
  user,
}) => {
  const workItemEntity = new WorkItem(
    {
      assigneeId: null,
      assigneeName: null,
      associatedJudge: caseToAdd.associatedJudge,
      associatedJudgeId: caseToAdd.associatedJudgeId,
      caseStatus: caseToAdd.status,
      caseTitle: Case.getCaseTitle(Case.getCaseCaption(caseToAdd)),
      docketEntry: {
        ...docketEntryEntity.toRawObject(),
        createdAt: docketEntryEntity.createdAt,
      },
      docketNumber: caseToAdd.docketNumber,
      docketNumberWithSuffix: caseToAdd.docketNumberWithSuffix,
      isInitializeCase: true,
      section: PETITIONS_SECTION,
      sentBy: user.name,
      sentByUserId: user.userId,
      trialDate: caseToAdd.trialDate,
      trialLocation: caseToAdd.trialLocation,
    },
    { applicationContext },
    caseToAdd,
  );

  docketEntryEntity.setWorkItem(workItemEntity);
  caseToAdd.addDocketEntry(docketEntryEntity);

  return workItemEntity;
};

/**
 *
 * @param {object} applicationContext the application context
 * @param {object} providers the providers object
 * @param {string} providers.corporateDisclosureFileId the id of the corporate disclosure file
 * @param {string} providers.petitionFileId the id of the petition file
 * @param {object} providers.petitionMetadata the petition metadata
 * @param {string} providers.stinFileId the id of the stin file
 * @returns {object} the created case
 */
export const createCaseInteractor = async (
  applicationContext: ServerApplicationContext,
  {
    attachmentToPetitionFileId,
    corporateDisclosureFileId,
    petitionFileId,
    petitionMetadata,
    stinFileId,
  }: {
    attachmentToPetitionFileId?: string;
    corporateDisclosureFileId?: string;
    petitionFileId: string;
    petitionMetadata: any;
    stinFileId: string;
  },
) => {
  const authorizedUser = applicationContext.getCurrentUser();

  if (!isAuthorized(authorizedUser, ROLE_PERMISSIONS.PETITION)) {
    throw new UnauthorizedError('Unauthorized');
  }

  const user = await applicationContext
    .getPersistenceGateway()
    .getUserById({ applicationContext, userId: authorizedUser.userId });

  const petitionEntity = new ElectronicPetition(petitionMetadata, {
    applicationContext,
  }).validate();

  const docketNumber =
    await applicationContext.docketNumberGenerator.createDocketNumber({
      applicationContext,
    });

  let privatePractitioners: UserRecord[] = [];
  if (user.role === ROLES.privatePractitioner) {
    const practitionerUser = await applicationContext
      .getPersistenceGateway()
      .getUserById({
        applicationContext,
        userId: user.userId,
      });

    practitionerUser.representing = [
      petitionEntity.getContactPrimary().contactId,
    ];

    if (
      petitionMetadata.contactSecondary &&
      petitionMetadata.contactSecondary.name
    ) {
      practitionerUser.representing.push(
        petitionEntity.getContactSecondary().contactId,
      );
    }

    // remove the email from contactPrimary since the practitioners array should have a service email
    delete petitionEntity.getContactPrimary().email;
    delete petitionEntity.getContactPrimary().serviceIndicator;

    privatePractitioners = [practitionerUser];
  }

  const caseToAdd = new Case(
    {
      docketNumber,
      isPaper: false,
      orderForFilingFee: true,
      ...petitionEntity.toRawObject(),
      privatePractitioners,
    },
    {
      applicationContext,
      isNewCase: true,
    },
  );

  setServiceIndicatorsForCase(caseToAdd);

  if (user.role === ROLES.petitioner) {
    caseToAdd.getContactPrimary().contactId = user.userId;
  }

  caseToAdd.caseCaption = Case.getCaseCaption(caseToAdd);
  caseToAdd.initialCaption = caseToAdd.caseCaption;

  const filers = [caseToAdd.getContactPrimary().contactId];

  if (
    petitionMetadata.contactSecondary &&
    petitionMetadata.contactSecondary.name
  ) {
    filers.push(caseToAdd.getContactSecondary().contactId);
  }

  const petitionDocketEntryEntity = new DocketEntry(
    {
      contactPrimary: caseToAdd.getContactPrimary(),
      contactSecondary: caseToAdd.getContactSecondary(),
      docketEntryId: petitionFileId,
      documentTitle: INITIAL_DOCUMENT_TYPES.petition.documentType,
      documentType: INITIAL_DOCUMENT_TYPES.petition.documentType,
      eventCode: INITIAL_DOCUMENT_TYPES.petition.eventCode,
      filers,
      filingDate: caseToAdd.createdAt,
      isFileAttached: true,
      isOnDocketRecord: true,
      privatePractitioners,
    },
    { applicationContext, petitioners: caseToAdd.petitioners },
  );

  petitionDocketEntryEntity.setFiledBy(user);

  const newWorkItem = addPetitionDocketEntryToCase({
    applicationContext,
    caseToAdd,
    docketEntryEntity: petitionDocketEntryEntity,
    user,
  });

  const requestPlaceOfTrialDocketEntry = new DocketEntry(
    {
      documentTitle: `Request for Place of Trial at ${caseToAdd.preferredTrialCity}`,
      documentType: INITIAL_DOCUMENT_TYPES.requestForPlaceOfTrial.documentType,
      eventCode: INITIAL_DOCUMENT_TYPES.requestForPlaceOfTrial.eventCode,
      filingDate: caseToAdd.createdAt,
      isFileAttached: false,
      isOnDocketRecord: true,
      processingStatus: 'complete',
    },
    {
      applicationContext,
      petitioners: caseToAdd.petitioners,
    },
  );

  requestPlaceOfTrialDocketEntry.setFiledBy(user);

  caseToAdd.addDocketEntry(requestPlaceOfTrialDocketEntry);

  const stinDocketEntryEntity = new DocketEntry(
    {
      contactPrimary: caseToAdd.getContactPrimary(),
      contactSecondary: caseToAdd.getContactSecondary(),
      docketEntryId: stinFileId,
      documentTitle: INITIAL_DOCUMENT_TYPES.stin.documentType,
      documentType: INITIAL_DOCUMENT_TYPES.stin.documentType,
      eventCode: INITIAL_DOCUMENT_TYPES.stin.eventCode,
      filers,
      filingDate: caseToAdd.createdAt,
      index: 0,
      isFileAttached: true,
      privatePractitioners,
    },
    { applicationContext, petitioners: caseToAdd.petitioners },
  );

  stinDocketEntryEntity.setFiledBy(user);

  caseToAdd.addDocketEntry(stinDocketEntryEntity);

  if (corporateDisclosureFileId) {
    const cdsDocketEntryEntity = new DocketEntry(
      {
        contactPrimary: caseToAdd.getContactPrimary(),
        contactSecondary: caseToAdd.getContactSecondary(),
        docketEntryId: corporateDisclosureFileId,
        documentTitle: INITIAL_DOCUMENT_TYPES.corporateDisclosure.documentType,
        documentType: INITIAL_DOCUMENT_TYPES.corporateDisclosure.documentType,
        eventCode: INITIAL_DOCUMENT_TYPES.corporateDisclosure.eventCode,
        filers,
        filingDate: caseToAdd.createdAt,
        isFileAttached: true,
        isOnDocketRecord: true,
        privatePractitioners,
      },
      { applicationContext, petitioners: caseToAdd.petitioners },
    );

    cdsDocketEntryEntity.setFiledBy(user);

    caseToAdd.addDocketEntry(cdsDocketEntryEntity);
  }

  if (attachmentToPetitionFileId) {
    const atpDocketEntryEntity = new DocketEntry(
      {
        contactPrimary: caseToAdd.getContactPrimary(),
        contactSecondary: caseToAdd.getContactSecondary(),
        docketEntryId: attachmentToPetitionFileId,
        documentTitle: INITIAL_DOCUMENT_TYPES.attachmentToPetition.documentType,
        documentType: INITIAL_DOCUMENT_TYPES.attachmentToPetition.documentType,
        eventCode: INITIAL_DOCUMENT_TYPES.attachmentToPetition.eventCode,
        filers,
        filingDate: caseToAdd.createdAt,
        isFileAttached: true,
        isOnDocketRecord: true,
        privatePractitioners,
      },
      { applicationContext, petitioners: caseToAdd.petitioners },
    );

    atpDocketEntryEntity.setFiledBy(user);

    caseToAdd.addDocketEntry(atpDocketEntryEntity);
  }

  await applicationContext.getUseCaseHelpers().createCaseAndAssociations({
    applicationContext,
    caseToCreate: caseToAdd.validate().toRawObject(),
  });

  const userCaseEntity = new UserCase(caseToAdd);

  await applicationContext.getPersistenceGateway().associateUserWithCase({
    applicationContext,
    docketNumber: caseToAdd.docketNumber,
    userCase: userCaseEntity.validate().toRawObject(),
    userId: user.userId,
  });

  await applicationContext.getPersistenceGateway().saveWorkItem({
    applicationContext,
    workItem: newWorkItem.validate().toRawObject(),
  });

  applicationContext.logger.info('filed a new petition', {
    docketNumber: caseToAdd.docketNumber,
  });

  return new Case(caseToAdd, { applicationContext }).toRawObject();
};
