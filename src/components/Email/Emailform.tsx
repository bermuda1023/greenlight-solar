'use client';
import { useState } from 'react';

export default function EmailForm() {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Limit file size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        setStatus('error:File size must be less than 5MB');
        return;
      }
      setAttachment(file);
      setStatus('');
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    setIsSubmitting(true);

    try {
      let attachmentBase64 = '';

      // Convert file to base64 if attachment exists
      if (attachment) {
        const reader = new FileReader();
        attachmentBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            // Remove the data:*/*;base64, prefix
            resolve(base64.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(attachment);
        });
      }

      const response = await fetch('/api/sendmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: toEmail,
          subject,
          htmlContent: message,
          attachment: attachmentBase64 || undefined
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setStatus('success');
        // Clear form on success
        setToEmail('');
        setSubject('');
        setMessage('');
        setAttachment(null);
      } else {
        setStatus(`error:${result.error}`);
      }
    } catch (error) {
      setStatus('error:Failed to send email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-[10px] border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
      <div className="border-b border-stroke px-6.5 py-4 dark:border-dark-3">
        <h3 className="text-xl font-semibold text-dark dark:text-white">
          Send an Email
        </h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="p-6.5">
          {/* To Email Field */}
          <div className="mb-4.5">
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              To <span className="text-red">*</span>
            </label>
            <input
              type="email"
              placeholder="Enter recipient email address"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              required
              className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5.5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary dark:disabled:bg-dark-3"
              disabled={isSubmitting}
            />
          </div>

          {/* Subject Field */}
          <div className="mb-4.5">
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              Subject <span className="text-red">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5.5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary dark:disabled:bg-dark-3"
              disabled={isSubmitting}
            />
          </div>

          {/* Message Field */}
          <div className="mb-4.5">
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              Message <span className="text-red">*</span>
            </label>
            <textarea
              rows={6}
              placeholder="Enter your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full rounded-[7px] border-[1.5px] border-stroke bg-transparent px-5.5 py-3 text-dark outline-none transition placeholder:text-dark-6 focus:border-primary active:border-primary disabled:cursor-default disabled:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary dark:disabled:bg-dark-3"
              disabled={isSubmitting}
            ></textarea>
          </div>

          {/* Attachment Field */}
          <div className="mb-4.5">
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              Attachment (Optional)
            </label>

            {!attachment ? (
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="file-upload"
                  className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[7px] border-[1.5px] border-dashed border-stroke bg-gray-1 px-5.5 py-6 text-center text-dark outline-none transition hover:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white ${
                    isSubmitting ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <svg
                    className="fill-current"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10.4613 2.07827C10.3429 1.94876 10.1755 1.875 10 1.875C9.82453 1.875 9.65714 1.94876 9.53873 2.07827L6.28873 5.57827C6.03123 5.85449 6.0125 6.29324 6.24498 6.59199C6.47746 6.89074 6.89621 6.91324 7.15996 6.65574L9.375 4.28949V12.5C9.375 12.8452 9.65482 13.125 10 13.125C10.3452 13.125 10.625 12.8452 10.625 12.5V4.28949L12.84 6.65574C13.1038 6.91324 13.5225 6.89074 13.755 6.59199C13.9875 6.29324 13.9688 5.85449 13.7113 5.57827L10.4613 2.07827Z"
                      fill=""
                    />
                    <path
                      d="M3.125 12.5C3.125 12.1548 2.84518 11.875 2.5 11.875C2.15482 11.875 1.875 12.1548 1.875 12.5V12.5457C1.87498 13.6854 1.87497 14.604 1.9721 15.3265C2.07295 16.0765 2.2887 16.7081 2.79029 17.2097C3.29189 17.7113 3.92345 17.9271 4.67354 18.0279C5.39602 18.125 6.31462 18.125 7.45428 18.125H12.5457C13.6854 18.125 14.604 18.125 15.3265 18.0279C16.0766 17.9271 16.7081 17.7113 17.2097 17.2097C17.7113 16.7081 17.9271 16.0765 18.0279 15.3265C18.125 14.604 18.125 13.6854 18.125 12.5457V12.5C18.125 12.1548 17.8452 11.875 17.5 11.875C17.1548 11.875 16.875 12.1548 16.875 12.5C16.875 13.6962 16.8737 14.5304 16.789 15.1599C16.7067 15.7714 16.5565 16.1082 16.3258 16.3389C16.0952 16.5695 15.7584 16.7197 15.1469 16.802C14.5174 16.8867 13.6832 16.888 12.487 16.888H7.513C6.31679 16.888 5.48264 16.8867 4.85314 16.802C4.24159 16.7197 3.90476 16.5695 3.67412 16.3389C3.44349 16.1082 3.29327 15.7714 3.21103 15.1599C3.12628 14.5304 3.125 13.6962 3.125 12.5Z"
                      fill=""
                    />
                  </svg>
                  <div>
                    <span className="text-body-sm">
                      <span className="text-primary">Click to upload</span> or drag and drop
                    </span>
                  </div>
                  <div>
                    <span className="text-body-xs text-dark-6">
                      PDF, DOC, TXT, JPG, PNG (max. 5MB)
                    </span>
                  </div>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-[7px] border-[1.5px] border-stroke bg-gray-1 px-5.5 py-3 dark:border-dark-3 dark:bg-dark-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary bg-opacity-10">
                    <svg
                      className="fill-primary"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.875 2.5H6.25C5.58696 2.5 4.95107 2.76339 4.48223 3.23223C4.01339 3.70107 3.75 4.33696 3.75 5V15C3.75 15.663 4.01339 16.2989 4.48223 16.7678C4.95107 17.2366 5.58696 17.5 6.25 17.5H13.75C14.413 17.5 15.0489 17.2366 15.5178 16.7678C15.9866 16.2989 16.25 15.663 16.25 15V6.875L11.875 2.5Z"
                        stroke=""
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M11.875 2.5V6.875H16.25"
                        stroke=""
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-body-sm font-medium text-dark dark:text-white">
                      {attachment.name}
                    </p>
                    <p className="text-body-xs text-dark-6">
                      {(attachment.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  disabled={isSubmitting}
                  className="text-red hover:text-red-dark disabled:opacity-50"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 5L5 15M5 5L15 15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="mb-4.5 flex w-full rounded-[10px] border-l-6 border-green bg-green-light-7 px-7 py-4 dark:bg-[#1B1B24] dark:bg-opacity-30">
              <div className="mr-5 flex h-8 w-full max-w-8 items-center justify-center rounded-md bg-green">
                <svg
                  width="16"
                  height="12"
                  viewBox="0 0 16 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.2984 0.826822L15.2868 0.811827L15.2741 0.797751C14.9173 0.401867 14.3238 0.400754 13.9657 0.794406L5.91888 9.45376L2.05667 5.2868C1.69856 4.89287 1.10487 4.89389 0.747996 5.28987C0.417335 5.65675 0.417335 6.22337 0.747996 6.59026L0.747959 6.59029L0.752701 6.59541L4.86742 11.0348C5.14445 11.3405 5.52858 11.5 5.89581 11.5C6.29242 11.5 6.65178 11.3355 6.92401 11.035L15.2162 2.11161C15.5833 1.74452 15.576 1.18615 15.2984 0.826822Z"
                    fill="white"
                    stroke="white"
                  ></path>
                </svg>
              </div>
              <div className="w-full">
                <h5 className="mb-2 font-bold leading-[22px] text-[#004434] dark:text-[#34D399]">
                  Email Sent Successfully
                </h5>
                <p className="text-body-sm leading-relaxed text-[#637381]">
                  Your email has been sent successfully!
                </p>
              </div>
            </div>
          )}

          {status.startsWith('error:') && (
            <div className="mb-4.5 flex w-full rounded-[10px] border-l-6 border-red-light bg-red-light-5 px-7 py-4 dark:bg-[#1B1B24] dark:bg-opacity-30">
              <div className="mr-5 flex h-8 w-full max-w-8 items-center justify-center rounded-md bg-red-light">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.4917 7.65579L11.106 12.2645C11.2545 12.4128 11.4715 12.5 11.6738 12.5C11.8762 12.5 12.0931 12.4128 12.2416 12.2645C12.5621 11.9445 12.5623 11.4317 12.2423 11.1114C12.2422 11.1113 12.2422 11.1113 12.2422 11.1113C12.242 11.1111 12.2418 11.1109 12.2416 11.1107L7.64539 6.50351L12.2589 1.91221L12.2595 1.91158C12.5802 1.59132 12.5802 1.07805 12.2595 0.757793C11.9393 0.437994 11.4268 0.437869 11.1064 0.757418C11.1063 0.757543 11.1062 0.757668 11.106 0.757793L6.49234 5.34931L1.89459 0.740581L1.89396 0.739942C1.57364 0.420019 1.0608 0.420019 0.740487 0.739944C0.42005 1.05999 0.419837 1.57279 0.73985 1.89309L6.4917 7.65579ZM6.4917 7.65579L1.89459 12.2639L1.89395 12.2645C1.74546 12.4128 1.52854 12.5 1.32616 12.5C1.12377 12.5 0.906853 12.4128 0.758361 12.2645L1.1117 11.9108L0.758358 12.2645C0.437984 11.9445 0.437708 11.4319 0.757539 11.1116C0.757812 11.1113 0.758086 11.111 0.75836 11.1107L5.33864 6.50287L0.740487 1.89373L6.4917 7.65579Z"
                    fill="#ffffff"
                    stroke="#ffffff"
                  ></path>
                </svg>
              </div>
              <div className="w-full">
                <h5 className="mb-2 font-bold leading-[22px] text-[#BC1C21]">
                  Failed to Send Email
                </h5>
                <p className="text-body-sm leading-relaxed text-[#637381]">
                  {status.replace('error:', '')}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full justify-center rounded-[7px] bg-primary p-[13px] font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </form>
    </div>
  );
}
