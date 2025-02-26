import * as circleHelper from '../../../../shared/admin-tools/circleci/circleci-helper';
import { handler } from './wait-for-workflow-cron';
import type { Context } from 'aws-lambda';

jest.mock('../../../../shared/admin-tools/circleci/circleci-helper');
const approvePendingJob = jest
  .spyOn(circleHelper, 'approvePendingJob')
  .mockImplementation(jest.fn());
const cancelWorkflow = jest
  .spyOn(circleHelper, 'cancelWorkflow')
  .mockImplementation(jest.fn());
const getPipelineStatus = jest
  .spyOn(circleHelper, 'getPipelineStatus')
  .mockImplementation(jest.fn());

const mockContext = {
  fail: jest.fn(),
  succeed: jest.fn(),
} as unknown as Context;

describe('wait-for-workflow', () => {
  console.log = () => null;
  console.error = () => null;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns immediately if it can't determine the status of the workflow for which it is waiting", async () => {
    getPipelineStatus.mockReturnValueOnce(Promise.resolve(undefined));
    await handler({}, mockContext, () => {});
    expect(approvePendingJob).toHaveBeenCalledTimes(0);
    expect(cancelWorkflow).toHaveBeenCalledTimes(0);
    expect(mockContext.succeed).toHaveBeenCalledWith({
      pipelineStatus: undefined,
    });
  });

  it('neither approves the pending job nor cancels the workflow while the other workflow is running', async () => {
    getPipelineStatus.mockReturnValueOnce(Promise.resolve('running'));
    await handler({}, mockContext, () => {});
    expect(approvePendingJob).toHaveBeenCalledTimes(0);
    expect(cancelWorkflow).toHaveBeenCalledTimes(0);
    expect(mockContext.succeed).toHaveBeenCalledWith({
      pipelineStatus: 'running',
    });
  });

  it('cancels the workflow if the other workflow was canceled', async () => {
    getPipelineStatus.mockReturnValueOnce(Promise.resolve('canceled'));
    await handler({}, mockContext, () => {});
    expect(approvePendingJob).toHaveBeenCalledTimes(0);
    expect(cancelWorkflow).toHaveBeenCalledTimes(1);
    expect(mockContext.succeed).toHaveBeenCalledWith({
      pipelineStatus: 'canceled',
    });
  });

  it('approves the pending job if the other workflow succeeded', async () => {
    getPipelineStatus.mockReturnValueOnce(Promise.resolve('success'));
    await handler({}, mockContext, () => {});
    expect(approvePendingJob).toHaveBeenCalledTimes(1);
    expect(cancelWorkflow).toHaveBeenCalledTimes(0);
    expect(mockContext.succeed).toHaveBeenCalledWith({
      pipelineStatus: 'success',
    });
  });
});
