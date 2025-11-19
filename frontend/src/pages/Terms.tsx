export function Terms() {
  return (
    <div className="min-h-screen bg-muted/50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-background rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

        <p className="text-muted-foreground mb-4">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Acceptance of Terms</h2>
          <p className="mb-3">
            By accessing and using Data Room, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the application.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Description of Service</h2>
          <p className="mb-3">
            Data Room is a document management application that allows you to import files
            from your Google Drive and manage them in a secure repository.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">User Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You are responsible for maintaining the security of your Google account</li>
            <li>You agree to use the service only for lawful purposes</li>
            <li>You will not upload or import content that violates any laws or third-party rights</li>
            <li>You are responsible for all content you import into the application</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Intellectual Property</h2>
          <p className="mb-3">
            You retain all rights to the files you import. We do not claim ownership of your content.
            The application itself and its original content are protected by copyright and other laws.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
          <p className="mb-3">
            The service is provided "as is" without warranties of any kind. We are not liable for
            any damages arising from your use of the service, including but not limited to data loss
            or service interruptions.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Termination</h2>
          <p className="mb-3">
            We reserve the right to terminate or suspend access to the service at any time,
            without prior notice, for conduct that we believe violates these terms or is
            harmful to other users.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Changes to Terms</h2>
          <p className="mb-3">
            We may modify these terms at any time. Continued use of the service after changes
            constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p>
            For questions about these terms, please contact us at{' '}
            <a href="mailto:support@dataroom.app" className="text-primary hover:underline">
              support@dataroom.app
            </a>
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
