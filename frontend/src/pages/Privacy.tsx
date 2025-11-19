export function Privacy() {
  return (
    <div className="min-h-screen bg-muted/50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-background rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <p className="text-muted-foreground mb-4">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Overview</h2>
          <p className="mb-3">
            Data Room is a document management application that allows you to import and manage
            files from your Google Drive. This privacy policy explains how we handle your data.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Data We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Google Account Information:</strong> When you sign in, we receive your
              email address, name, and profile picture from Google.
            </li>
            <li>
              <strong>Google Drive Files:</strong> We access your Google Drive in read-only mode
              to list and import files you select. We only access files you explicitly choose to import.
            </li>
            <li>
              <strong>Imported Files:</strong> When you import files, we download a copy from your
              Google Drive and store it on our servers. Your original files in Google Drive are
              not modified or deleted.
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To authenticate you and provide access to the application</li>
            <li>To display and manage your imported files</li>
            <li>To maintain your session while using the application</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Data Storage & Security</h2>
          <p className="mb-3">
            Your data is stored securely using industry-standard encryption. We use OAuth 2.0
            for authentication and do not store your Google password.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Data Sharing</h2>
          <p className="mb-3">
            We do not sell, trade, or share your personal information with third parties.
            Your files and data are only accessible to you.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
          <p className="mb-3">
            You can delete your imported files at any time through the application.
            You can also delete your account and all associated data using the "Delete Account"
            option in the header. Deleting files or your account only removes data from our
            servers - your original files in Google Drive are not affected.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Google API Services</h2>
          <p className="mb-3">
            This application's use of Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any
            changes by posting the new policy on this page with an updated date.
          </p>
        </section>

        <div className="mt-8 pt-6 border-t">
          <a href="/" className="text-primary hover:underline">
            ← Back to Data Room
          </a>
        </div>
      </div>
    </div>
  )
}
