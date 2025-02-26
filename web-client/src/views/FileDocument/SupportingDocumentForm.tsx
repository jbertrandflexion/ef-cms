import { Button } from '../../ustc-ui/Button/Button';
import { FormGroup } from '../../ustc-ui/FormGroup/FormGroup';
import { StateDrivenFileInput } from '../FileDocument/StateDrivenFileInput';
import { SupportingDocumentInclusionsForm } from './SupportingDocumentInclusionsForm';
import { connect } from '@web-client/presenter/shared.cerebral';
import { props } from 'cerebral';
import { sequences } from '@web-client/presenter/app.cerebral';
import { state } from '@web-client/presenter/app.cerebral';
import React from 'react';
import classNames from 'classnames';

export const SupportingDocumentForm = connect(
  {
    constants: state.constants,
    fileDocumentHelper: state.fileDocumentHelper,
    form: state.form,
    index: props.index,
    removeSupportingDocumentSequence:
      sequences.removeSupportingDocumentSequence,
    updateFileDocumentWizardFormValueSequence:
      sequences.updateFileDocumentWizardFormValueSequence,
    validateExternalDocumentInformationSequence:
      sequences.validateExternalDocumentInformationSequence,
    validationErrors: state.validationErrors,
  },
  function SupportingDocumentForm({
    constants,
    fileDocumentHelper,
    form,
    index,
    removeSupportingDocumentSequence,
    updateFileDocumentWizardFormValueSequence,
    validateExternalDocumentInformationSequence,
    validationErrors,
  }) {
    const fileValidationErrors =
      validationErrors &&
      validationErrors.supportingDocuments &&
      validationErrors.supportingDocuments.find(item => item.index === index);

    return (
      <>
        <h2 className="margin-top-4">
          <div className="display-flex">
            Supporting Document {index + 1}{' '}
            <Button
              link
              className="red-warning text-left padding-0 margin-left-1"
              icon="trash"
              onClick={() => {
                removeSupportingDocumentSequence({ index });
              }}
            >
              Delete
            </Button>
          </div>
        </h2>
        <div className="blue-container">
          <FormGroup
            className={
              !form.supportingDocuments[index].supportingDocument &&
              'margin-bottom-0'
            }
            errorText={fileValidationErrors?.supportingDocument}
          >
            <label
              className="usa-label"
              htmlFor={`supporting-document-${index}`}
              id={`supporting-document-${index}-label`}
            >
              Select supporting document
            </label>
            <select
              aria-describedby={`supporting-document-${index}-label`}
              className={classNames(
                'usa-select',
                fileValidationErrors?.supportingDocument && 'usa-select--error',
              )}
              id={`supporting-document-${index}`}
              name={`supportingDocuments.${index}.supportingDocument`}
              value={form.supportingDocuments[index].supportingDocument || ''}
              onChange={e => {
                updateFileDocumentWizardFormValueSequence({
                  key: `supportingDocuments.${index}.category`,
                  value: 'Supporting Document',
                });
                updateFileDocumentWizardFormValueSequence({
                  key: `supportingDocuments.${index}.documentType`,
                  value: e.target.value,
                });
                updateFileDocumentWizardFormValueSequence({
                  key: `supportingDocuments.${index}.previousDocument`,
                  value: {
                    documentTitle: form.documentTitle || form.documentType,
                    documentType: form.documentType,
                  },
                });
                updateFileDocumentWizardFormValueSequence({
                  key: e.target.name,
                  value: e.target.value,
                });
                validateExternalDocumentInformationSequence();
              }}
            >
              <option value="">- Select -</option>
              {fileDocumentHelper.supportingDocumentTypeList.map(entry => {
                return (
                  <option key={entry.documentType} value={entry.documentType}>
                    {entry.documentTypeDisplay}
                  </option>
                );
              })}
            </select>
          </FormGroup>

          {fileDocumentHelper.supportingDocuments[index]
            .showSupportingDocumentFreeText && (
            <FormGroup
              errorText={fileValidationErrors?.supportingDocumentFreeText}
            >
              <label
                className="usa-label"
                htmlFor={`supporting-document-free-text-${index}`}
                id={`supporting-document-free-text-${index}-label`}
              >
                Supporting document signed by
              </label>
              <input
                aria-describedby={`supporting-document-free-text-${index}-label`}
                autoCapitalize="none"
                className="usa-input"
                id={`supporting-document-free-text-${index}`}
                name={`supportingDocuments.${index}.supportingDocumentFreeText`}
                type="text"
                value={
                  form.supportingDocuments[index].supportingDocumentFreeText ||
                  ''
                }
                onBlur={() => {
                  validateExternalDocumentInformationSequence();
                }}
                onChange={e => {
                  updateFileDocumentWizardFormValueSequence({
                    key: `supportingDocuments.${index}.freeText`,
                    value: e.target.value,
                  });
                  updateFileDocumentWizardFormValueSequence({
                    key: e.target.name,
                    value: e.target.value,
                  });
                }}
              />
            </FormGroup>
          )}

          {fileDocumentHelper.supportingDocuments[index]
            .showSupportingDocumentUpload && (
            <>
              <FormGroup
                errorText={fileValidationErrors?.supportingDocumentFile}
              >
                <label
                  className={classNames(
                    'usa-label ustc-upload with-hint',
                    fileDocumentHelper.supportingDocuments[index]
                      .showSupportingDocumentValid && 'validated',
                  )}
                  htmlFor={`supporting-document-file-${index}`}
                  id={`supporting-document-file-${index}-label`}
                >
                  Upload supporting document PDF (.pdf)
                </label>
                <span className="usa-hint">
                  Make sure file is not encrypted or password protected. Max
                  file size {constants.MAX_FILE_SIZE_MB}MB.
                </span>
                <StateDrivenFileInput
                  aria-describedby={`supporting-document-file-${index}-label`}
                  file={form.supportingDocuments[index].supportingDocumentFile}
                  id={`supporting-document-file-${index}`}
                  name={`supportingDocuments.${index}.supportingDocumentFile`}
                  updateFormValueSequence="updateFileDocumentWizardFormValueSequence"
                  validationSequence="validateExternalDocumentInformationSequence"
                />
              </FormGroup>

              <SupportingDocumentInclusionsForm
                bind={`form.supportingDocuments.${index}`}
                index={index}
                type={'supportingDocuments'}
                validationBind={`validationErrors.supportingDocuments.${index}`}
              />
            </>
          )}
        </div>
      </>
    );
  },
);

SupportingDocumentForm.displayName = 'SupportingDocumentForm';
