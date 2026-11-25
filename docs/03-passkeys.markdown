# 3. Passkey sign-in

People sign in to GreenPath with a **passkey**: their fingerprint, face or
device PIN, with no password. This page turns passkeys on in Supabase and
explains how the pieces fit. Do [2. Supabase setup](02-supabase-setup.markdown)
first.

The starter kit's password and "Sign in with Google" are gone. Passkeys replaced
them.

## How it works

| Step             | What the person does                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| Sign up          | Types an email, opens the link sent to it, gets a username, makes a passkey     |
| Sign in          | Types the email, then uses the passkey                                          |
| Another device   | Signed in, presses **Add a passkey** in the footer and makes one on that device |
| Lost the passkey | Types the email, opens a new link, then makes a new passkey                     |

- **An account can have many passkeys**, one per phone, computer or security
  key, and any of them signs in. Recovery adds a new one next to the old ones;
  it does not replace them. Supabase caps the number per account and the app
  says so when it is reached.
- **The email is only for recovery.** It lives in Supabase Auth (`auth.users`)
  and is used for the sign-up and recovery emails. It is never shown on screen,
  never copied into `profiles`, and the server never returns it. The auth
  middleware drops it from the token before any route sees the user.
- **The username is generated**: three English words, re-rollable, never typed.
  The server creates it on the first `GET /api/me` (`server/lib/profiles.ts`).
- When signing in, the browser lets the person pick any passkey it has for the
  site. The app then checks that the passkey's account has the email they typed,
  and if not signs out again and says so (`client/lib/auth.tsx`).

The passkey ceremony is Supabase's own (`signInWithPasskey()` and
`registerPasskey()` in `@supabase/supabase-js`). It is still marked
**experimental** in Supabase, which is why `client/lib/supabase.ts` sets
`experimental: { passkey: true }`. Pin the `@supabase/supabase-js` version and
test sign-in again whenever you upgrade it.

Supabase only lets a confirmed email user register a passkey, which is why
signing up starts with an email.

## Turn on passkeys

In Supabase: **Authentication** -> **Passkeys**, and switch on **Enable Passkey
authentication**. Fill in:

| Field                      | Set it to                                                      |
| -------------------------- | -------------------------------------------------------------- |
| Relying Party Display Name | `GreenPath`                                                    |
| Relying Party ID           | your domain with nothing else, e.g. `your-address.workers.dev` |
| Relying Party Origins      | `https://your-address.workers.dev,http://localhost:3000`       |

- The **Relying Party ID** is the domain passkeys are tied to. **Changing it
  later makes every existing passkey stop working**, so pick the real domain
  before people sign up. For local-only work use `localhost`.
- A passkey made on `localhost` only works on `localhost`, and one made on the
  deployed site only works there.
- Origins must be `https`, except `localhost`.

If the switch seems not to take effect (sign-in says passkeys are switched off),
people have reported that changing any other Auth setting and changing it back
makes it apply.

## The sign-up and recovery email

Supabase's own email sends a **link**. It opens `/auth/callback`, which signs
the person in and takes them to the next step: the username (sign-up) or a new
passkey (recovery). The link must be allowed, so in **Authentication** -> **URL
Configuration** -> **Redirect URLs** add:

```text
http://localhost:3000/**
https://your-address.workers.dev/**
```

The app also accepts a typed **code**, for when the link is opened on another
device. Supabase's own email has no code, and its templates can only be edited
once you use your own SMTP. When you do, add the code to **Magic link or OTP**
and **Confirm sign up**:

```html
<p>Or type this code in the app: <strong>{{ .Token }}</strong></p>
```

Leave **Confirm email** on: following the link (or typing the code) is the
confirmation.

**Before real users sign up, set up your own SMTP** under **Authentication** ->
**Emails** -> **SMTP Settings**. Supabase's own email sends only a few emails an
hour, and only to addresses of your Supabase organisation's members, so nobody
else can sign up or recover without it.

## Try it

Open **http://localhost:3000/signin**, choose **Create an account**, and go
through the steps. You should end up on the home page with your username in the
footer.

Sign out, then sign in again with the same email and the passkey. To try a
second passkey, press **Add a passkey** in the footer and choose your phone or a
security key in the browser's prompt.

Things that commonly go wrong:

| What you see                              | Why                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| "This browser does not support passkeys"  | An old browser, or an in-app browser without WebAuthn                     |
| "Passkeys only work over https"           | You opened the site by IP address or plain `http`                         |
| "Passkeys aren't set up for this address" | The Relying Party ID or Origins do not match the address                  |
| "Passkey sign-in is switched off"         | The toggle above is off, or has not applied yet                           |
| "We couldn't verify the passkey"          | Some password managers' passkeys fail with Supabase; try the device's own |

## Next

[4. Deploy](04-deploy.markdown).
