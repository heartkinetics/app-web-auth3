// @flow

import type Context from '../../../context.js';

export type NewUser = {
  username: string,
  server: string,
};

async function createUser (
  ctx: Context,
  availableCore: string,
  password: string,
  email: string,
  hosting: string,
  studyCode: string,
  subjectCode: string,
): Promise<NewUser> {
  // Create the new user
  let referer = null;
  if (ctx.accessState) {
    referer = ctx.accessState.referer || ctx.accessState.requestingAppId;
  };
  const newUser = await ctx.pryvService.createUser(
    availableCore,
    ctx.user.username,
    password,
    email,
    hosting,
    ctx.language,
    ctx.appId,
    null, // <== invitation token should go here
    referer);

  // Set endpoint and personalToken from apiEndpoint
  const url = new URL(newUser.apiEndpoint);
  const endpoint = url.origin;
  const personalToken = url.username;

  // Create external-references stream
  await createExternalReferencesStream(endpoint, personalToken);

  // Create external-reference event
  await createExternalReferenceEvent(endpoint, personalToken, studyCode, subjectCode);

  // // Create app access and set appAccessToken
  // const { access: { token: appToken } } = await createAppAccess(endpoint, personalToken);

  // // Create webhook
  // await createWebhook(endpoint, appToken);

  // // Send appToken to bridge
  // await sendAppTokenToBridge(appToken);

  return newUser;
}

async function createExternalReferencesStream (endpoint, personalToken) {
  const response = await fetch(`${endpoint}/streams`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': personalToken,
    },
    body: JSON.stringify({
      'id': 'external-references',
      'name': 'External references',
      'parentId': null,
    }),
  });

  if (!response.ok) {
    throw Error(response.statusText);
  }
}

async function createExternalReferenceEvent (endpoint, personalToken, studyCode, subjectCode) {
  const response = await fetch(`${endpoint}/events`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': personalToken,
    },
    body: JSON.stringify({
      'streamIds': ['external-references'],
      'type': 'external-reference/kino-research',
      'content': {
        'studyCode': studyCode,
        'subjectCode': subjectCode,
      },
    }),
  });

  if (!response.ok) {
    throw Error(response.statusText);
  }
}

// async function createAppAccess (endpoint, personalToken) {
//   const response = await fetch(`${endpoint}/accesses`, {
//     method: 'POST',
//     headers: {
//       'Accept': 'application/json',
//       'Content-Type': 'application/json',
//       'Authorization': personalToken,
//     },
//     body: JSON.stringify({
//       'type': 'app',
//       'name': 'heartkinetics-service',
//       'permissions': [
//         {
//           'streamId': '*',
//           'level': 'contribute',
//         },
//       ],
//     }),
//   });

//   if (!response.ok) {
//     throw Error(response.statusText);
//   }

//   const data = await response.json();
//   return data;
// }

// async function createWebhook (endpoint, appToken) {
//   const response = await fetch(`${endpoint}/webhooks`, {
//     method: 'POST',
//     headers: {
//       'Accept': 'application/json',
//       'Content-Type': 'application/json',
//       'Authorization': appToken,
//     },
//     body: JSON.stringify({
//       'url': 'https://test.io/webhhoks',
//     }),
//   });

//   if (!response.ok) {
//     throw Error(response.statusText);
//   }
// }

// async function sendAppTokenToBridge (appToken) {
//   const response = await fetch(`https://test.io/appTokens`, {
//     method: 'POST',
//     headers: {
//       'Accept': 'application/json',
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       'token': appToken,
//     }),
//   });

//   if (!response.ok) {
//     throw Error(response.statusText);
//   }
// }

export default createUser;
