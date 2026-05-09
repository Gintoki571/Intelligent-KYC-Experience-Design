import React, { useState, useRef, useEffect, useCallback } from "react";

const STEP_LABELS = ["Welcome", "Personal Info", "Documents", "Review"];

const PERSONAL_FIELDS = [
  {
    name: "fullName",
    label: "Full Name",
    type: "text",
    placeholder: "e.g. Prisha Thapa",
    hint: "Exactly as it appears on your ID",
    span: 2,
  },
  {
    name: "dob",
    label: "Date of Birth",
    type: "date",
    placeholder: "",
    hint: "Must match your government ID",
    span: 1,
  },
  {
    name: "nationality",
    label: "Nationality",
    type: "select",
    placeholder: "Select nationality",
    hint: "Your legal citizenship",
    span: 1,
  },
  {
    name: "idNumber",
    label: "ID or Passport Number",
    type: "text",
    placeholder: "Enter ID or passport number",
    hint: "No spaces or dashes",
    span: 2,
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    placeholder: "+977 98XXXXXXXX",
    hint: "Include country code",
    span: 1,
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "name@example.com",
    hint: "We will send status updates here",
    span: 1,
  },
  {
    name: "address",
    label: "Address",
    type: "text",
    placeholder: "Street, building, area",
    hint: "Current residential address",
    span: 2,
  },
  {
    name: "city",
    label: "City",
    type: "text",
    placeholder: "City",
    hint: "As on your proof of address",
    span: 1,
  },
  {
    name: "country",
    label: "Country",
    type: "select",
    placeholder: "Select country",
    hint: "Country of residence",
    span: 1,
  },
];

const NATIONALITIES = [
  "Nepalese",
  "Indian",
  "Bangladeshi",
  "Sri Lankan",
  "Bhutanese",
  "Pakistani",
  "Other",
];

const COUNTRIES = [
  "Nepal",
  "India",
  "Bangladesh",
  "Sri Lanka",
  "Bhutan",
  "Pakistan",
  "United States",
  "United Kingdom",
  "Australia",
  "Canada",
  "Other",
];

const DOC_ITEMS = [
  {
    key: "govId",
    label: "Government ID",
    hint: "Passport or national ID, front side",
  },
  {
    key: "addressProof",
    label: "Proof of Address",
    hint: "Utility bill or bank statement (last 3 months)",
  },
  {
    key: "selfie",
    label: "Selfie",
    hint: "Well-lit, no filters",
  },
];

const FAQ_ITEMS = [
  {
    q: "How long does verification take?",
    a: "Most applications are verified within 1-2 business days. Complex cases may take a bit longer.",
  },
  {
    q: "Can I update my documents after submitting?",
    a: "Yes. Use the Edit buttons on the Review step before you submit.",
  },
  {
    q: "Why was my document rejected?",
    a: "Common reasons include glare, blur, or expired documents. Upload a clear, valid copy.",
  },
  {
    q: "How will I get notified?",
    a: "We send updates to the email address you provided in the Personal Info step.",
  },
];

const QUICK_PROMPTS = [
  "Where is my verification?",
  "What documents are accepted?",
  "How long does it take?",
];

const PROMPT_REPLIES = {
  "Where is my verification?":
    "Your application is in the verification pipeline. The status timeline shows the current stage in progress.",
  "What documents are accepted?":
    "We accept passports, national ID cards, and recent utility bills or bank statements for address proof.",
  "How long does it take?":
    "Most verifications finish within 1-2 business days. We will email you when it is complete.",
};

const initialPersonalState = {
  fullName: "",
  dob: "",
  nationality: "",
  idNumber: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "",
};

const initialDocState = {
  govId: { file: null, preview: "", status: "empty", error: "", scanToken: 0 },
  addressProof: { file: null, preview: "", status: "empty", error: "", scanToken: 0 },
  selfie: { file: null, preview: "", status: "empty", error: "", scanToken: 0 },
};

