import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { Reveal } from "@/components/Reveal";
import { CopyInline } from "@/components/CopyInline";
import { SITE_URL, imageMeta } from "@/lib/seo";
import Swal from "sweetalert2";
import { submitContactMessage } from "@/lib/contact-api";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — UniversalTools" },
      { name: "description", content: "Reach the UniversalTools team for support, partnerships or feedback. Email prashantnadar2223@gmail.com or call +91 96533 86506." },
      { property: "og:title", content: "Contact UniversalTools" },
      { property: "og:description", content: "Get in touch with the UniversalTools team — email, phone, and contact form." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/contact` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Contact UniversalTools" },
      { name: "twitter:description", content: "Get in touch with the UniversalTools team — email, phone, and contact form." },
      ...imageMeta(),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/contact` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact UniversalTools",
          url: `${SITE_URL}/contact`,
          description: "Reach the UniversalTools team for support, partnerships or feedback.",
          mainEntity: {
            "@type": "Organization",
            name: "UniversalTools",
            url: SITE_URL,
            contactPoint: [{
              "@type": "ContactPoint",
              email: "prashantnadar2223@gmail.com",
              telephone: "+91-96533-86506",
              contactType: "customer support",
              availableLanguage: ["English", "Hindi"],
            }],
          },
        }),
      },
    ],
  }),
  component: Contact,
});



const EMAIL = "prashantnadar2223@gmail.com";
const PHONE_DISPLAY = "+91 96533 86506";
const PHONE_TEL = "+919653386506";

const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const hasLetter = /[A-Za-z]/;

const contactSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less")
    .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, "Only letters and spaces between words are allowed"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(50, "Email must be 50 characters or less")
    .regex(emailRegex, "Enter a valid email address"),
  subject: z
    .string()
    .trim()
    .min(10, "Subject must be at least 10 characters")
    .max(100, "Subject must be 100 characters or less")
    .regex(hasLetter, "Subject can't be only numbers or symbols"),
  message: z
    .string()
    .trim()
    .min(20, "Message must be at least 20 characters")
    .max(500, "Message must be 500 characters or less")
    .regex(hasLetter, "Message can't be only numbers or symbols"),
});

type Errors = Partial<Record<keyof z.infer<typeof contactSchema>, string>>;


function Contact() {
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const clearFieldError = (field: keyof Errors) => {
    if (!errors[field]) return;

    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    const form = e.currentTarget;

    const data = new FormData(form);

    const parsed = contactSchema.safeParse({
      name: data.get("name"),
      email: data.get("email"),
      subject: data.get("subject"),
      message: data.get("message"),
    });

    if (!parsed.success) {
      const errs: Errors = {};

      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof Errors;
        if (k && !errs[k]) errs[k] = issue.message;
      }

      setErrors(errs);
      setStatus("Please fix the highlighted fields.");

      return;
    }

    setErrors({});
    setStatus("");
    setLoading(true);

    try {
      await submitContactMessage(parsed.data);

      await Swal.fire({
        icon: "success",
        title: "Message sent",
        text: "Thank you for contacting UniversalTools. We'll get back to you soon.",
        confirmButtonColor: "#2563eb",
      });

      form.reset();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Couldn't send message",
        text: "We couldn't submit your message right now. Please check your connection and try again.",
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldCls = (err?: string) =>
    `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-950 dark:text-white ${err ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-blue-500 dark:border-slate-700"
    }`;

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <Reveal>
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Get in touch</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">Questions, ideas, bug reports — we read everything.</p>
          <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Email:</span>
              <a href={`mailto:${EMAIL}?subject=UniversalTools%20Inquiry`} className="text-blue-600 hover:underline dark:text-blue-400">{EMAIL}</a>
              <CopyInline value={EMAIL} label="email" />
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Phone:</span>
              <a href={`tel:${PHONE_TEL}`} className="text-blue-600 hover:underline dark:text-blue-400">{PHONE_DISPLAY}</a>
              <CopyInline value={PHONE_DISPLAY} label="phone number" />
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <fieldset disabled={loading} className="space-y-4">
            <form
              onSubmit={onSubmit}
              noValidate
              className="mt-10 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Name<span aria-hidden className="text-red-500"> *</span></label>
                <input id="name" onChange={() => clearFieldError("name")} autoComplete="name" name="name" required maxLength={50} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} className={fieldCls(errors.name)} />
                {errors.name && <p id="name-err" className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email<span aria-hidden className="text-red-500"> *</span></label>
                <input id="email" onChange={() => clearFieldError("email")} autoComplete="email" name="email" type="email" required maxLength={50} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} className={fieldCls(errors.email)} />
                {errors.email && <p id="email-err" className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Subject<span aria-hidden className="text-red-500"> *</span></label>
                <input id="subject" onChange={() => clearFieldError("subject")} autoComplete="off" name="subject" required minLength={10} maxLength={100} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-err" : undefined} className={fieldCls(errors.subject)} />
                {errors.subject && <p id="subject-err" className="mt-1 text-xs text-red-600">{errors.subject}</p>}
              </div>
              <div>
                <label htmlFor="msg" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Message<span aria-hidden className="text-red-500"> *</span></label>
                <textarea id="msg" onChange={() => clearFieldError("message")} autoComplete="off" name="message" required minLength={20} maxLength={500} rows={5} aria-invalid={!!errors.message} aria-describedby={errors.message ? "msg-err" : undefined} className={fieldCls(errors.message)} />
                {errors.message && <p id="msg-err" className="mt-1 text-xs text-red-600">{errors.message}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending your message..." : "Send Message"}
              </button>
              <p role="status" aria-live="polite" className="min-h-[1.25rem] text-sm text-slate-600 dark:text-slate-400">{status}</p>

            </form>
          </fieldset>
        </Reveal>
      </section>
    </Layout>
  );
}
