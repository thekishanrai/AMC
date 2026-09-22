"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

type Option = { value: string; label: string };
type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "url" | "textarea" | "file" | "choices";
  placeholder?: string;
  required?: boolean;
  options?: Option[];
  accept?: string;
};

export type UtilityFormConfig = {
  number: string;
  slug: "request-location" | "share-feedback" | "report-bug" | "contact";
  title: string;
  intro: string;
  submitLabel: string;
  fields: Field[];
};

const routes = [
  ["Request a location", "/request-location"],
  ["Share feedback", "/share-feedback"],
  ["Report a bug", "/report-bug"],
  ["Contact us", "/contact"],
] as const;

export default function UtilityFormPage({ config }: { config: UtilityFormConfig }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("form_type", config.slug);
    data.set("page_path", window.location.pathname);
    try {
      const response = await fetch("/api/submissions", { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not send your message.");
      form.reset();
      setStatus("sent");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not send your message.");
      setStatus("error");
    }
  }

  return (
    <main className="amc-utility-page">
      <header className="amc-static-topbar">
        <Link href="/" className="amc-wordmark">ANTI MONDAY CLUB</Link>
        <Link href="/?section=account">← More</Link>
      </header>
      <section className="amc-utility-main">
        <header className="amc-utility-hero">
          <span>get in touch / {config.number}</span>
          <b>{config.number}</b>
          <h1>{config.title}</h1>
          <p>{config.intro}</p>
        </header>
        <form className="amc-utility-form" onSubmit={handleSubmit} encType="multipart/form-data">
          <input type="text" name="website" className="amc-form-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {config.fields.map((field) => (
            <label key={field.name} className="amc-form-field">
              <span>{field.label}{field.required ? " *" : ""}</span>
              {field.type === "textarea" ? <textarea name={field.name} placeholder={field.placeholder} required={field.required} />
                : field.type === "file" ? <span className="amc-form-upload"><b>＋ ADD A FILE</b><small>{field.placeholder}</small><input name="attachment" type="file" accept={field.accept} /></span>
                : field.type === "choices" ? <span className="amc-form-choices">{field.options?.map((option) => <span key={option.value}><input id={`${field.name}-${option.value}`} type="radio" name={field.name} value={option.value} required={field.required}/><span>{option.label}</span></span>)}</span>
                : <input name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} required={field.required} />}
            </label>
          ))}
          <button type="submit" className="amc-form-submit" disabled={status === "sending"}>{status === "sending" ? "SENDING…" : config.submitLabel}</button>
          {status === "sent" && <p className="amc-form-status is-success" role="status">Message received. We&apos;ll take a look.</p>}
          {status === "error" && <p className="amc-form-status is-error" role="alert">{errorMessage}</p>}
          <p className="amc-form-note">We only use your contact to reply to this message.</p>
        </form>
        <nav className="amc-form-related" aria-label="Other contact forms">
          {routes.filter(([label]) => label.toUpperCase() !== config.title).map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
      </section>
    </main>
  );
}
