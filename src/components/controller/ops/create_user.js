// @flow

import type Context from '../../../context.js';

const kinoCoreApi = process.env.KINO_CORE_API;
if (!kinoCoreApi) throw new Error('KINO_CORE environment variable missing !');

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

  // Create webhook app access and set webhookAppToken
  const { access: { token: webhookAppToken } } = await createAccess(endpoint, personalToken, {
    'type': 'app',
    'name': 'heartkinetics-webhook-service',
    'permissions': [
      {
        'streamId': 'm-scg',
        'level': 'read',
      },
    ],
  });

  // Create bridge app access and set bridgeAppToken
  const { access: { token: bridgeAppToken } } = await createAccess(endpoint, personalToken, {
    'type': 'app',
    'name': 'heartkinetics-bridge-service',
    'permissions': [
      {
        'streamId': 'm-scg',
        'level': 'read',
      },
      {
        'streamId': 'record-summary',
        'level': 'contribute',
      },
      {
        'streamId': 'records',
        'level': 'manage',
      },
    ],
  });

  // Create webhook
  await createWebhook(endpoint, webhookAppToken, newUser.username);

  // Send appToken to bridge
  await sendAppTokenToBridge(newUser.username, bridgeAppToken);

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

async function createAccess (endpoint, personalToken, body) {
  const response = await fetch(`${endpoint}/accesses`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': personalToken,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw Error(response.statusText);
  }

  const data = await response.json();
  return data;
}

async function createWebhook (endpoint, appToken, username) {
  const response = await fetch(`${endpoint}/webhooks`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': appToken,
    },
    body: JSON.stringify({
      'url': `${kinoCoreApi}/${username}`,
    }),
  });

  if (!response.ok) {
    throw Error(response.statusText);
  }
}

async function sendAppTokenToBridge (username, appToken) {
  const response = await fetch(`${kinoCoreApi}/userPryvToken`, {
    method: 'POST',
    headers: {
      'Username': username,
      'Token': appToken,
    },
  });

  if (!response.ok) {
    throw Error(response.statusText);
  }
}

export default createUser;
