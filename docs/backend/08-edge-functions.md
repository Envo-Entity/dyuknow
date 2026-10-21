## Edge functions

This build has no edge functions. An edge function is a small server program that Supabase runs on request, and nothing in this build needs to reach outside the database on its own.

### Why none are needed

Every job that might have been an edge function runs somewhere simpler.

| Job | Where it runs | Why |
|---|---|---|
| Every member action: post, answer, book, cancel, confirm hours, message, availability, profile, documents | Database functions, called as RPC (a remote call to a database function) | Each must be one transaction with row locks, so double booking is impossible. An edge function would need the service-role key and would skip the row rules. |
| Notices and red dots | Inside those same database functions, then Supabase Realtime | Notifications are in-app only, so a notice is just a row written with its change (see Notifications). |
| Sign-in codes | Supabase Auth | Auth sends the 6-digit code email itself (see Sign-up, login and onboarding). |
| The five-minute sweep and the daily tidy | pg_cron, inside the database | They change only database rows (see Scheduled jobs). |
| Approving members and checking documents | Admin database functions | Pure data changes. |
| Photo and document uploads | The browser, straight into the member's own Storage folder | Storage rules check the folder, then a database function records the file. |
| Seeding and wiping fake data | Scripts run from the developer's machine with the service-role key | They run by hand, and the key never leaves that machine (see Fake data now, real users later). |

### Planned for later

Three edge functions come after this build, each when its feature is added.

| Function | What it will do | Started by |
|---|---|---|
| send-emails | Sends queued email notifications through Resend (see Notifications → Later: email). | pg_cron, when an email is due. |
| invite-member | Brings real users in: creates a login for an onboarding record, or for an address the owner types, and emails the invitation. | The admin, from /admin. |
| delete-account | Carries out a deletion request: closes the member's shifts and bookings, removes their files and deletes their login. | The admin, from /admin, after a member asks with request_account_deletion. |
