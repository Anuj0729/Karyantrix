const PORT = process.env.PORT || 5000;

const okMessage = (example) => ({
  type: 'object',
  properties: { message: { type: 'string', example } },
});

const errorResponse = {
  type: 'object',
  properties: { message: { type: 'string', example: 'Something went wrong' } },
};

const paginated = (itemsRef) => ({
  type: 'object',
  properties: {
    total: { type: 'integer', example: 42 },
    page: { type: 'integer', example: 1 },
    pages: { type: 'integer', example: 5 },
    items: { type: 'array', items: { $ref: itemsRef } },
  },
});

const idParam = (name = 'id', description = 'Resource id') => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description,
});

const bearerAuth = [{ bearerAuth: [] }];

const responses401 = { description: 'Not authorized (missing/invalid/expired token)', content: { 'application/json': { schema: errorResponse } } };
const responses403 = { description: 'Forbidden for the current role', content: { 'application/json': { schema: errorResponse } } };
const responses404 = { description: 'Not found', content: { 'application/json': { schema: errorResponse } } };
const responses400 = { description: 'Validation error', content: { 'application/json': { schema: errorResponse } } };

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Karyantrix API',
    version: '1.0.0',
    description:
      'REST API for Karyantrix, a local service-marketplace platform connecting customers who post service requirements with verified providers who bid on them. ' +
      'Covers authentication (OTP + password based), the provider onboarding/application flow, the service catalog & listings, requirement posting & bidding, ' +
      'reviews, real-time chat (backed by Socket.io), notifications, moderation reports, chunked media uploads, and the admin console.\n\n' +
      'Authentication: most endpoints require a JWT access token sent as `Authorization: Bearer <token>`. Access tokens are short‑lived; a refresh token is issued ' +
      'as an httpOnly cookie by `/auth/login` and `/auth/register/verify` and exchanged for a new access token via `POST /auth/refresh`.',
    contact: { name: 'Karyantrix' },
  },
  servers: [{ url: `http://localhost:${PORT}/api`, description: 'Local development server' }],
  tags: [
    { name: 'Health', description: 'Service status' },
    { name: 'Auth', description: 'Registration, login, password/contact management' },
    { name: 'Categories', description: 'Top-level service categories' },
    { name: 'Service Catalog', description: 'Admin-managed catalog of service types within a category' },
    { name: 'Services', description: 'Listings a provider offers, built from the catalog' },
    { name: 'Providers', description: 'Provider directory, profile, and become-a-provider application flow' },
    { name: 'Requirements', description: 'Customer service requests, provider interest, and bidding' },
    { name: 'Bookings', description: 'Post-acceptance job lifecycle: advance/balance payments (Razorpay) and progress updates' },
    { name: 'Reviews', description: 'Customer reviews of providers' },
    { name: 'Chats', description: 'Conversations, messages, and chat media uploads' },
    { name: 'Notifications', description: 'In-app notifications' },
    { name: 'Reports', description: 'User-filed moderation reports' },
    { name: 'Uploads', description: 'Chunked media upload pipeline for requirement posts and provider portfolio photos (customer or provider)' },
    { name: 'Admin', description: 'Admin-only dashboard, moderation, and content management' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['customer', 'provider', 'admin'] },
          avatar_url: { type: 'string', nullable: true },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          icon: { type: 'string' },
          description: { type: 'string' },
        },
      },
      ServiceCatalogItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: { type: 'string', description: 'Category id' },
          name: { type: 'string' },
          unit: { type: 'string', example: 'per hour' },
        },
      },
      Service: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          provider: { type: 'string', description: 'Provider (user) id' },
          catalog_item: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      Provider: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
          bio: { type: 'string' },
          coverage_radius_km: { type: 'number' },
          application_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          avg_rating: { type: 'number' },
          total_reviews: { type: 'integer' },
          portfolio: {
            type: 'array',
            description: 'Portfolio work items. Sent as the full desired array on PUT /providers/me — add by appending an item, update by editing an item in place, delete by omitting it — the array replaces the previously stored one.',
            items: {
              type: 'object',
              properties: {
                image_url: { type: 'string', example: '/uploads/requirements/64f0c1...jpg' },
                title: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
          certifications: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, issuer: { type: 'string' }, year: { type: 'integer' } },
            },
          },
        },
      },
      Requirement: {
        type: 'object',
        description: 'A customer service request. `services`/`experience_levels` also accept the singular aliases `service`/`experience_required` on write.',
        properties: {
          id: { type: 'string' },
          customer: { type: 'string' },
          categories: { type: 'array', items: { type: 'string' }, description: 'Category ids' },
          services: { type: 'array', items: { type: 'string' }, example: ['Plumbing repair'] },
          description: { type: 'string' },
          budget: { type: 'number' },
          experience_levels: {
            type: 'array',
            items: { type: 'string', enum: ['any', 'beginner', 'intermediate', 'expert'] },
            default: ['any'],
          },
          status: { type: 'string', enum: ['open', 'closed'] },
          location: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
          media: {
            type: 'array',
            items: {
              type: 'object',
              properties: { url: { type: 'string' }, type: { type: 'string', enum: ['image', 'video'] } },
            },
            description: 'Populated from media_ids on create/update',
          },
          hired_provider: { type: 'string', nullable: true },
          hired_bid: { type: 'string', nullable: true },
          hired_at: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      RequirementInput: {
        type: 'object',
        required: ['services', 'description', 'budget', 'category_ids', 'location_text', 'lat', 'lng'],
        properties: {
          services: { type: 'array', items: { type: 'string' }, description: 'Alias: service (singular)' },
          category_ids: { type: 'array', items: { type: 'string' } },
          description: { type: 'string', maxLength: 2000 },
          budget: { type: 'number', minimum: 0 },
          experience_levels: {
            type: 'array',
            items: { type: 'string', enum: ['any', 'beginner', 'intermediate', 'expert'] },
            description: 'Alias: experience_required',
          },
          location_text: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          media_ids: { type: 'array', items: { type: 'string' }, description: 'Ids of completed upload sessions from POST /uploads' },
        },
      },
      Bid: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          requirement: { type: 'string' },
          provider: { type: 'string' },
          amount: { type: 'number' },
          message: { type: 'string', nullable: true, description: 'Optional note from the provider accompanying the bid' },
          status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          requirement: { type: 'string' },
          provider: { type: 'string' },
          customer: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string', nullable: true },
          title: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['published', 'pending', 'flagged'] },
          provider_response: {
            type: 'object',
            nullable: true,
            properties: { text: { type: 'string' }, responded_at: { type: 'string', format: 'date-time' } },
          },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          other_participant: { $ref: '#/components/schemas/User' },
          my_role_in_chat: { type: 'string', enum: ['customer', 'provider'] },
          last_message_preview: { type: 'string', nullable: true },
          last_message_type: { type: 'string', enum: ['text', 'image', 'video', 'audio'], nullable: true },
          last_message_at: { type: 'string', format: 'date-time', nullable: true },
          last_message_sender: { type: 'string', nullable: true },
          unread_count: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          conversation: { type: 'string' },
          sender: { type: 'string' },
          type: { type: 'string', enum: ['text', 'image', 'video', 'audio'] },
          text: { type: 'string', nullable: true },
          media: {
            type: 'object',
            nullable: true,
            properties: {
              url: { type: 'string' },
              media_type: { type: 'string', enum: ['image', 'video', 'audio'], nullable: true },
              upload_id: { type: 'string' },
              is_voice_note: { type: 'boolean' },
            },
          },
          is_read: { type: 'boolean' },
          is_edited: { type: 'boolean' },
          edited_at: { type: 'string', format: 'date-time', nullable: true },
          is_deleted_for_everyone: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user: { type: 'string' },
          type: { type: 'string', example: 'bid' },
          title: { type: 'string' },
          message: { type: 'string' },
          related_requirement: { type: 'string', nullable: true },
          is_read: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Report: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          reporter: { type: 'string' },
          reporter_role: { type: 'string', enum: ['customer', 'provider'] },
          reported_user: { type: 'string' },
          reported_role: { type: 'string', enum: ['customer', 'provider'] },
          reason: {
            type: 'string',
            enum: [
              'spam_or_scam',
              'fraud_or_non_payment',
              'abusive_behavior',
              'fake_profile',
              'poor_service_quality',
              'inappropriate_content',
              'safety_concern',
              'other',
            ],
          },
          description: { type: 'string' },
          context: {
            type: 'object',
            properties: {
              requirement: { type: 'string', nullable: true },
              conversation: { type: 'string', nullable: true },
            },
          },
          status: { type: 'string', enum: ['pending', 'under_review', 'action_taken', 'dismissed'] },
          action_taken: { type: 'string', enum: ['none', 'warning_sent', 'account_suspended', 'account_banned'] },
          admin_notes: { type: 'string', nullable: true },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      PaymentLeg: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'paid'] },
          razorpay_order_id: { type: 'string', nullable: true },
          razorpay_payment_id: { type: 'string', nullable: true },
          paid_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      ProgressUpdate: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          note: { type: 'string' },
          media: {
            type: 'array',
            items: {
              type: 'object',
              properties: { url: { type: 'string' }, type: { type: 'string', enum: ['image', 'video'] } },
            },
          },
          is_final: { type: 'boolean', description: 'True when this update represents the fully finished job' },
          status: { type: 'string', enum: ['pending', 'approved', 'changes_requested'] },
          customer_feedback: { type: 'string', nullable: true },
          responded_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Booking: {
        type: 'object',
        description: 'Created once a customer accepts a bid; tracks the advance/balance Razorpay payments and day-by-day progress updates for a requirement.',
        properties: {
          id: { type: 'string' },
          requirement: { type: 'string', description: 'Requirement id' },
          bid: { type: 'string', description: 'Accepted bid id' },
          customer: { type: 'string' },
          provider: { type: 'string' },
          total_amount: { type: 'number' },
          advance_percent: { type: 'number' },
          advance_amount: { type: 'number' },
          balance_amount: { type: 'number' },
          status: { type: 'string', enum: ['awaiting_advance', 'in_progress', 'work_completed', 'completed'] },
          advance: { $ref: '#/components/schemas/PaymentLeg' },
          balance: { $ref: '#/components/schemas/PaymentLeg' },
          progress_updates: { type: 'array', items: { $ref: '#/components/schemas/ProgressUpdate' } },
          work_completed_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      RazorpayOrder: {
        type: 'object',
        properties: {
          order_id: { type: 'string' },
          amount: { type: 'integer', description: 'Amount in paise' },
          currency: { type: 'string', example: 'INR' },
          key_id: { type: 'string', description: 'Razorpay public key id, for the client-side checkout widget' },
          booking_id: { type: 'string' },
        },
      },
      Error: errorResponse,
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service health check',
        responses: {
          200: {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'karyantrix-backend' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/auth/register/initiate': {
      post: {
        tags: ['Auth'], summary: 'Start registration and send an OTP to email/phone',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'identifier', 'password'], properties: { name: { type: 'string' }, identifier: { type: 'string', description: 'Email address or phone number' }, password: { type: 'string', minLength: 6 } } } } } },
        responses: { 200: { description: 'OTP sent', content: { 'application/json': { schema: okMessage('OTP sent') } } }, 400: responses400, 409: { description: 'Account already exists', content: { 'application/json': { schema: errorResponse } } } },
      },
    },
    '/auth/register/resend-otp': {
      post: { tags: ['Auth'], summary: 'Resend the registration OTP', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier'], properties: { identifier: { type: 'string' } } } } } }, responses: { 200: { description: 'OTP resent', content: { 'application/json': { schema: okMessage('OTP resent') } } }, 400: responses400 } },
    },
    '/auth/register/verify': {
      post: {
        tags: ['Auth'], summary: 'Verify OTP and complete registration',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier', 'otp'], properties: { identifier: { type: 'string' }, otp: { type: 'string' } } } } } },
        responses: { 201: { description: 'Account created, refresh token set as httpOnly cookie', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } }, 400: responses400 },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login with identifier + password',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier', 'password'], properties: { identifier: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 200: { description: 'Logged in, refresh token set as httpOnly cookie', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } }, 401: { description: 'Invalid credentials', content: { 'application/json': { schema: errorResponse } } } },
      },
    },
    '/auth/login/otp/request': {
      post: { tags: ['Auth'], summary: 'Request an OTP for passwordless login', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier'], properties: { identifier: { type: 'string' } } } } } }, responses: { 200: { description: 'OTP sent', content: { 'application/json': { schema: okMessage('OTP sent') } } } } },
    },
    '/auth/login/otp/verify': {
      post: { tags: ['Auth'], summary: 'Verify OTP and log in', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier', 'otp'], properties: { identifier: { type: 'string' }, otp: { type: 'string' } } } } } }, responses: { 200: { description: 'Logged in', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } } } },
    },
    '/auth/password/forgot': {
      post: { tags: ['Auth'], summary: 'Request a password-reset OTP', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier'], properties: { identifier: { type: 'string' } } } } } }, responses: { 200: { description: 'OTP sent', content: { 'application/json': { schema: okMessage('OTP sent') } } } } },
    },
    '/auth/password/verify-reset-otp': {
      post: { tags: ['Auth'], summary: 'Verify a password-reset OTP', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier', 'otp'], properties: { identifier: { type: 'string' }, otp: { type: 'string' } } } } } }, responses: { 200: { description: 'OTP valid' } } },
    },
    '/auth/password/reset': {
      post: { tags: ['Auth'], summary: 'Reset password after OTP verification', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier', 'otp', 'password'], properties: { identifier: { type: 'string' }, otp: { type: 'string' }, password: { type: 'string', minLength: 6 } } } } } }, responses: { 200: { description: 'Password reset', content: { 'application/json': { schema: okMessage('Password has been reset') } } } } },
    },
    '/auth/password/change': {
      post: { tags: ['Auth'], summary: 'Change password while logged in', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 6 } } } } } }, responses: { 200: { description: 'Password changed' }, 401: responses401 } },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Get the logged-in user\'s profile', security: bearerAuth, responses: { 200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, 401: responses401 } },
      put: { tags: ['Auth'], summary: 'Update the logged-in user\'s profile', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } } }, responses: { 200: { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, 401: responses401 } },
    },
    '/auth/me/avatar': {
      post: { tags: ['Auth'], summary: 'Upload/replace the logged-in user\'s avatar', security: bearerAuth, requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } } } }, responses: { 200: { description: 'Avatar updated' }, 401: responses401 } },
      delete: { tags: ['Auth'], summary: 'Remove the logged-in user\'s avatar', security: bearerAuth, responses: { 200: { description: 'Avatar removed' }, 401: responses401 } },
    },
    '/auth/me/contact/request-otp': {
      post: { tags: ['Auth'], summary: 'Request an OTP to change email/phone', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier'], properties: { identifier: { type: 'string' } } } } } }, responses: { 200: { description: 'OTP sent' }, 401: responses401 } },
    },
    '/auth/me/contact/verify-otp': {
      post: { tags: ['Auth'], summary: 'Verify OTP and update email/phone', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identifier', 'otp'], properties: { identifier: { type: 'string' }, otp: { type: 'string' } } } } } }, responses: { 200: { description: 'Contact updated' }, 401: responses401 } },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Exchange the httpOnly refresh-token cookie for a new access token', responses: { 200: { description: 'New access token issued', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } }, 401: { description: 'Missing/invalid refresh token' } } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Log out and clear the refresh-token cookie', security: bearerAuth, responses: { 200: { description: 'Logged out' }, 401: responses401 } },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'], summary: 'Sign in (or sign up) with a Google ID token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['credential'], properties: { credential: { type: 'string', description: 'Google Sign-In ID token (JWT credential)' } } } } } },
        responses: {
          200: { description: 'Logged in, refresh token set as httpOnly cookie', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
          400: responses400,
          401: { description: 'Invalid/expired Google credential, or the Google account email is unverified', content: { 'application/json': { schema: errorResponse } } },
          500: { description: 'Google sign-in is not configured on this server', content: { 'application/json': { schema: errorResponse } } },
        },
      },
    },

    '/categories': {
      get: { tags: ['Categories'], summary: 'List all categories', responses: { 200: { description: 'List of categories', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } } } } },
      post: { tags: ['Categories'], summary: 'Create a category (admin)', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, responses: { 201: { description: 'Created' }, 401: responses401, 403: responses403 } },
    },
    '/categories/id/{id}': {
      get: { tags: ['Categories'], summary: 'Get a category by id', parameters: [idParam()], responses: { 200: { description: 'Category', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, 404: responses404 } },
    },
    '/categories/{slug}': {
      get: { tags: ['Categories'], summary: 'Get a category by slug', parameters: [idParam('slug', 'Category slug')], responses: { 200: { description: 'Category', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, 404: responses404 } },
    },
    '/categories/{id}': {
      put: { tags: ['Categories'], summary: 'Update a category (admin)', security: bearerAuth, parameters: [idParam()], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, responses: { 200: { description: 'Updated' }, 401: responses401, 403: responses403, 404: responses404 } },
      delete: { tags: ['Categories'], summary: 'Delete a category (admin)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Deleted' }, 401: responses401, 403: responses403, 404: responses404 } },
    },

    '/service-catalog': {
      get: { tags: ['Service Catalog'], summary: 'List catalog items (optionally by category)', parameters: [{ name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category id' }], responses: { 200: { description: 'Catalog items', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ServiceCatalogItem' } } } } } } },
      post: { tags: ['Service Catalog'], summary: 'Create a catalog item (admin)', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ServiceCatalogItem' } } } }, responses: { 201: { description: 'Created' }, 401: responses401, 403: responses403 } },
    },
    '/service-catalog/{id}': {
      put: { tags: ['Service Catalog'], summary: 'Update a catalog item (admin)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Updated' }, 401: responses401, 403: responses403 } },
      delete: { tags: ['Service Catalog'], summary: 'Delete a catalog item (admin)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Deleted' }, 401: responses401, 403: responses403 } },
    },

    '/services': {
      get: { tags: ['Services'], summary: 'Browse/search published services', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'Services', content: { 'application/json': { schema: paginated('#/components/schemas/Service') } } } } },
      post: { tags: ['Services'], summary: 'Create a service listing (provider or provider-applicant)', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Service' } } } }, responses: { 201: { description: 'Created' }, 401: responses401, 403: responses403 } },
    },
    '/services/bulk': {
      post: { tags: ['Services'], summary: 'Create multiple service listings at once', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Service' } } } } }, responses: { 201: { description: 'Created' }, 401: responses401, 403: responses403 } },
    },
    '/services/my/listings': {
      get: { tags: ['Services'], summary: 'List the logged-in provider/applicant\'s own services', security: bearerAuth, responses: { 200: { description: 'Own services', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Service' } } } } }, 401: responses401, 403: responses403 } },
    },
    '/services/{id}': {
      get: { tags: ['Services'], summary: 'Get a service by id', parameters: [idParam()], responses: { 200: { description: 'Service', content: { 'application/json': { schema: { $ref: '#/components/schemas/Service' } } } }, 404: responses404 } },
      put: { tags: ['Services'], summary: 'Update a service', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Updated' }, 401: responses401, 403: responses403, 404: responses404 } },
      delete: { tags: ['Services'], summary: 'Delete a service', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Deleted' }, 401: responses401, 403: responses403, 404: responses404 } },
    },

    '/providers': {
      get: { tags: ['Providers'], summary: 'Public provider directory (search/filter)', parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'lat', in: 'query', schema: { type: 'number' } }, { name: 'lng', in: 'query', schema: { type: 'number' } }], responses: { 200: { description: 'Providers', content: { 'application/json': { schema: paginated('#/components/schemas/Provider') } } } } },
    },
    '/providers/me': {
      get: { tags: ['Providers'], summary: 'Get the logged-in provider\'s own profile', security: bearerAuth, responses: { 200: { description: 'Provider profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/Provider' } } } }, 401: responses401, 403: responses403 } },
      put: { tags: ['Providers'], summary: 'Update the logged-in provider\'s own profile', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Provider' } } } }, responses: { 200: { description: 'Updated' }, 401: responses401, 403: responses403 } },
    },
    '/providers/become': {
      post: { tags: ['Providers'], summary: 'Start the become-a-provider application', security: bearerAuth, responses: { 200: { description: 'Application started' }, 401: responses401 } },
    },
    '/providers/application/me': {
      get: { tags: ['Providers'], summary: 'Get the logged-in user\'s in-progress application', security: bearerAuth, responses: { 200: { description: 'Application' }, 401: responses401 } },
      put: { tags: ['Providers'], summary: 'Save a step of the multi-step provider application', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Step saved' }, 401: responses401 } },
    },
    '/providers/application/submit': {
      post: { tags: ['Providers'], summary: 'Submit the completed provider application for review', security: bearerAuth, responses: { 200: { description: 'Application submitted' }, 401: responses401 } },
    },
    '/providers/{id}': {
      get: { tags: ['Providers'], summary: 'Get a provider\'s public profile', parameters: [idParam()], responses: { 200: { description: 'Provider profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/Provider' } } } }, 404: responses404 } },
    },

    '/requirements': {
      get: { tags: ['Requirements'], summary: 'Browse the open-requirements feed (public; radius-filtered for logged-in providers)', parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }, { name: 'lat', in: 'query', schema: { type: 'number' } }, { name: 'lng', in: 'query', schema: { type: 'number' } }], responses: { 200: { description: 'Requirements feed', content: { 'application/json': { schema: paginated('#/components/schemas/Requirement') } } } } },
      post: { tags: ['Requirements'], summary: 'Post a new service requirement (customer)', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RequirementInput' } } } }, responses: { 201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Requirement' } } } }, 401: responses401, 403: responses403 } },
    },
    '/requirements/mine': {
      get: { tags: ['Requirements'], summary: 'List the logged-in customer\'s own requirements', security: bearerAuth, responses: { 200: { description: 'Own requirements', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Requirement' } } } } }, 401: responses401, 403: responses403 } },
    },
    '/requirements/bids/mine': {
      get: { tags: ['Requirements'], summary: 'List the logged-in provider\'s own bids', security: bearerAuth, responses: { 200: { description: 'Own bids', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Bid' } } } } }, 401: responses401, 403: responses403 } },
    },
    '/requirements/{id}': {
      put: {
        tags: ['Requirements'], summary: 'Update a requirement (owning customer)', security: bearerAuth, parameters: [idParam()],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'All fields optional — only the fields provided are updated',
                properties: {
                  services: { type: 'array', items: { type: 'string' }, description: 'Alias: service' },
                  category_ids: { type: 'array', items: { type: 'string' } },
                  description: { type: 'string' },
                  budget: { type: 'number' },
                  experience_levels: { type: 'array', items: { type: 'string', enum: ['any', 'beginner', 'intermediate', 'expert'] }, description: 'Alias: experience_required' },
                  location_text: { type: 'string' },
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                  media_ids: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' }, 401: responses401, 403: responses403, 404: responses404 },
      },
      delete: { tags: ['Requirements'], summary: 'Delete a requirement (owning customer)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Deleted' }, 401: responses401, 403: responses403, 404: responses404 } },
    },
    '/requirements/{id}/interest': {
      post: { tags: ['Requirements'], summary: 'Express interest in a requirement (provider)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Interest recorded' }, 401: responses401, 403: responses403, 404: responses404 } },
    },
    '/requirements/{id}/close': {
      patch: { tags: ['Requirements'], summary: 'Close a requirement to further bids (owning customer)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Closed' }, 401: responses401, 403: responses403, 404: responses404 } },
    },
    '/requirements/{id}/bids': {
      get: { tags: ['Requirements'], summary: "List the bids on a requirement (owning customer: every bid; providers who can see the post: each provider's latest bid, with is_mine set on their own)", security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Bids', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Bid' } } } } }, 401: responses401, 403: responses403 } },
      post: { tags: ['Requirements'], summary: 'Place a bid on a requirement (provider)', security: bearerAuth, parameters: [idParam()], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'number' }, message: { type: 'string', description: 'Optional note to the customer' } } } } } }, responses: { 201: { description: 'Bid placed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Bid' } } } }, 400: responses400, 401: responses401, 403: responses403, 404: responses404 } },
      put: { tags: ['Requirements'], summary: 'Update your own bid on a requirement (provider)', security: bearerAuth, parameters: [idParam()], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { amount: { type: 'number' }, message: { type: 'string' } } } } } }, responses: { 200: { description: 'Bid updated' }, 401: responses401, 403: responses403 } },
    },
    '/requirements/{id}/bids/{bidId}/accept': {
      patch: { tags: ['Requirements'], summary: 'Accept a bid on a requirement (owning customer)', security: bearerAuth, parameters: [idParam(), idParam('bidId', 'Bid id')], responses: { 200: { description: 'Bid accepted' }, 401: responses401, 403: responses403, 404: responses404 } },
    },

    '/bookings/mine': {
      get: { tags: ['Bookings'], summary: "List the logged-in user's bookings (customer or provider)", security: bearerAuth, responses: { 200: { description: 'Bookings', content: { 'application/json': { schema: { type: 'object', properties: { bookings: { type: 'array', items: { $ref: '#/components/schemas/Booking' } } } } } } }, 401: responses401 } },
    },
    '/bookings/{id}': {
      get: { tags: ['Bookings'], summary: 'Get a single booking (customer, provider, or admin on it)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Booking', content: { 'application/json': { schema: { type: 'object', properties: { booking: { $ref: '#/components/schemas/Booking' } } } } } }, 401: responses401, 403: responses403, 404: responses404 } },
    },
    '/bookings/{id}/advance/order': {
      post: { tags: ['Bookings'], summary: 'Create a Razorpay order for the advance payment (customer)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Razorpay order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/RazorpayOrder' } } } }, 400: { description: 'Advance is not due, or already paid', content: { 'application/json': { schema: errorResponse } } }, 401: responses401, 403: responses403, 404: responses404 } },
    },
    '/bookings/{id}/advance/verify': {
      post: {
        tags: ['Bookings'], summary: "Verify the advance payment's Razorpay signature and move the booking to in_progress (customer)", security: bearerAuth, parameters: [idParam()],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'], properties: { razorpay_order_id: { type: 'string' }, razorpay_payment_id: { type: 'string' }, razorpay_signature: { type: 'string' } } } } } },
        responses: { 200: { description: 'Advance verified, work can begin', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, booking: { $ref: '#/components/schemas/Booking' } } } } } }, 400: { description: 'Missing fields, order mismatch, already paid, or signature verification failed', content: { 'application/json': { schema: errorResponse } } }, 401: responses401, 403: responses403, 404: responses404 },
      },
    },
    '/bookings/{id}/progress': {
      post: {
        tags: ['Bookings'], summary: 'Post a progress update with photos/videos of the work done so far (provider)', security: bearerAuth, parameters: [idParam()],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['note', 'media'], properties: { note: { type: 'string', description: 'Short note describing the work done' }, is_final: { type: 'boolean', description: 'Set true when this update represents the entire job being finished' }, media: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Up to 10 photos/videos' } } } } } },
        responses: { 201: { description: 'Progress update posted', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, booking: { $ref: '#/components/schemas/Booking' } } } } } }, 400: { description: 'Job not in progress, missing note, or no media attached', content: { 'application/json': { schema: errorResponse } } }, 401: responses401, 403: responses403, 404: responses404 },
      },
    },
    '/bookings/{id}/progress/{updateId}/respond': {
      patch: {
        tags: ['Bookings'], summary: 'Approve a progress update or request changes (customer)', security: bearerAuth, parameters: [idParam(), idParam('updateId', 'Progress update id')],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['action'], properties: { action: { type: 'string', enum: ['approve', 'request_changes'] }, feedback: { type: 'string', description: 'Required when action is request_changes' } } } } } },
        responses: { 200: { description: 'Response recorded', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, booking: { $ref: '#/components/schemas/Booking' } } } } } }, 400: responses400, 401: responses401, 403: responses403, 404: responses404 },
      },
    },
    '/bookings/{id}/complete-work': {
      patch: { tags: ['Bookings'], summary: 'Mark the job as fully completed once the final progress update is approved (provider)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Marked completed, balance now due', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, booking: { $ref: '#/components/schemas/Booking' } } } } } }, 400: { description: 'Not in progress yet, or no approved final update', content: { 'application/json': { schema: errorResponse } } }, 401: responses401, 403: responses403, 404: responses404 } },
    },
    '/bookings/{id}/balance/order': {
      post: { tags: ['Bookings'], summary: 'Create a Razorpay order for the final balance payment (customer)', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Razorpay order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/RazorpayOrder' } } } }, 400: { description: 'Balance is not due, or already paid', content: { 'application/json': { schema: errorResponse } } }, 401: responses401, 403: responses403, 404: responses404 } },
    },
    '/bookings/{id}/balance/verify': {
      post: {
        tags: ['Bookings'], summary: "Verify the balance payment's Razorpay signature and mark the booking completed (customer)", security: bearerAuth, parameters: [idParam()],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'], properties: { razorpay_order_id: { type: 'string' }, razorpay_payment_id: { type: 'string' }, razorpay_signature: { type: 'string' } } } } } },
        responses: { 200: { description: 'Balance verified, booking completed', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, booking: { $ref: '#/components/schemas/Booking' } } } } } }, 400: { description: 'Missing fields, order mismatch, already paid, or signature verification failed', content: { 'application/json': { schema: errorResponse } } }, 401: responses401, 403: responses403, 404: responses404 },
      },
    },

    '/reviews': {
      post: {
        tags: ['Reviews'], summary: "Leave a review for the hired provider on one of the customer's own closed requirements", security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['requirement_id', 'rating'],
                properties: {
                  requirement_id: { type: 'string', description: 'Must be a closed requirement the caller owns, with a hired provider' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  comment: { type: 'string' },
                  title: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Review created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Review' } } } },
          400: responses400,
          401: responses401,
          403: responses403,
          404: responses404,
          409: { description: 'This requirement has already been reviewed', content: { 'application/json': { schema: errorResponse } } },
        },
      },
    },
    '/reviews/provider/{providerId}': {
      get: { tags: ['Reviews'], summary: 'List reviews for a provider', parameters: [idParam('providerId', 'Provider id')], responses: { 200: { description: 'Reviews', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Review' } } } } } } },
    },
    '/reviews/mine/{requirementId}': {
      get: { tags: ['Reviews'], summary: "Get the logged-in customer's review for a requirement, if any", security: bearerAuth, parameters: [idParam('requirementId', 'Requirement id')], responses: { 200: { description: 'Review or null', content: { 'application/json': { schema: { type: 'object', properties: { review: { $ref: '#/components/schemas/Review' }, nullable: true } } } } }, 401: responses401 } },
    },
    '/reviews/{id}': {
      patch: { tags: ['Reviews'], summary: 'Edit your own review (rating/comment/title)', security: bearerAuth, parameters: [idParam()], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' }, title: { type: 'string', nullable: true } } } } } }, responses: { 200: { description: 'Review updated' }, 400: responses400, 401: responses401, 403: responses403, 404: responses404 } },
    },

    '/chats/start': {
      post: {
        tags: ['Chats'], summary: 'Start (or fetch the existing) conversation with a provider (customer only)', security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['provider_id'],
                properties: { provider_id: { type: 'string', description: 'Only provider_id is used here — send an opening line with a follow-up POST /chats/{conversationId}/messages' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Conversation started or found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Conversation' } } } }, 400: responses400, 401: responses401, 403: responses403, 404: { description: 'Provider not found or inactive', content: { 'application/json': { schema: errorResponse } } } },
      },
    },
    '/chats': {
      get: { tags: ['Chats'], summary: 'List the logged-in user\'s conversations', security: bearerAuth, responses: { 200: { description: 'Conversations', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Conversation' } } } } }, 401: responses401 } },
    },
    '/chats/{conversationId}/messages': {
      get: { tags: ['Chats'], summary: 'Get messages in a conversation', security: bearerAuth, parameters: [idParam('conversationId', 'Conversation id')], responses: { 200: { description: 'Messages', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } }, 401: responses401 } },
      post: {
        tags: ['Chats'], summary: 'Send a message in a conversation', security: bearerAuth, parameters: [idParam('conversationId', 'Conversation id')],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['type'],
                properties: {
                  type: { type: 'string', enum: ['text', 'image', 'video', 'audio'], default: 'text' },
                  text: { type: 'string', description: 'Required when type is text' },
                  media_id: { type: 'string', description: 'Id of a completed chat upload (POST /chats/uploads/:uploadId/complete); required when type is image/video/audio' },
                  is_voice_note: { type: 'boolean', description: 'Only meaningful when type is audio' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Message sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } }, 400: responses400, 401: responses401, 403: responses403 },
      },
    },
    '/chats/{conversationId}/messages/{messageId}': {
      patch: {
        tags: ['Chats'], summary: 'Edit your own text message', security: bearerAuth, parameters: [idParam('conversationId', 'Conversation id'), idParam('messageId', 'Message id')],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } } } } },
        responses: { 200: { description: 'Message edited' }, 400: { description: 'Not a text message, already deleted, or missing text', content: { 'application/json': { schema: errorResponse } } }, 401: responses401, 403: responses403, 404: responses404 },
      },
      delete: { tags: ['Chats'], summary: 'Delete your own message', security: bearerAuth, parameters: [idParam('conversationId', 'Conversation id'), idParam('messageId', 'Message id')], responses: { 200: { description: 'Message deleted' }, 401: responses401 } },
    },
    '/chats/{conversationId}/read': {
      patch: { tags: ['Chats'], summary: 'Mark a conversation as read', security: bearerAuth, parameters: [idParam('conversationId', 'Conversation id')], responses: { 200: { description: 'Marked read' }, 401: responses401 } },
    },
    '/chats/uploads/initiate': {
      post: { tags: ['Chats'], summary: 'Initiate a chunked chat-media upload', security: bearerAuth, responses: { 200: { description: 'Upload session created' }, 401: responses401 } },
    },
    '/chats/uploads/chunk': {
      post: { tags: ['Chats'], summary: 'Upload a chunk of chat media', security: bearerAuth, requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { chunk_file: { type: 'string', format: 'binary' } } } } } }, responses: { 200: { description: 'Chunk accepted' }, 401: responses401 } },
    },
    '/chats/uploads/{uploadId}/complete': {
      post: { tags: ['Chats'], summary: 'Finalize a chunked chat-media upload', security: bearerAuth, parameters: [idParam('uploadId', 'Upload session id')], responses: { 200: { description: 'Upload finalized' }, 401: responses401 } },
    },

    '/notifications': {
      get: { tags: ['Notifications'], summary: 'List the logged-in user\'s notifications', security: bearerAuth, responses: { 200: { description: 'Notifications', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } }, 401: responses401 } },
    },
    '/notifications/{id}/read': {
      patch: { tags: ['Notifications'], summary: 'Mark a notification as read', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Marked read' }, 401: responses401 } },
    },
    '/notifications/read-all': {
      patch: { tags: ['Notifications'], summary: 'Mark all notifications as read', security: bearerAuth, responses: { 200: { description: 'All marked read' }, 401: responses401 } },
    },

    '/reports': {
      post: {
        tags: ['Reports'], summary: 'File a moderation report against a user (customers report providers, providers report customers)', security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reported_user_id', 'reason', 'description'],
                properties: {
                  reported_user_id: { type: 'string' },
                  reason: {
                    type: 'string',
                    enum: [
                      'spam_or_scam', 'fraud_or_non_payment', 'abusive_behavior', 'fake_profile',
                      'poor_service_quality', 'inappropriate_content', 'safety_concern', 'other',
                    ],
                  },
                  description: { type: 'string', maxLength: 1000 },
                  requirement_id: { type: 'string', nullable: true, description: 'Optional related requirement' },
                  conversation_id: { type: 'string', nullable: true, description: 'Optional related conversation' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Report filed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Report' } } } }, 400: responses400, 401: responses401, 403: responses403, 404: responses404 },
      },
    },

    '/uploads/initiate': {
      post: { tags: ['Uploads'], summary: 'Initiate a chunked upload session for requirement media or provider portfolio photos (customer or provider)', security: bearerAuth, requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['filename', 'total_chunks', 'media_type'], properties: { filename: { type: 'string' }, total_chunks: { type: 'integer', minimum: 1 }, media_type: { type: 'string', enum: ['image', 'video'] } } } } } }, responses: { 201: { description: 'Upload session created' }, 400: responses400, 401: responses401, 403: responses403 } },
    },
    '/uploads/chunk': {
      post: { tags: ['Uploads'], summary: 'Upload one chunk of a file (customer or provider)', security: bearerAuth, requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { upload_id: { type: 'string' }, chunk_index: { type: 'integer' }, chunk_file: { type: 'string', format: 'binary' } } } } } }, responses: { 200: { description: 'Chunk accepted' }, 400: responses400, 401: responses401, 403: responses403, 404: responses404 } },
    },
    '/uploads/{uploadId}/complete': {
      post: { tags: ['Uploads'], summary: 'Finalize an upload session (optionally with a thumbnail) (customer or provider)', security: bearerAuth, parameters: [idParam('uploadId', 'Upload session id')], requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { thumbnail: { type: 'string', format: 'binary' } } } } } }, responses: { 200: { description: 'Upload finalized' }, 400: responses400, 401: responses401, 403: responses403, 404: responses404 } },
    },

    '/admin/dashboard': {
      get: { tags: ['Admin'], summary: 'Get top-line dashboard stats', security: bearerAuth, responses: { 200: { description: 'Dashboard stats' }, 401: responses401, 403: responses403 } },
    },
    '/admin/users': {
      get: { tags: ['Admin'], summary: 'List all users (optionally filtered by role)', security: bearerAuth, parameters: [{ name: 'role', in: 'query', schema: { type: 'string', enum: ['customer', 'provider', 'admin'] } }], responses: { 200: { description: 'Users', content: { 'application/json': { schema: { type: 'object', properties: { users: { type: 'array', items: { allOf: [{ $ref: '#/components/schemas/User' }, { type: 'object', properties: { providerProfile: { $ref: '#/components/schemas/Provider' }, nullable: true } }] } } } } } } }, 401: responses401, 403: responses403 } },
    },
    '/admin/users/{id}/toggle-active': {
      patch: { tags: ['Admin'], summary: 'Activate/deactivate a user account', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Updated' }, 401: responses401, 403: responses403 } },
    },
    '/admin/providers/{id}/approve': {
      patch: { tags: ['Admin'], summary: 'Approve a provider application', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Approved' }, 401: responses401, 403: responses403 } },
    },
    '/admin/applications': {
      get: {
        tags: ['Admin'], summary: 'List provider applications, filtered by review status', security: bearerAuth,
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['pending_review', 'approved', 'rejected', 'changes_required', 'all'] } }],
        responses: { 200: { description: 'Applications', content: { 'application/json': { schema: { type: 'object', properties: { applications: { type: 'array', items: { $ref: '#/components/schemas/Provider' } } } } } } }, 401: responses401, 403: responses403 },
      },
    },
    '/admin/applications/{userId}/review': {
      patch: {
        tags: ['Admin'], summary: 'Approve, reject, or request changes on a provider application', security: bearerAuth, parameters: [idParam('userId', 'Applicant user id')],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: { type: 'string', enum: ['approve', 'reject', 'changes_required'] },
                  feedback: { type: 'string', description: 'Shown to the applicant; required in practice for reject/changes_required' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Reviewed' }, 400: responses400, 401: responses401, 403: responses403, 404: responses404 },
      },
    },
    '/admin/requirements': {
      get: {
        tags: ['Admin'], summary: 'List all requirements (moderation view)', security: bearerAuth,
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'closed'] } }],
        responses: {
          200: {
            description: 'Requirements',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    requirements: {
                      type: 'array',
                      items: {
                        allOf: [
                          { $ref: '#/components/schemas/Requirement' },
                          { type: 'object', properties: { bid_count: { type: 'integer', description: 'Number of bids placed on this requirement' } } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          401: responses401,
          403: responses403,
        },
      },
    },
    '/admin/reports': {
      get: {
        tags: ['Admin'], summary: 'List moderation reports', security: bearerAuth,
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'under_review', 'action_taken', 'dismissed', 'all'] } },
          { name: 'reason', in: 'query', schema: { type: 'string' } },
          { name: 'reported_role', in: 'query', schema: { type: 'string', enum: ['customer', 'provider', 'all'] } },
        ],
        responses: { 200: { description: 'Reports', content: { 'application/json': { schema: { type: 'object', properties: { reports: { type: 'array', items: { $ref: '#/components/schemas/Report' } } } } } } }, 401: responses401, 403: responses403 },
      },
    },
    '/admin/reports/{id}': {
      get: {
        tags: ['Admin'], summary: 'Get a report by id, with the reported user\'s prior-report count', security: bearerAuth, parameters: [idParam()],
        responses: {
          200: {
            description: 'Report',
            content: { 'application/json': { schema: { type: 'object', properties: { report: { allOf: [{ $ref: '#/components/schemas/Report' }, { type: 'object', properties: { prior_reports_against_user: { type: 'integer' } } }] } } } } },
          },
          401: responses401,
          403: responses403,
          404: responses404,
        },
      },
    },
    '/admin/reports/{id}/resolve': {
      patch: { tags: ['Admin'], summary: 'Resolve a report', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Resolved' }, 401: responses401, 403: responses403 } },
    },
    '/admin/analytics': {
      get: { tags: ['Admin'], summary: 'Get platform analytics', security: bearerAuth, responses: { 200: { description: 'Analytics' }, 401: responses401, 403: responses403 } },
    },
    '/admin/categories': {
      post: { tags: ['Admin'], summary: 'Create a category', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } }, responses: { 201: { description: 'Created' }, 401: responses401, 403: responses403 } },
    },
    '/admin/categories/{id}': {
      put: { tags: ['Admin'], summary: 'Update a category', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Updated' }, 401: responses401, 403: responses403 } },
      delete: { tags: ['Admin'], summary: 'Delete a category', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Deleted' }, 401: responses401, 403: responses403 } },
    },
    '/admin/service-catalog': {
      post: { tags: ['Admin'], summary: 'Create a service-catalog item', security: bearerAuth, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ServiceCatalogItem' } } } }, responses: { 201: { description: 'Created' }, 401: responses401, 403: responses403 } },
    },
    '/admin/service-catalog/{id}': {
      put: { tags: ['Admin'], summary: 'Update a service-catalog item', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Updated' }, 401: responses401, 403: responses403 } },
      delete: { tags: ['Admin'], summary: 'Delete a service-catalog item', security: bearerAuth, parameters: [idParam()], responses: { 200: { description: 'Deleted' }, 401: responses401, 403: responses403 } },
    },
  },
};

module.exports = swaggerSpec;
