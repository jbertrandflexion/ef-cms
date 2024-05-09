import { applicationContext } from '../../../../shared/src/business/test/createTestApplicationContext';
import { disableUser } from '@web-api/gateways/user/disableUser';

describe('disableUser', () => {
  it('should make a call to disable the user with the provided email, lowercased', async () => {
    const mockEmail = 'TeST@example.com';
    const mockUserPoolId = 'test';
    applicationContext.environment.userPoolId = mockUserPoolId;

    await disableUser(applicationContext, {
      email: mockEmail,
    });

    expect(
      applicationContext.getCognito().adminDisableUser,
    ).toHaveBeenCalledWith({
      UserPoolId: mockUserPoolId,
      Username: 'test@example.com',
    });
  });
});
