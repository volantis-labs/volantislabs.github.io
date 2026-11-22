-- iOS and Apple Watch waitlist. One row for each email address.
-- The form requires consent, so created_at is also the consent time.
CREATE TABLE waitlist (
  email TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
