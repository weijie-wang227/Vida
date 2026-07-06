# vida Frontend

React/Vite mobile frontend for vida, an activity discovery and group chat app.

## Actual Features

- Email/password sign up, sign in, session restore, and sign out through the backend API.
- Authenticated activity browsing for standard and premium activities.
- Activity search, detail views, map pins, and group joining.
- Activity creation through the backend API with Photon location search and map pin selection.
- Feed loading, feed post creation, comment loading, comment creation, and post likes through the backend API.
- Image uploads for feed posts through the backend presigned upload endpoint.
- Group list, group message loading, and group message sending through the backend API.
- Profile and friend list loading from the backend API.

## Still Mockup Or Demo Behavior

- Like buttons for activities are local UI state only.
- Post menus, sharing, notifications, profile editing, friend messaging, and group info buttons are visual only.
- The profile QR code is a static visual and does not encode a real user profile link.
- The vida progress logo is local UI state and is not calculated from real activity history.
- The map assumes Singapore and uses a hardcoded "you are here" location.

## Notes

- The frontend no longer ships fallback mock data for app state. If the API fails, the app logs the error in the browser console and surfaces the failure through the relevant UI flow.
- Set `VITE_API_URL` when the backend is not running at `http://localhost:4000/api`.

## Render Deployment

This app uses React Router with `BrowserRouter`, so Render needs a rewrite rule for direct visits and refreshes on client-side routes such as `/groups`.

In the Render Static Site dashboard, add this Redirect/Rewrite rule:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | `Rewrite` |

Render serves real static assets before applying rewrite rules, so this does not replace files that exist in the built `dist` directory.

## Running

```bash
npm install
npm run dev
```
