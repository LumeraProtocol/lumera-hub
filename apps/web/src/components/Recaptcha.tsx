'use client';

import ReCAPTCHA from "react-google-recaptcha";
import { useRef } from "react";

interface IRecaptcha {
  onChange?: (value: string | null) => void;
  onExpired?: () => void;
  onErrored?: () => void;
  className?: string;
}

const sitekey = process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_CLIENT_SITE_KEY!;

export default function Recaptcha({
  onChange,
  onExpired,
  onErrored,
  className,
}: IRecaptcha) {
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  if (!sitekey) {
    console.warn("Missing NEXT_PUBLIC_GOOGLE_RECAPTCHA_CLIENT_SITE_KEY");
    return null;
  }

  const handleChange = (value: string | null) => {
    onChange?.(value);
  };

  const handleExpired = () => {
    onExpired?.();
    recaptchaRef.current?.reset();
  };

  const handleError = () => {
    onErrored?.();
  };

  return (
    <ReCAPTCHA
      ref={recaptchaRef}
      sitekey={sitekey}
      onChange={handleChange}
      onExpired={handleExpired}
      onError={handleError}
      theme="dark"
      className={className}
    />
  );
}
