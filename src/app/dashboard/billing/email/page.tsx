import EmailForm from "@/components/Email/Emailform";

export default function EmailPage() {
  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-dark dark:text-white">
          Email Sender
        </h1>
        <p className="text-body-sm text-dark-5 dark:text-dark-6">
          Send emails to your customers and team members
        </p>
      </div>

      {/* Email Form - Centered with max width */}
      <div className="mx-auto max-w-3xl">
        <EmailForm />
      </div>
    </>
  );
}
