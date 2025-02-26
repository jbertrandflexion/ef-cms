import { addCaseToGroup } from '../../../../helpers/caseDetail/add-case-to-group';
import {
  assertDoesNotExist,
  assertExists,
  retry,
} from '../../../../helpers/retry';
import { createAndServePaperFiling } from '../../../../helpers/caseDetail/docketRecord/paperFiling/create-and-serve-paper-filing';
import { createAndServePaperPetition } from '../../../../helpers/fileAPetition/create-and-serve-paper-petition';
import { createOrderAndDecision } from '../../../../helpers/caseDetail/docketRecord/courtIssuedFiling/create-order-and-decision';
import { goToCase } from '../../../../helpers/caseDetail/go-to-case';
import {
  loginAsColvin,
  loginAsDocketClerk1,
} from '../../../../helpers/authentication/login-as-helpers';
import { navigateToJudgeActivityReport } from '../../../../helpers/judgeActivityReport/navigate-to-judge-activity-report';
import { updateCaseStatus } from '../../../../helpers/caseDetail/caseInformation/update-case-status';

describe('Verify the activity report', () => {
  describe('Statistics table', () => {
    it('should display an error message when invalid dates are entered into the form', () => {
      loginAsColvin();
      navigateToJudgeActivityReport('statistics');
      cy.get('[data-testid="view-statistics-button"]').should('be.disabled');
      cy.get(
        '.usa-date-picker__wrapper > [data-testid="deadlineStart-date-start-input"]',
      ).type('abc');
      cy.get(
        '.usa-date-picker__wrapper > [data-testid="deadlineEnd-date-end-input}"]',
      ).type('123');
      cy.get('[data-testid="view-statistics-button"]').click();
      cy.get('[data-testid="error-alert"]').should('be.visible');
      cy.get('[data-testid="deadlineStart-date-start"]').should('be.visible');
      cy.get('[data-testid="deadlineEnd-date-end}"]').should('be.visible');
      cy.get('[data-testid="activity-report-header"]').should(
        'contain',
        'Colvin',
      );
      cy.get('[data-testid="judge-select"]')
        .find('option:selected')
        .should('have.text', 'Colvin');
    });

    it('should display statistics tables when a correct date is inputed', () => {
      loginAsColvin();
      navigateToJudgeActivityReport('statistics');
      cy.get('[data-testid="view-statistics-button"]').should('be.disabled');
      cy.get('[data-testid="cases-closed-table"]').should('not.exist');
      cy.get('[data-testid="trial-sessions-held-table"]').should('not.exist');
      cy.get('[data-testid="orders-issued-table"]').should('not.exist');
      cy.get('[data-testid="opinions-issued-table"]').should('not.exist');
      cy.get(
        '.usa-date-picker__wrapper > [data-testid="deadlineStart-date-start-input"]',
      ).type('01/01/2013');
      cy.get(
        '.usa-date-picker__wrapper > [data-testid="deadlineEnd-date-end-input}"]',
      ).type('01/01/2024');
      cy.get('[data-testid="view-statistics-button"]').click();
      cy.get('[data-testid="activity-report-header"]').should(
        'contain',
        'Colvin',
      );
      cy.get('[data-testid="judge-select"]')
        .find('option:selected')
        .should('have.text', 'Colvin');

      cy.get('[data-testid="cases-closed-table"]').should('be.visible');
      cy.get('[data-testid="trial-sessions-held-table"]').should('be.visible');
      cy.get('[data-testid="orders-issued-table"]').should('be.visible');
      cy.get('[data-testid="opinions-issued-table"]').should('be.visible');
    });
  });

  describe('Submitted/CAV table', () => {
    it('create a Submitted case and verify it shows up in the Submitted/CAV table', () => {
      createAndServePaperPetition().then(({ docketNumber }) => {
        loginAsDocketClerk1();
        goToCase(docketNumber);
        updateCaseStatus('Submitted', 'Colvin');

        retry(() => {
          loginAsColvin();
          navigateToJudgeActivityReport('submitted-and-cav');
          return assertExists(`[data-testid="${docketNumber}"]`);
        });
      });
    });

    it('create a CAV case and verify it shows up in the Submitted/CAV table', () => {
      createAndServePaperPetition().then(({ docketNumber }) => {
        loginAsDocketClerk1();
        goToCase(docketNumber);
        updateCaseStatus('CAV', 'Colvin');

        retry(() => {
          loginAsColvin();
          navigateToJudgeActivityReport('submitted-and-cav');
          return assertExists(`[data-testid="${docketNumber}"]`);
        });
      });
    });

    it('create a Submitted - Rule 122 case and verify it shows up in the Submitted/CAV table', () => {
      createAndServePaperPetition().then(({ docketNumber }) => {
        loginAsDocketClerk1();
        goToCase(docketNumber);
        updateCaseStatus('Submitted - Rule 122', 'Colvin');

        retry(() => {
          loginAsColvin();
          navigateToJudgeActivityReport('submitted-and-cav');
          return assertExists(`[data-testid="${docketNumber}"]`);
        });
      });
    });

    it('should not display a served decision type event code on the submitted and cav table', () => {
      createAndServePaperPetition().then(({ docketNumber }) => {
        loginAsDocketClerk1();
        goToCase(docketNumber);
        updateCaseStatus('Submitted', 'Colvin');

        loginAsDocketClerk1();
        goToCase(docketNumber);
        createOrderAndDecision();

        retry(() => {
          loginAsColvin();
          navigateToJudgeActivityReport('submitted-and-cav');
          cy.get('tbody > tr').should('be.visible');
          return assertExists(`[data-testid="${docketNumber}"]`);
        });

        loginAsDocketClerk1();
        goToCase(docketNumber);

        cy.get('[data-testid="tab-drafts"]').click();
        cy.get('[data-testid="docket-entry-description-4"]').click(); // Order and Decision
        cy.get('[data-testid="add-court-issued-docket-entry-button"]').click();
        cy.get('[data-testid="judge-select"]').select('Colvin');
        cy.get('[data-testid="serve-to-parties-btn"]').click();
        cy.get('[data-testid="modal-button-confirm"]').click();
        cy.get('[data-testid="print-paper-service-done-button"]').click();

        retry(() => {
          loginAsColvin();
          navigateToJudgeActivityReport('submitted-and-cav');
          return assertDoesNotExist(`[data-testid="${docketNumber}"]`);
        });
      });
    });

    it('should display a stricken decision type documents on the submitted and cav table', () => {
      createAndServePaperPetition().then(({ docketNumber }) => {
        loginAsDocketClerk1();
        goToCase(docketNumber);
        updateCaseStatus('Submitted', 'Colvin');
        createOrderAndDecision();

        cy.get('[data-testid="tab-drafts"]').click();
        cy.get('[data-testid="docket-entry-description-4"]').click(); // Order and Decision
        cy.get('[data-testid="add-court-issued-docket-entry-button"]').click();
        cy.get('[data-testid="judge-select"]').select('Colvin');
        cy.get('[data-testid="serve-to-parties-btn"]').click();
        cy.get('[data-testid="modal-button-confirm"]').click();
        cy.get('[data-testid="print-paper-service-done-button"]').click();

        updateCaseStatus('Submitted', 'Colvin');

        cy.get('[data-testid="tab-docket-record"]').click();
        cy.get('[data-testid="edit-OAD"]').click();
        cy.get('[data-testid="tab-action"]').click();
        cy.get('[data-testid="strike-entry"]').click();
        cy.get('[data-testid="modal-button-confirm"]').click();

        retry(() => {
          loginAsColvin();
          navigateToJudgeActivityReport('submitted-and-cav');
          return assertExists(`[data-testid="${docketNumber}"]`);
        });
      });
    });

    it('should display lead case of a consolidated group', () => {
      createAndServePaperPetition().then(
        ({ docketNumber: childDocketNumber }) => {
          loginAsDocketClerk1();
          goToCase(childDocketNumber);
          updateCaseStatus('Submitted', 'Colvin');

          createAndServePaperPetition({ yearReceived: '2019' }).then(
            ({ docketNumber: leadDocketNumber }) => {
              loginAsDocketClerk1();
              goToCase(leadDocketNumber);
              updateCaseStatus('Submitted', 'Colvin');
              addCaseToGroup(childDocketNumber);

              retry(() => {
                loginAsColvin();
                navigateToJudgeActivityReport('submitted-and-cav');
                return assertExists(`[data-testid="${leadDocketNumber}"]`).then(
                  isLeadVisible => {
                    assertDoesNotExist(
                      `[data-testid="${childDocketNumber}"]`,
                    ).then(isChildHidden => isLeadVisible && isChildHidden);
                  },
                );
              });
            },
          );
        },
      );
    });
  });

  describe('Pending Motions Table', () => {
    it('should display Pending Motions for judge in that report', () => {
      createAndServePaperPetition().then(({ docketNumber }) => {
        loginAsDocketClerk1();
        goToCase(docketNumber);
        updateCaseStatus('Submitted', 'Colvin');
        goToCase(docketNumber);
        createAndServePaperFiling('Motion for a New Trial', '01/01/2022');
        goToCase(docketNumber);

        cy.get(
          '[data-testid="docket-record-table"] td:contains("Motion for a New Trial")',
        )
          .parent()
          .invoke('attr', 'data-testid')
          .then(docketEntryId => {
            retry(() => {
              loginAsColvin();
              navigateToJudgeActivityReport('pending-motions');
              return assertExists(
                `[data-testid="pending-motion-row-${docketEntryId}"]`,
              );
            });
          });
      });
    });
  });
});
