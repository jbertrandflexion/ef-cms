import { changePassword } from '@web-api/gateways/user/changePassword';
import { confirmSignUp } from '@web-api/gateways/user/confirmSignUp';
import { createUser } from '@web-api/gateways/user/createUser';
import { disableUser } from '@web-api/gateways/user/disableUser';
import { forgotPassword } from '@web-api/gateways/user/forgotPassword';
import { getUserByEmail } from '@web-api/gateways/user/getUserByEmail';
import { initiateAuth } from '@web-api/gateways/user/initiateAuth';
import { renewIdToken } from '@web-api/gateways/user/renewIdToken';
import { signUp } from '@web-api/gateways/user/signUp';
import { updateUser } from '@web-api/gateways/user/updateUser';

export const getUserGateway = () => ({
  changePassword,
  confirmSignUp,
  createUser,
  disableUser,
  forgotPassword,
  getUserByEmail,
  initiateAuth,
  renewIdToken,
  signUp,
  updateUser,
});