export default function KycOnboarding() {
  const [step, setStep] = useState(0);
  const [personal, setPersonal] = useState(initialPersonalState);
  const [touched, setTouched] = useState({});
  const [documents, setDocuments] = useState(initialDocState);
  const [reviewOpen, setReviewOpen] = useState({
    personal: true,
    contact: true,
    documents: true,
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hi! I am your KYC assistant. Ask me anything about the verification process.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const fileInputRefs = useRef({});
  const scanTimersRef = useRef({});
  const typingTimerRef = useRef(null);
  const appIdRef = useRef("");

  if (!appIdRef.current) {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    appIdRef.current = `KYC-${Date.now().toString(36).toUpperCase()}-${rand}`;
  }

  const validateField = useCallback((name, value) => {
    const trimmed = String(value || "").trim();

    if (name === "fullName") {
      if (!trimmed) return "Enter your full legal name.";
      if (trimmed.split(/\s+/).length < 2) return "Use first and last name as on your ID.";
      return "";
    }

    if (name === "dob") {
      if (!trimmed) return "Enter your date of birth.";
      const date = new Date(trimmed);
      if (Number.isNaN(date.getTime())) return "Enter a valid date of birth.";
      const today = new Date();
      if (date > today) return "Date of birth cannot be in the future.";
      let age = today.getFullYear() - date.getFullYear();
      const m = today.getMonth() - date.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age -= 1;
      if (age < 18) return "You must be at least 18 years old.";
      return "";
    }

    if (name === "nationality") {
      if (!trimmed) return "Select your nationality.";
      return "";
    }

    if (name === "idNumber") {
      if (!trimmed) return "Enter your ID or passport number.";
      if (trimmed.length < 6) return "Enter a valid ID or passport number.";
      return "";
    }

    if (name === "phone") {
      if (!trimmed) return "Enter your phone number.";
      const normalized = trimmed.replace(/\s+/g, "");
      if (!/^\+?[0-9]{7,15}$/.test(normalized)) return "Enter a valid phone number with country code.";
      return "";
    }

    if (name === "email") {
      if (!trimmed) return "Enter your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return "Enter a valid email address.";
      return "";
    }

    if (name === "address") {
      if (!trimmed) return "Enter your residential address.";
      if (trimmed.length < 5) return "Address is too short.";
      return "";
    }

    if (name === "city") {
      if (!trimmed) return "Enter your city.";
      if (trimmed.length < 2) return "City name is too short.";
      return "";
    }

    if (name === "country") {
      if (!trimmed) return "Select your country.";
      return "";
    }

    return "";
  }, []);

  const markAllTouched = useCallback(() => {
    const nextTouched = {};
    PERSONAL_FIELDS.forEach((field) => {
      nextTouched[field.name] = true;
    });
    setTouched(nextTouched);
  }, []);

  const handleBlur = useCallback((name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const handleChange = useCallback((name, value) => {
    setPersonal((prev) => ({ ...prev, [name]: value }));
  }, []);

  const allPersonalValid = PERSONAL_FIELDS.every(
    (field) => validateField(field.name, personal[field.name]) === ""
  );

  const allDocsReady = DOC_ITEMS.every((doc) => documents[doc.key].status === "success");

  const canGoNext =
    (step === 0 && true) ||
    (step === 1 && allPersonalValid) ||
    (step === 2 && allDocsReady) ||
    (step === 3 && allPersonalValid && allDocsReady) ||
    step === 4;

  const nextLabel =
    step === 0 ? "Start" : step === 3 ? "Submit" : step === 4 ? "Done" : "Continue";

  const handleNext = useCallback(() => {
    if (step === 1 && !allPersonalValid) {
      markAllTouched();
      return;
    }
    if (step === 2 && !allDocsReady) {
      return;
    }
    if (step === 3 && !(allPersonalValid && allDocsReady)) {
      markAllTouched();
      return;
    }
    if (step === 4) {
      setStep(0);
      return;
    }
    setStep((prev) => prev + 1);
  }, [step, allPersonalValid, allDocsReady, markAllTouched]);

  const handleBack = useCallback(() => {
    if (step === 0) return;
    setStep((prev) => Math.max(0, prev - 1));
  }, [step]);

  const handleFile = useCallback((key, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setDocuments((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          file: null,
          preview: "",
          status: "error",
          error: "Only image files are accepted.",
          scanToken: 0,
        },
      }));
      return;
    }

    const preview = URL.createObjectURL(file);
    const scanToken = Date.now();

    setDocuments((prev) => {
      if (prev[key].preview) {
        URL.revokeObjectURL(prev[key].preview);
      }
      return {
        ...prev,
        [key]: {
          file,
          preview,
          status: "scanning",
          error: "",
          scanToken,
        },
      };
    });

    if (scanTimersRef.current[key]) {
      clearTimeout(scanTimersRef.current[key]);
    }

    scanTimersRef.current[key] = setTimeout(() => {
      setDocuments((prev) => {
        if (prev[key].scanToken !== scanToken) return prev;
        return {
          ...prev,
          [key]: {
            ...prev[key],
            status: "success",
          },
        };
      });
    }, 1200);
  }, []);

  const handleDrop = useCallback(
    (event, key) => {
      event.preventDefault();
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      handleFile(key, file);
    },
    [handleFile]
  );

  const handlePromptClick = useCallback((prompt) => {
    setMessages((prev) => [...prev, { from: "user", text: prompt }]);
    setIsTyping(true);

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      const reply = PROMPT_REPLIES[prompt] || "Let me check that for you.";
      setMessages((prev) => [...prev, { from: "ai", text: reply }]);
      setIsTyping(false);
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(scanTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(documents).forEach((doc) => {
        if (doc.preview) URL.revokeObjectURL(doc.preview);
      });
    };
  }, [documents]);

  const renderStepper = () => (
    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-[0_10px_30px_rgba(15,31,75,0.08)]">
      <div className="grid grid-cols-4 gap-3">
        {STEP_LABELS.map((label, index) => {
          const isComplete = step > index;
          const isActive = step <= 3 && step === index;
          const circleClasses = isComplete
            ? "bg-[#0d9e72] text-white"
            : isActive
            ? "border-2 border-[#0d9e72] text-[#0d9e72]"
            : "border-2 border-slate-200 text-slate-400";

          return (
            <div key={label} className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold ${circleClasses}`}
                aria-hidden="true"
              >
                {isComplete ? "✓" : index + 1}
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-slate-400">Step {index + 1}</span>
                <span className={`text-sm font-semibold ${isActive ? "text-[#0f1f4b]" : "text-slate-500"}`}>
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWelcome = () => (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#0f1f4b] via-[#142a63] to-[#0d9e72] text-white p-8 shadow-[0_18px_40px_rgba(15,31,75,0.2)]">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">Secure KYC Onboarding</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">Verify your identity in about 5 minutes</h1>
        <p className="text-sm mt-3 text-white/80">
          We use bank-grade encryption and a streamlined flow inspired by leading fintechs like eSewa.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { title: "Personal Info", text: "Share your details" },
            { title: "Upload Docs", text: "ID, address, selfie" },
            { title: "Review", text: "Confirm and submit" },
          ].map((item, idx) => (
            <div key={item.title} className="rounded-2xl bg-white/10 border border-white/20 p-4">
              <p className="text-xs uppercase text-white/60">Step {idx + 1}</p>
              <p className="font-semibold mt-1">{item.title}</p>
              <p className="text-xs text-white/70 mt-1">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            "256-bit Encryption",
            "Regulatory Compliant",
            "Secure Data Vault",
          ].map((badge) => (
            <span
              key={badge}
              className="text-xs font-semibold px-3 py-1 rounded-full border border-white/30 bg-white/10"
            >
              {badge}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={handleNext}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-white text-[#0f1f4b] font-semibold px-6 py-3 shadow-sm"
        >
          Start verification
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_10px_30px_rgba(15,31,75,0.08)]">
          <h2 className="text-xl font-bold">What you will need</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-[#0d9e72] font-bold">✓</span>
              Government-issued ID or passport
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0d9e72] font-bold">✓</span>
              Recent proof of address (utility or bank statement)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#0d9e72] font-bold">✓</span>
              A clear selfie in good lighting
            </li>
          </ul>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_10px_30px_rgba(15,31,75,0.08)]">
          <h3 className="text-lg font-bold">Why we ask</h3>
          <p className="text-sm text-slate-600 mt-2">
            KYC keeps your account safe and helps us comply with financial regulations. Your data stays
            encrypted and never shared without consent.
          </p>
          <div className="mt-4 bg-[#f0fdf4] border border-[#0d9e72]/30 rounded-xl p-4">
            <p className="text-sm text-[#0d9e72] font-semibold">Estimated time: ~5 min</p>
            <p className="text-xs text-slate-600 mt-1">Most users finish in one sitting.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_10px_30px_rgba(15,31,75,0.08)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Personal information</h2>
          <p className="text-sm text-slate-600">
            Provide the details exactly as they appear on your government-issued ID.
          </p>
        </div>
        <div className="bg-[#f0fdf4] border border-[#0d9e72]/30 rounded-xl px-4 py-2">
          <p className="text-xs uppercase tracking-wide text-[#0d9e72]">Secure form</p>
          <p className="text-sm font-semibold text-[#0d9e72]">Auto-saved</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {PERSONAL_FIELDS.map((field) => {
          const value = personal[field.name];
          const error = touched[field.name] ? validateField(field.name, value) : "";
          const showSuccess = touched[field.name] && !error;
          const hintId = `${field.name}-hint`;
          const errorId = `${field.name}-error`;
          const describedBy = `${hintId}${error ? ` ${errorId}` : ""}`;

          return (
            <div
              key={field.name}
              className={`flex flex-col gap-1 ${field.span === 2 ? "md:col-span-2" : ""}`}
            >
              <label htmlFor={field.name} className="text-sm font-medium text-[#0f1f4b]">
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  id={field.name}
                  value={value}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  onBlur={() => handleBlur(field.name)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9e72]/40 focus:border-[#0d9e72]"
                  aria-describedby={describedBy}
                  aria-invalid={!!error}
                >
                  <option value="">{field.placeholder}</option>
                  {(field.name === "nationality" ? NATIONALITIES : COUNTRIES).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.name}
                  type={field.type}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  onBlur={() => handleBlur(field.name)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9e72]/40 focus:border-[#0d9e72]"
                  aria-describedby={describedBy}
                  aria-invalid={!!error}
                />
              )}
              <p id={hintId} className="text-xs text-slate-500">
                {field.hint}
              </p>
              {error ? (
                <p id={errorId} role="alert" className="text-xs text-red-600">
                  {error}
                </p>
              ) : showSuccess ? (
                <p className="text-xs text-[#0d9e72]">✓ Looks good</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_10px_30px_rgba(15,31,75,0.08)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Upload documents</h2>
          <p className="text-sm text-slate-600">Drag and drop files or click to upload.</p>
        </div>
        <div className="bg-[#f0fdf4] border border-[#0d9e72]/30 rounded-xl px-4 py-2">
          <p className="text-xs uppercase tracking-wide text-[#0d9e72]">Required</p>
          <p className="text-sm font-semibold text-[#0d9e72]">3 documents</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {DOC_ITEMS.map((doc) => {
          const docState = documents[doc.key];
          const statusClasses =
            docState.status === "success"
              ? "bg-[#e9f9f2] text-[#0d9e72] border-[#0d9e72]/30"
              : docState.status === "error"
              ? "bg-red-50 text-red-600 border-red-200"
              : docState.status === "scanning"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-slate-50 text-slate-500 border-slate-200";

          return (
            <div
              key={doc.key}
              className="rounded-2xl border border-dashed border-slate-200 p-4 flex flex-col gap-4"
              onDrop={(event) => handleDrop(event, doc.key)}
              onDragOver={(event) => event.preventDefault()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{doc.label}</h3>
                  <p className="text-xs text-slate-500 mt-1">{doc.hint}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${statusClasses}`}>
                  {docState.status === "scanning"
                    ? "Scanning"
                    : docState.status === "success"
                    ? "Verified"
                    : docState.status === "error"
                    ? "Error"
                    : "Waiting"}
                </span>
              </div>
              <div
                className={`rounded-xl border border-slate-200 bg-[#f8fafc] p-4 flex items-center justify-center min-h-[140px] text-center text-sm text-slate-500`}
                onClick={() => fileInputRefs.current[doc.key]?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") fileInputRefs.current[doc.key]?.click();
                }}
              >
                {docState.preview ? (
                  <img
                    src={docState.preview}
                    alt={`${doc.label} preview`}
                    className="h-28 w-28 object-cover rounded-lg border border-slate-200"
                  />
                ) : (
                  <div>
                    <p className="font-medium text-[#0f1f4b]">Drag and drop or click to upload</p>
                    <p className="text-xs mt-1 text-slate-500">PNG or JPG, max 10MB</p>
                  </div>
                )}
              </div>
              {docState.error ? (
                <p role="alert" className="text-xs text-red-600">
                  {docState.error}
                </p>
              ) : null}
              <div className="flex items-center justify-between">
                <input
                  ref={(el) => {
                    fileInputRefs.current[doc.key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleFile(doc.key, event.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[doc.key]?.click()}
                  className="text-sm font-semibold text-[#0d9e72]"
                >
                  {docState.preview ? "Replace" : "Upload"}
                </button>
                {docState.status === "success" ? (
                  <span className="text-xs text-slate-500">Ready</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {!allDocsReady && (
        <p className="text-xs text-slate-500 mt-4">
          Continue is enabled after all three documents are uploaded and verified.
        </p>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_10px_30px_rgba(15,31,75,0.08)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Review and submit</h2>
          <p className="text-sm text-slate-600">Confirm your details before sending for verification.</p>
        </div>
        <div className="bg-[#f0fdf4] border border-[#0d9e72]/30 rounded-xl px-4 py-2">
          <p className="text-xs uppercase tracking-wide text-[#0d9e72]">Almost there</p>
          <p className="text-sm font-semibold text-[#0d9e72]">1 step left</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div className="border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setReviewOpen((prev) => ({ ...prev, personal: !prev.personal }))}
              className="text-left"
            >
              <p className="text-sm uppercase tracking-wide text-slate-400">Personal</p>
              <p className="text-lg font-semibold">Identity details</p>
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-semibold text-[#0d9e72]"
              >
                Edit
              </button>
              <span className="text-sm text-slate-400">{reviewOpen.personal ? "Hide" : "Show"}</span>
            </div>
          </div>
          {reviewOpen.personal && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
              <div>
                <p className="text-xs uppercase text-slate-400">Full name</p>
                <p className="font-medium text-[#0f1f4b]">{personal.fullName || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Date of birth</p>
                <p className="font-medium text-[#0f1f4b]">{personal.dob || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Nationality</p>
                <p className="font-medium text-[#0f1f4b]">{personal.nationality || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">ID number</p>
                <p className="font-medium text-[#0f1f4b]">{personal.idNumber || "-"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setReviewOpen((prev) => ({ ...prev, contact: !prev.contact }))}
              className="text-left"
            >
              <p className="text-sm uppercase tracking-wide text-slate-400">Contact</p>
              <p className="text-lg font-semibold">Where we can reach you</p>
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-semibold text-[#0d9e72]"
              >
                Edit
              </button>
              <span className="text-sm text-slate-400">{reviewOpen.contact ? "Hide" : "Show"}</span>
            </div>
          </div>
          {reviewOpen.contact && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
              <div>
                <p className="text-xs uppercase text-slate-400">Phone</p>
                <p className="font-medium text-[#0f1f4b]">{personal.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Email</p>
                <p className="font-medium text-[#0f1f4b]">{personal.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Address</p>
                <p className="font-medium text-[#0f1f4b]">{personal.address || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">City, Country</p>
                <p className="font-medium text-[#0f1f4b]">
                  {personal.city || "-"}, {personal.country || "-"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setReviewOpen((prev) => ({ ...prev, documents: !prev.documents }))}
              className="text-left"
            >
              <p className="text-sm uppercase tracking-wide text-slate-400">Documents</p>
              <p className="text-lg font-semibold">Uploaded files</p>
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-sm font-semibold text-[#0d9e72]"
              >
                Edit
              </button>
              <span className="text-sm text-slate-400">{reviewOpen.documents ? "Hide" : "Show"}</span>
            </div>
          </div>
          {reviewOpen.documents && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {DOC_ITEMS.map((doc) => (
                <div key={doc.key} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase text-slate-400">{doc.label}</p>
                  <p
                    className={`font-semibold mt-1 ${
                      documents[doc.key].status === "success" ? "text-[#0d9e72]" : "text-red-600"
                    }`}
                  >
                    {documents[doc.key].status === "success" ? "Uploaded" : "Missing"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <p className="text-sm text-slate-600">
          By submitting, you confirm that the information is accurate and you consent to identity
          verification checks in line with regulatory requirements.
        </p>
      </div>
    </div>
  );

  const renderStatus = () => {
    const stages = [
      { label: "Submitted", desc: "We received your application." },
      { label: "Identity Check", desc: "Validating your ID document." },
      { label: "Address Check", desc: "Matching proof of address." },
      { label: "Compliance Review", desc: "Final approval and screening." },
      { label: "Verified", desc: "Account ready to use." },
    ];
    const activeIndex = 3;

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_10px_30px_rgba(15,31,75,0.08)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Verification in progress</h2>
            <p className="text-sm text-slate-600 mt-1">Application ID: {appIdRef.current}</p>
          </div>
          <div className="bg-[#f0fdf4] border border-[#0d9e72]/30 rounded-2xl px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#0d9e72]">Estimated time</p>
            <p className="text-lg font-semibold text-[#0d9e72]">1-2 business days</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="relative rounded-2xl border border-slate-200 p-5">
            <div className="absolute left-6 top-6 bottom-6 w-px bg-slate-200" aria-hidden="true" />
            <div className="space-y-6">
              {stages.map((stage, index) => {
                const isComplete = index < activeIndex;
                const isActive = index === activeIndex;
                return (
                  <div key={stage.label} className="relative pl-10">
                    <div
                      className={`absolute left-3 top-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        isComplete
                          ? "bg-[#0d9e72] border-[#0d9e72] text-white"
                          : isActive
                          ? "border-[#0d9e72] text-[#0d9e72] animate-pulse"
                          : "border-slate-300 text-slate-300"
                      }`}
                      aria-hidden="true"
                    >
                      {isComplete ? "✓" : ""}
                    </div>
                    <p className="font-semibold text-[#0f1f4b]">{stage.label}</p>
                    <p className="text-sm text-slate-500">{stage.desc}</p>
                    {isActive && (
                      <span className="inline-flex mt-2 text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        In progress
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
            <h3 className="text-lg font-bold">Support FAQ</h3>
            <div className="mt-4 space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-[#0f1f4b]">
                    {item.q}
                  </summary>
                  <p className="mt-2 text-sm text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNavigation = () => (
    <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
      <button
        type="button"
        onClick={handleBack}
        disabled={step === 0}
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-[#0f1f4b] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Back
      </button>
      <button
        type="button"
        onClick={handleNext}
        disabled={!canGoNext}
        className="inline-flex items-center justify-center rounded-xl bg-[#0d9e72] px-6 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {nextLabel}
      </button>
    </div>
  );

  const renderContent = () => {
    if (step === 0) return renderWelcome();
    if (step === 1) return renderPersonalInfo();
    if (step === 2) return renderDocuments();
    if (step === 3) return renderReview();
    return renderStatus();
  };

  return (
    <div
      className="min-h-screen bg-[#f8fafc] text-[#0f1f4b]"
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <style>{`
        @keyframes typing {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
        .typing-dot {
          animation: typing 1.2s infinite;
        }
        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {renderStepper()}
        {renderContent()}
        {renderNavigation()}
      </div>

      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[360px]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,31,75,0.16)] overflow-hidden">
          <button
            type="button"
            onClick={() => setChatOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#0f1f4b] text-white"
          >
            <div>
              <p className="text-sm font-semibold">AI Support</p>
              <p className="text-xs text-white/70">Instant answers, 24/7</p>
            </div>
            <span className="text-xs font-semibold">{chatOpen ? "Hide" : "Chat"}</span>
          </button>
          {chatOpen && (
            <div className="p-4 space-y-4">
              <div className="max-h-56 overflow-y-auto space-y-3" aria-live="polite">
                {messages.map((msg, idx) => (
                  <div
                    key={`${msg.from}-${idx}`}
                    className={`rounded-2xl px-3 py-2 text-sm max-w-[85%] ${
                      msg.from === "user"
                        ? "ml-auto bg-[#0d9e72] text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
                {isTyping && (
                  <div className="rounded-2xl px-3 py-2 text-sm bg-slate-100 text-slate-600 w-24 flex gap-1">
                    <span className="typing-dot">•</span>
                    <span className="typing-dot">•</span>
                    <span className="typing-dot">•</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handlePromptClick(prompt)}
                    className="text-xs font-semibold px-3 py-2 rounded-full border border-slate-200 bg-[#f8fafc] text-slate-600 hover:border-[#0d9e72]/60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
