"use client";

import Link from "next/link";
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
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Keep validation and the page structure ready while submission storage is
    // connected separately; never pretend an unpersisted message was received.
    event.preventDefault();
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
        <form className="amc-utility-form" onSubmit={handleSubmit}>
          {config.fields.map((field) => (
            <label key={field.name} className="amc-form-field">
              <span>{field.label}{field.required ? " *" : ""}</span>
              {field.type === "textarea" ? <textarea name={field.name} placeholder={field.placeholder} required={field.required} />
                : field.type === "file" ? <span className="amc-form-upload"><b>＋ ADD A FILE</b><small>{field.placeholder}</small><input name={field.name} type="file" accept={field.accept} /></span>
                : field.type === "choices" ? <span className="amc-form-choices">{field.options?.map((option) => <span key={option.value}><input id={`${field.name}-${option.value}`} type="radio" name={field.name} value={option.value} required={field.required}/><span>{option.label}</span></span>)}</span>
                : <input name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} required={field.required} />}
            </label>
          ))}
          <button type="submit" className="amc-form-submit">{config.submitLabel}</button>
          <p className="amc-form-note">We only use your contact to reply to this message.</p>
        </form>
        <nav className="amc-form-related" aria-label="Other contact forms">
          {routes.filter(([label]) => label.toUpperCase() !== config.title).map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
      </section>
    </main>
  );
}
