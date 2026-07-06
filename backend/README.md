# vida Backend

Express/MongoDB API backend for vida. It serves the real API used by `new-frontend`.

## Actual Features

- Email/password sign up and sign in with password hashing and signed auth tokens.
- Session lookup through `GET /api/auth/me`.
- Authenticated profile and friend list reads.
- Activity listing, activity detail, map pin listing, activity creation, and activity joining.
- Group listing, group joining, group message listing, and group message creation.
- Feed listing, feed post creation, comment loading, comment creation, and post likes.
- Presigned image upload URLs for R2-backed media uploads.
- MongoDB persistence for users, friendships, chats, admins, chat messages, activities, activity joins, map pins, feed posts, comments, and likes.

## Still Mockup Or Demo Behavior

- `src/data.ts` is demo seed data used by `npm run seed`.
- The seed script rebuilds demo users, friendships, groups, activities, map pins, feed posts, comments, and likes.
- Some domain fields are still presentation-level values: credits are strings, ratings default for new activities, and unread counts are not calculated.
- If MongoDB is unavailable, API routes return `503`; the backend does not serve fallback in-memory data.

## Environment

`MONGODB_URI` is required for API routes beyond `/api/health`.

Optional/feature-specific variables:

- `PORT`
- `AUTH_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`

## Running

```bash
npm install
npm run seed
npm run dev
```

## Main Endpoints

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET /api/auth/me`
- `GET /api/profile`
- `GET /api/friends`
- `DELETE /api/friends/:friendId`
- `GET /api/activities`
- `GET /api/activities/premium`
- `GET /api/activities/map-pins`
- `GET /api/activities/:id`
- `POST /api/activities`
- `POST /api/activities/:id/join`
- `GET /api/feed`
- `POST /api/feed`
- `POST /api/feed/:id/likes`
- `DELETE /api/feed/:id/likes`
- `GET /api/feed/:id/comments`
- `POST /api/feed/:id/comments`
- `GET /api/notifications`
- `POST /api/notifications/send`
- `POST /api/notifications/:notificationId/read`
- `GET /api/groups`
- `GET /api/groups/:id`
- `POST /api/groups/:id/join`
- `GET /api/groups/:id/messages`
- `POST /api/groups/:id/messages`
- `POST /api/uploads/presigned-url`
