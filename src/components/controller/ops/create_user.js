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

export default createUser;
