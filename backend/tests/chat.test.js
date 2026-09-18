const request = require('supertest');
const { app } = require('../server');
const { createUserWithToken } = require('./helpers');
const { UploadSession } = require('../models');

// A couple of chatController's writes (sendMessage's preview/unread update,
// markConversationRead's counter reset) are deliberately fire-and-forget:
// the HTTP response is sent before that write finishes, so the socket event
// and the response reach the client before the DB is updated. A short wait
// lets that settle before we assert on data those writes touch, without
// coupling the tests to the exact fire-and-forget implementation detail.
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

const startConversation = (customerToken, providerId) =>
  request(app).post('/api/chats/start').set('Authorization', `Bearer ${customerToken}`).send({ provider_id: providerId });

const sendText = (token, conversationId, text) =>
  request(app)
    .post(`/api/chats/${conversationId}/messages`)
    .set('Authorization', `Bearer ${token}`)
    .send({ type: 'text', text });

/**
 * Inserts a completed chat UploadSession the way completeChatUpload leaves
 * one, without driving the actual chunked-upload HTTP flow — sendMessage
 * only cares that a completed, unconsumed session exists with a matching
 * uploader/media_type.
 */
const createCompletedChatUpload = (uploaderId, mediaType = 'image') =>
  UploadSession.create({
    uploader: uploaderId,
    filename: `test.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
    media_type: mediaType,
    context: 'chat',
    total_chunks: 1,
    received_chunks: [0],
    temp_dir: '/tmp/karyantrix-test-does-not-matter',
    status: 'completed',
    url: `/uploads/chat-media/fake-${Date.now()}-${Math.round(Math.random() * 1e6)}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
  });

describe('Chat — starting a conversation', () => {
  test('a customer can start a conversation with a provider; it shows up for both sides, unread at 0', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider, token: providerToken } = await createUserWithToken({ role: 'provider' });

    const start = await startConversation(customerToken, provider.id);
    expect(start.status).toBe(201);
    expect(start.body.conversation.other_participant.id).toBe(provider.id);
    expect(start.body.conversation.unread_count).toBe(0);

    // Starting again with the same provider returns the existing thread, not a duplicate.
    const startAgain = await startConversation(customerToken, provider.id);
    expect(startAgain.status).toBe(201);
    expect(startAgain.body.conversation.id).toBe(start.body.conversation.id);

    const customerList = await request(app).get('/api/chats').set('Authorization', `Bearer ${customerToken}`);
    expect(customerList.body.conversations).toHaveLength(1);

    const providerList = await request(app).get('/api/chats').set('Authorization', `Bearer ${providerToken}`);
    expect(providerList.body.conversations).toHaveLength(1);
    expect(providerList.body.conversations[0].other_participant.role).toBe('customer');
  });

  test('rejects starting a conversation with yourself or with a non-provider account', async () => {
    const { user: customer, token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: otherCustomer } = await createUserWithToken({ role: 'customer' });

    const self = await startConversation(customerToken, customer.id);
    expect(self.status).toBe(400);

    const notAProvider = await startConversation(customerToken, otherCustomer.id);
    expect(notAProvider.status).toBe(404);
  });

  test('a provider cannot initiate a conversation (only customers can)', async () => {
    const { token: providerToken } = await createUserWithToken({ role: 'provider' });
    const { user: otherProvider } = await createUserWithToken({ role: 'provider' });

    const res = await startConversation(providerToken, otherProvider.id);
    expect(res.status).toBe(403);
  });
});

