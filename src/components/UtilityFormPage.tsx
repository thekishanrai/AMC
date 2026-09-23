"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { uploadProblem } from "@/lib/uploads";

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
  const [fileNote, setFileNote] = useState<{ name: string; problem: string | null } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  // Upload straight to Supabase Storage with a signed URL (no Vercel body
  // limit), reporting progress. Returns the stored path.
  async function uploadAttachment(file: File): Promise<string> {
    const res = await fetch("/api/submissions/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formType: config.slug, fileName: file.name, type: file.type, size: file.size }) });
    const info = await res.json().catch(() => ({}));
    if (!res.ok || !info.path || !info.token) throw new Error(info.error || "Could not start the upload.");
    const target = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/form-attachments/${info.path}?token=${encodeURIComponent(info.token)}`;
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", target);
      xhr.setRequestHeader("x-upsert", "false");
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
      xhr.setRequestHeader("apikey", anon);
      xhr.setRequestHeader("Authorization", `Bearer ${anon}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("The attachment could not be uploaded.")));
      xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
      const body = new FormData();
      body.append("cacheControl", "3600");
      body.append("", file);
      xhr.send(body);
    });
    return info.path as string;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setErrorMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("attachment");
    data.delete("attachment");
    data.set("form_type", config.slug);
    data.set("page_path", window.location.pathname);
    try {
      if (file instanceof File && file.size > 0) {
        const problem = uploadProblem(file);
        if (problem) throw new Error(problem);
        setProgress(0);
        const path = await uploadAttachment(file);
        data.set("attachment_path", path);
        data.set("attachment_name", file.name);
      }
      const response = await fetch("/api/submissions", { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not send your message.");
      form.reset();
      setFileNote(null);
      setProgress(null);
      setStatus("sent");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not send your message.");
      setProgress(null);
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
          <span>get in touch<i className="amc-utility-num"> / {config.number}</i></span>
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
                : field.type === "file" ? <span className="amc-form-upload"><b>＋ ADD A FILE</b><small>{field.placeholder}</small><input name="attachment" type="file" accept={field.accept} onChange={(e) => { const f = e.currentTarget.files?.[0]; setFileNote(f ? { name: f.name, problem: uploadProblem(f) } : null); }} />{fileNote && <small className={fileNote.problem ? "amc-upload-note is-error" : "amc-upload-note"} role={fileNote.problem ? "alert" : undefined}>{fileNote.problem ?? fileNote.name}</small>}{progress !== null && status === "sending" && <span className="amc-upload-progress" aria-label={`Uploading ${progress}%`}><i style={{ width: `${progress}%` }} /></span>}</span>
                : field.type === "choices" ? <span className="amc-form-choices">{field.options?.map((option) => <span key={option.value}><input id={`${field.name}-${option.value}`} type="radio" name={field.name} value={option.value} required={field.required}/><span>{option.label}</span></span>)}</span>
                : <input name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} required={field.required} />}
            </label>
          ))}
          <button type="submit" className="amc-form-submit" disabled={status === "sending"}>{status === "sending" ? (progress !== null && progress < 100 ? `UPLOADING ${progress}%` : "SENDING…") : config.submitLabel}</button>
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
