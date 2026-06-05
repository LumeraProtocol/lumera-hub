import ReCAPTCHA from "react-google-recaptcha";

interface IRecaptcha {
  onChange?: (value: string | null) => void;
}

const sitekey = process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_CLIENT_SITE_KEY!;

export default function Recaptcha({
  onChange
}: IRecaptcha) {
  if (!sitekey) {
    return null;
  }
  const handleChange = (value: string | null) => {
    if (onChange) {
      onChange(value);
    }
  }

  return (
    <ReCAPTCHA
      sitekey={sitekey}
      onChange={handleChange}
      theme="dark"
    />
  );
}
