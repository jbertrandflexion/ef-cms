/* eslint-disable complexity */
const noop = () => {};

export const socketRouter = (app, onMessageCallbackFn?) => {
  return async event => {
    const message = JSON.parse(event.data);
    const { action } = message;

    switch (action) {
      case 'paper_service_started':
        await app.getSequence('showPaperServiceProgressSequence')(message);
        break;
      case 'paper_service_updated':
        await app.getSequence('updatePaperServiceProgressSequence')(message);
        break;
      case 'set_trial_calendar_paper_service_complete':
        await app.getSequence('updateTrialSessionCompleteSequence')(message);
        break;
      case 'thirty_day_notice_paper_service_complete':
        await app.getSequence('thirtyDayNoticePaperServiceCompleteSequence')(
          message,
        );
        break;
      case 'notice_generation_start':
        await app.getSequence('showGenerateNoticesProgressSequence')(message);
        break;
      case 'notice_generation_updated':
        await app.getSequence('updateGenerateNoticesProgressSequence')(message);
        break;
      case 'notice_generation_complete':
        await app.getSequence('noticeGenerationCompleteSequence')(message);
        break;
      case 'set_trial_session_calendar_complete':
        await app.getSequence('completeTrialSessionCalendarSequence')(message);
        break;
      case 'set_trial_session_calendar_error':
        console.error(
          'error setting trial session calendar: ',
          message.message,
        );
        await app.getSequence('setTrialSessionCalendarErrorSequence')({
          ...message,
          alertError: {
            message:
              'We could not set the trial session calendar. Please contact support.',
            title: 'Error setting trial session calendar.',
          },
        });
        break;
      case 'serve_to_irs_complete':
        await app.getSequence('serveToIrsCompleteSequence')(message);
        break;
      case 'serve_to_irs_error':
        await app.getSequence('serveToIrsErrorSequence')({
          ...message,
          showModal: 'ServeCaseToIrsErrorModal',
        });
        break;
      case 'update_trial_session_complete':
        await app.getSequence('updateTrialSessionCompleteSequence')(message);
        break;
      case 'batch_download_ready':
        await app.getSequence('batchDownloadReadySequence')(message);
        break;
      case 'batch_download_docket_generated':
      case 'batch_download_csv_data':
      case 'batch_download_progress':
        await app.getSequence('updateBatchDownloadProgressSequence')(message);
        break;
      case 'batch_download_error':
        await app.getSequence('batchDownloadErrorSequence')(message);
        break;
      case 'user_contact_initial_update_complete':
        await app.getSequence('userContactUpdateInitialUpdateCompleteSequence')(
          message,
        );
        break;
      case 'user_contact_full_update_complete':
        await app.getSequence('userContactUpdateCompleteSequence')(message);
        break;
      case 'user_contact_update_progress':
        await app.getSequence('userContactUpdateProgressSequence')(message);
        break;
      case 'user_contact_update_error':
        await app.getSequence('userContactUpdateErrorSequence')(message);
        break;
      case 'admin_contact_initial_update_complete':
        await app.getSequence(
          'adminContactUpdateInitialUpdateCompleteSequence',
        )(message);
        break;
      case 'admin_contact_full_update_complete':
        await app.getSequence('adminContactUpdateCompleteSequence')(message);
        break;
      case 'admin_contact_update_progress':
        await app.getSequence('adminContactUpdateProgressSequence')(message);
        break;
      case 'message_completion_success':
        await app.getSequence('completeMessageSuccessSequence')(message);
        break;
      case 'message_completion_error':
        await app.getSequence('completeMessageErrorSequence')(message);
        break;
      case 'maintenance_mode_engaged':
        await app.getSequence('openAppMaintenanceModalSequence')({
          ...message,
          maintenanceMode: true,
          path: '/maintenance',
        });
        break;
      case 'maintenance_mode_disengaged':
        await app.getSequence('disengageAppMaintenanceSequence')({
          ...message,
          maintenanceMode: false,
          path: '/',
        });
        break;
      case 'save_docket_entry_for_later_complete':
        await app.getSequence('saveDocketEntryForLaterCompleteSequence')(
          message,
        );
        break;
      case 'serve_document_complete':
        await app.getSequence('serveDocumentCompleteSequence')(message);
        break;
      case 'serve_document_error':
        await app.getSequence('serveDocumentErrorSequence')({
          ...message,
          showModal: 'WorkItemAlreadyCompletedModal',
        });
        break;
      case 'retry_async_request':
        await app.getSequence('retryAsyncRequestSequence')(message);
        break;
      case 'download_csv_file':
        await app.getSequence('downloadCsvFileSequence')(message);
        break;
    }

    (onMessageCallbackFn || noop)(message);
  };
};

/***********************************************************
  Please note: Socket routers cannot be used by IRS users
  If the feature is needed for IRS users, consider using a
  different approach for notifying the user with asynchronous
  updates.
 **********************************************************/
