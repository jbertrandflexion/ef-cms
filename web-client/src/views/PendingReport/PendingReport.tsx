import { BigHeader } from '../BigHeader';
import { Button } from '../../ustc-ui/Button/Button';
import { ErrorNotification } from '../ErrorNotification';
import { PendingReportList } from './PendingReportList';
import { SuccessNotification } from '../SuccessNotification';
import { Tab, Tabs } from '../../ustc-ui/Tabs/Tabs';
import { connect } from '@web-client/presenter/shared.cerebral';
import { sequences, state } from '@web-client/presenter/app.cerebral';
import React, { useState } from 'react';

export const PendingReport = connect(
  {
    exportPendingReportSequence: sequences.exportPendingReportSequence,
    formattedPendingItemsHelper: state.formattedPendingItemsHelper,
    hasPendingItemsResults: state.pendingReports.hasPendingItemsResults,
  },
  function PendingReport({
    exportPendingReportSequence,
    formattedPendingItemsHelper,
    hasPendingItemsResults,
  }) {
    const [isSubmitDebounced, setIsSubmitDebounced] = useState(false);

    const debounceSubmit = timeout => {
      setIsSubmitDebounced(true);
      setTimeout(() => {
        setIsSubmitDebounced(false);
      }, timeout);
    };

    return (
      <>
        <BigHeader text="Reports" />
        <section className="usa-section grid-container">
          <SuccessNotification />
          <ErrorNotification />
          <Tabs bind="reportsTab.group" defaultActiveTab="pendingReport">
            <div className="ustc-ui-tabs ustc-ui-tabs--right-button-container">
              {hasPendingItemsResults && (
                <>
                  <Button
                    link
                    aria-label="export pending report"
                    className="margin-top-2"
                    data-testid="export-pending-report"
                    disabled={isSubmitDebounced}
                    icon="file-export"
                    onClick={() => {
                      debounceSubmit(200);
                      exportPendingReportSequence();
                    }}
                  >
                    Export
                  </Button>
                  <Button
                    link
                    aria-label="print pending report"
                    className="margin-top-2"
                    data-testid="print-pending-report"
                    href={formattedPendingItemsHelper.printUrl}
                    icon="print"
                  >
                    Printable Report
                  </Button>
                </>
              )}
            </div>

            <Tab
              id="pending-report-tab"
              tabName="pendingReport"
              title="Pending Report"
            >
              <PendingReportList />
            </Tab>
          </Tabs>
        </section>
      </>
    );
  },
);

PendingReport.displayName = 'PendingReport';