describe('Chat — text messages', () => {
  test('messages send, arrive in order, and update the conversation preview + unread count for the other side only', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider, token: providerToken } = await createUserWithToken({ role: 'provider' });
    const start = await startConversation(customerToken, provider.id);
    const conversationId = start.body.conversation.id;

    const send1 = await sendText(customerToken, conversationId, 'Hi, are you available tomorrow?');
    expect(send1.status).toBe(201);
    expect(send1.body.message.text).toBe('Hi, are you available tomorrow?');

    const send2 = await sendText(providerToken, conversationId, 'Yes, morning works.');
    expect(send2.status).toBe(201);
    await settle();

    const messages = await request(app)
      .get(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(messages.status).toBe(200);
    expect(messages.body.messages.map((m) => m.text)).toEqual([
      'Hi, are you available tomorrow?',
      'Yes, morning works.',
    ]);
    expect(messages.body.hasMore).toBe(false);

    // The provider sent the last message, so the customer's unread count
    // goes up — the provider's own count stays at 0.
    const customerList = await request(app).get('/api/chats').set('Authorization', `Bearer ${customerToken}`);
    const customerConvo = customerList.body.conversations.find((c) => c.id === conversationId);
    expect(customerConvo.unread_count).toBe(1);
    expect(customerConvo.last_message_preview).toBe('Yes, morning works.');

    const providerList = await request(app).get('/api/chats').set('Authorization', `Bearer ${providerToken}`);
    expect(providerList.body.conversations.find((c) => c.id === conversationId).unread_count).toBe(0);
  });

  test('rejects an empty/whitespace-only text message', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider } = await createUserWithToken({ role: 'provider' });
    const start = await startConversation(customerToken, provider.id);

    const res = await sendText(customerToken, start.body.conversation.id, '   ');
    expect(res.status).toBe(400);
  });

  test('a stranger cannot read from, post to, or otherwise touch someone else\u2019s conversation', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider } = await createUserWithToken({ role: 'provider' });
    const { token: strangerToken } = await createUserWithToken({ role: 'customer' });
    const start = await startConversation(customerToken, provider.id);
    const conversationId = start.body.conversation.id;

    const read = await request(app)
      .get(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(read.status).toBe(403);

    const post = await sendText(strangerToken, conversationId, 'butting in');
    expect(post.status).toBe(403);
  });

  test('a non-existent conversation returns 404', async () => {
    const { token } = await createUserWithToken({ role: 'customer' });
    const res = await request(app)
      .get('/api/chats/64f000000000000000000000/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('Chat — media messages', () => {
  test('an image message consumes its completed upload session exactly once, and rejects someone else\u2019s upload', async () => {
    const { user: customer, token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider, token: providerToken } = await createUserWithToken({ role: 'provider' });
    const start = await startConversation(customerToken, provider.id);
    const conversationId = start.body.conversation.id;

    const upload = await createCompletedChatUpload(customer.id, 'image');

    const send = await request(app)
      .post(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'image', media_id: upload.id });
    expect(send.status).toBe(201);
    expect(send.body.message.media.url).toBe(upload.url);

    // The same upload can't be attached to a second message.
    const resend = await request(app)
      .post(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'image', media_id: upload.id });
    expect(resend.status).toBe(400);

    // Someone else's completed upload can't be claimed for your message.
    const foreignUpload = await createCompletedChatUpload(provider.id, 'image');
    const foreignSend = await request(app)
      .post(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'image', media_id: foreignUpload.id });
    expect(foreignSend.status).toBe(403);
  });

  test('rejects a media message with no media_id, and one whose upload media_type does not match the declared type', async () => {
    const { user: customer, token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider } = await createUserWithToken({ role: 'provider' });
    const start = await startConversation(customerToken, provider.id);
    const conversationId = start.body.conversation.id;

    const noMediaId = await request(app)
      .post(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'image' });
    expect(noMediaId.status).toBe(400);

    const videoUpload = await createCompletedChatUpload(customer.id, 'video');
    const wrongType = await request(app)
      .post(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'image', media_id: videoUpload.id });
    expect(wrongType.status).toBe(400);
  });
});

