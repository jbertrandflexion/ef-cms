import { MOCK_CASE } from '@shared/test/mockCase';
import { MOCK_DOCUMENTS } from '@shared/test/mockDocketEntry';
import { applicationContextForClient as applicationContext } from '@web-client/test/createClientTestApplicationContext';
import { getShowNotServedForDocument } from './getShowNotServedForDocument';

describe('getShowNotServedForDocument', () => {
  const docketEntryId = '155870c2-5b27-48ce-9aac-dd41305c7797';

  describe('showNotServed', () => {
    it('should return true for showNotServed if the document type is servable and does not have a servedAt', () => {
      const showNotServed = getShowNotServedForDocument({
        caseDetail: {
          ...MOCK_CASE,
          docketEntries: [
            {
              ...MOCK_DOCUMENTS[0],
              docketEntryId,
              documentTitle: 'Some Stuff',
              documentType: 'Order',
              eventCode: 'O',
            },
          ],
        },
        docketEntryId,
        draftDocuments: [],
      });

      expect(showNotServed).toEqual(true);
    });

    it('should return false for showNotServed if the document type is unservable', () => {
      const showNotServed = getShowNotServedForDocument({
        caseDetail: {
          ...MOCK_CASE,
          docketEntries: [
            {
              ...MOCK_DOCUMENTS[0],
              docketEntryId,
              documentTitle: 'Some Stuff',
              documentType: 'Corrected Transcript',
              eventCode: 'CTRA',
            },
          ],
        },
        docketEntryId,
        draftDocuments: [],
      });

      expect(showNotServed).toEqual(false);
    });

    it('should return false for showNotServed if the document type is servable and has servedAt', () => {
      const showNotServed = getShowNotServedForDocument({
        caseDetail: {
          ...MOCK_CASE,
          docketEntries: [
            {
              ...MOCK_DOCUMENTS[0],
              docketEntryId,
              documentTitle: 'Some Stuff',
              documentType: 'Order',
              eventCode: 'O',
              servedAt: '2019-03-01T21:40:46.415Z',
            },
          ],
        },
        docketEntryId,
        draftDocuments: [],
      });

      expect(showNotServed).toEqual(false);
    });

    it('should return false for showNotServed if the document type is servable and not served and the document is a draft', () => {
      const showNotServed = getShowNotServedForDocument({
        caseDetail: {
          ...MOCK_CASE,
          docketEntries: [
            {
              ...MOCK_DOCUMENTS[0],
              docketEntryId,
              documentTitle: 'Some Stuff',
              documentType: 'Order',
              eventCode: 'O',
            },
          ],
        },
        docketEntryId,
        draftDocuments: [{ ...MOCK_DOCUMENTS[0], docketEntryId }],
      });

      expect(showNotServed).toEqual(false);
    });

    it('should return false for showNotServed if the document is not on the case detail', () => {
      const showNotServed = getShowNotServedForDocument({
        caseDetail: {
          ...MOCK_CASE,
          docketEntries: [],
        },
        docketEntryId,
        draftDocuments: [{ ...MOCK_DOCUMENTS[0], docketEntryId }],
      });

      expect(showNotServed).toEqual(false);
    });

    it('should return false when the document is a correspondence document', () => {
      // Correspondence documents should not be in case.docketEntries and also are not served
      const correspondenceDocumentId = applicationContext.getUniqueId();

      const showNotServed = getShowNotServedForDocument({
        caseDetail: {
          ...MOCK_CASE,
          docketEntries: [{ ...MOCK_DOCUMENTS[0], docketEntryId }],
        },
        docketEntryId: correspondenceDocumentId,
        draftDocuments: [{ ...MOCK_DOCUMENTS[0], docketEntryId }],
      });

      expect(showNotServed).toEqual(false);
    });

    it('should return true when the document is a legacy document that has not been served and has no servedAt', () => {
      const showNotServed = getShowNotServedForDocument({
        caseDetail: {
          ...MOCK_CASE,
          docketEntries: [
            {
              ...MOCK_DOCUMENTS[0],
              docketEntryId,
              documentTitle: 'Some Stuff',
              documentType: 'Order',
              eventCode: 'O',
              isLegacyServed: false,
            },
          ],
        },
        docketEntryId,
      });

      expect(showNotServed).toEqual(true);
    });

    it('should return false when the document is a legacy document that has been served', () => {
      const showNotServed = getShowNotServedForDocument({
        caseDetail: {
          ...MOCK_CASE,
          docketEntries: [
            {
              ...MOCK_DOCUMENTS[0],
              docketEntryId,
              documentTitle: 'Some Stuff',
              documentType: 'Order',
              eventCode: 'O',
              isLegacyServed: true,
            },
          ],
        },
        docketEntryId,
      });

      expect(showNotServed).toEqual(false);
    });
  });
});