describe('Chat — editing and deleting messages', () => {
  test('only the sender can edit their own text message', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider, token: providerToken } = await createUserWithToken({ role: 'provider' });
    const start = await startConversation(customerToken, provider.id);
    const conversationId = start.body.conversation.id;

    const sent = await sendText(customerToken, conversationId, 'Original text');
    const messageId = sent.body.message.id;

    const hijack = await request(app)
      .patch(`/api/chats/${conversationId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ text: 'Hijacked' });
    expect(hijack.status).toBe(403);

    const edit = await request(app)
      .patch(`/api/chats/${conversationId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ text: 'Edited text' });
    expect(edit.status).toBe(200);
    expect(edit.body.message.text).toBe('Edited text');
    expect(edit.body.message.is_edited).toBe(true);
  });

  test('a media message cannot be edited', async () => {
    const { user: customer, token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider } = await createUserWithToken({ role: 'provider' });
    const start = await startConversation(customerToken, provider.id);
    const conversationId = start.body.conversation.id;
    const upload = await createCompletedChatUpload(customer.id, 'image');

    const sent = await request(app)
      .post(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'image', media_id: upload.id });

    const edit = await request(app)
      .patch(`/api/chats/${conversationId}/messages/${sent.body.message.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ text: 'caption?' });
    expect(edit.status).toBe(400);
  });

  test('"delete for me" hides a message only for the deleter; "delete for everyone" replaces it for both but only the sender may do it', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider, token: providerToken } = await createUserWithToken({ role: 'provider' });
    const start = await startConversation(customerToken, provider.id);
    const conversationId = start.body.conversation.id;

    const sent = await sendText(customerToken, conversationId, 'Delete me');
    const messageId = sent.body.message.id;

    const otherDeletesForEveryone = await request(app)
      .delete(`/api/chats/${conversationId}/messages/${messageId}?scope=everyone`)
      .set('Authorization', `Bearer ${providerToken}`);
    expect(otherDeletesForEveryone.status).toBe(403);

    const deleteForMe = await request(app)
      .delete(`/api/chats/${conversationId}/messages/${messageId}?scope=me`)
      .set('Authorization', `Bearer ${providerToken}`);
    expect(deleteForMe.status).toBe(200);

    const providerView = await request(app)
      .get(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${providerToken}`);
    expect(providerView.body.messages.find((m) => m.id === messageId)).toBeUndefined();

    const customerView = await request(app)
      .get(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(customerView.body.messages.find((m) => m.id === messageId)).toBeTruthy();

    const deleteForEveryone = await request(app)
      .delete(`/api/chats/${conversationId}/messages/${messageId}?scope=everyone`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(deleteForEveryone.status).toBe(200);

    const afterEveryone = await request(app)
      .get(`/api/chats/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`);
    const tombstone = afterEveryone.body.messages.find((m) => m.id === messageId);
    expect(tombstone.is_deleted_for_everyone).toBe(true);
    expect(tombstone.text).toBeNull();

    const again = await request(app)
      .delete(`/api/chats/${conversationId}/messages/${messageId}?scope=everyone`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(again.status).toBe(400);
  });

  test('rejects an invalid delete scope', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider } = await createUserWithToken({ role: 'provider' });
    const start = await startConversation(customerToken, provider.id);
    const sent = await sendText(customerToken, start.body.conversation.id, 'Hello');

    const res = await request(app)
      .delete(`/api/chats/${start.body.conversation.id}/messages/${sent.body.message.id}?scope=bogus`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(400);
  });
});

describe('Chat — read receipts', () => {
  test('marking a conversation read resets only the reader\u2019s unread count', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { user: provider, token: providerToken } = await createUserWithToken({ role: 'provider' });
    const start = await startConversation(customerToken, provider.id);
    const conversationId = start.body.conversation.id;

    await sendText(customerToken, conversationId, 'Ping');
    await settle();

    const beforeRead = await request(app).get('/api/chats').set('Authorization', `Bearer ${providerToken}`);
    expect(beforeRead.body.conversations.find((c) => c.id === conversationId).unread_count).toBe(1);

    const markRead = await request(app).patch(`/api/chats/${conversationId}/read`).set('Authorization', `Bearer ${providerToken}`);
    expect(markRead.status).toBe(200);
    await settle();

    const afterRead = await request(app).get('/api/chats').set('Authorization', `Bearer ${providerToken}`);
    expect(afterRead.body.conversations.find((c) => c.id === conversationId).unread_count).toBe(0);

    // The customer's own unread count (for messages the provider sent) is untouched.
    const customerSide = await request(app).get('/api/chats').set('Authorization', `Bearer ${customerToken}`);
    expect(customerSide.body.conversations.find((c) => c.id === conversationId).unread_count).toBe(0);
  });
});
