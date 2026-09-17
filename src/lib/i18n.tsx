import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ml";

const STORAGE_KEY = "hypnotism-lang";

type Dict = Record<string, { en: string; ml: string }>;

export const dict: Dict = {
  brandTitle: { en: "HYPNOTISM", ml: "ഹിപ്നോട്ടിസം" },
  tagline: {
    en: "Understand the Mind • Master Your Focus • Practice Responsibly",
    ml: "മനസ്സിനെ മനസ്സിലാക്കുക • ശ്രദ്ധയെ നിയന്ത്രിക്കുക • ഉത്തരവാദിത്തത്തോടെ പരിശീലിക്കുക",
  },
  joinClass: { en: "Join Class", ml: "ക്ലാസിൽ ചേരുക" },
  login: { en: "Login", ml: "ലോഗിൻ" },
  logout: { en: "Log out", ml: "ലോഗ് ഔട്ട്" },
  chooseLanguage: { en: "Choose your language", ml: "ഭാഷ തിരഞ്ഞെടുക്കുക" },
  continueText: { en: "Continue", ml: "തുടരുക" },
  categories: { en: "Course Categories", ml: "കോഴ്സ് വിഭാഗങ്ങൾ" },
  introTitle: { en: "Introduction to Hypnotism", ml: "ഹിപ്നോട്ടിസം — ആമുഖം" },
  introBody: {
    en: "Hypnotism is a technique involving focused attention, relaxation, and increased responsiveness to suggestions.\n\nHypnosis is commonly described as a state involving focused attention and heightened suggestibility. It is not the same as ordinary sleep, and a person generally retains awareness and the ability to respond according to their own choices.\n\nHypnotism has been studied in psychological and scientific contexts and has also been used in performance and certain complementary or clinical settings by appropriately trained professionals.\n\nThis course teaches students to understand hypnotism responsibly rather than presenting it as supernatural mind control.",
    ml: "ഹിപ്നോട്ടിസം (Hypnotism) എന്നത് ശ്രദ്ധയെ ഒരു പ്രത്യേക കാര്യത്തിൽ കേന്ദ്രീകരിക്കൽ, വിശ്രമാവസ്ഥ, നിർദ്ദേശങ്ങളോട് കൂടുതൽ ശ്രദ്ധ പുലർത്തുന്ന അവസ്ഥ എന്നിവയുമായി ബന്ധപ്പെട്ട ഒരു സാങ്കേതികവിദ്യയാണ്.\n\nഹിപ്നോസിസ് സാധാരണ ഉറക്കത്തിന് തുല്യമല്ല. ഹിപ്നോട്ടിക് അവസ്ഥയിലുള്ള വ്യക്തിക്ക് ചുറ്റുപാടുകളെക്കുറിച്ച് ഒരു പരിധിവരെ ബോധവാനായിരിക്കാം. ഒരാളുടെ മനസ്സിന്റെ പൂർണ്ണ നിയന്ത്രണം മറ്റൊരാൾക്ക് ലഭിക്കുന്നു എന്നത് ഹിപ്നോസിസിന്റെ ശാസ്ത്രീയമായ വിവരണം അല്ല.\n\nഈ കോഴ്സ് ഹിപ്നോട്ടിസത്തെ ശാസ്ത്രീയവും ഉത്തരവാദിത്തപരവുമായ രീതിയിൽ മനസ്സിലാക്കാൻ സഹായിക്കുന്നതിനാണ്.",
  },
  learnTitle: { en: "What Students Learn", ml: "വിദ്യാർത്ഥികൾ പഠിക്കുന്നത്" },
  ethicsTitle: { en: "Learn Responsibly", ml: "ഉത്തരവാദിത്തത്തോടെ പഠിക്കുക" },
  ethicsPillars: {
    en: "Consent • Safety • Respect • Responsibility",
    ml: "സമ്മതം • സുരക്ഷ • ബഹുമാനം • ഉത്തരവാദിത്തം",
  },
  registerTitle: { en: "Student Registration", ml: "വിദ്യാർത്ഥി രജിസ്ട്രേഷൻ" },
  fullName: { en: "Full Name", ml: "പൂർണ്ണ പേര്" },
  age: { en: "Age", ml: "വയസ്സ്" },
  phone: { en: "Phone Number", ml: "ഫോൺ നമ്പർ" },
  whatsapp: { en: "WhatsApp Number", ml: "വാട്സ്ആപ്പ് നമ്പർ" },
  gmail: { en: "Gmail Address", ml: "ജിമെയിൽ വിലാസം" },
  address: { en: "Address", ml: "വിലാസം" },
  photo: { en: "Profile Photo", ml: "പ്രൊഫൈൽ ഫോട്ടോ" },
  course: { en: "Selected Course", ml: "തിരഞ്ഞെടുത്ത കോഴ്സ്" },
  consent: {
    en: "I have read the privacy notice and I consent to my details being stored privately for this class.",
    ml: "സ്വകാര്യതാ അറിയിപ്പ് വായിച്ചു, എന്റെ വിവരങ്ങൾ ഈ ക്ലാസിനായി സ്വകാര്യമായി സൂക്ഷിക്കാൻ ഞാൻ സമ്മതിക്കുന്നു.",
  },
  privacyNotice: {
    en: "Your details are visible only to the course owner. They are never shown to other students and are never made public.",
    ml: "നിങ്ങളുടെ വിവരങ്ങൾ കോഴ്സ് ഉടമയ്ക്ക് മാത്രമേ കാണാനാകൂ. മറ്റ് വിദ്യാർത്ഥികൾക്ക് ഇത് കാണാനാകില്ല.",
  },
  submit: { en: "Submit Registration", ml: "രജിസ്ട്രേഷൻ സമർപ്പിക്കുക" },
  signInGoogle: { en: "Continue with Google", ml: "ഗൂഗിൾ ഉപയോഗിച്ച് തുടരുക" },
  gmailMismatch: {
    en: "The Gmail you entered does not match your signed-in Google account.",
    ml: "നൽകിയ ജിമെയിൽ, ലോഗിൻ ചെയ്ത ഗൂഗിൾ അക്കൗണ്ടുമായി യോജിക്കുന്നില്ല.",
  },
  welcome: { en: "Welcome", ml: "സ്വാഗതം" },
  myClasses: { en: "My Classes", ml: "എന്റെ ക്ലാസുകൾ" },
  progress: { en: "Progress", ml: "പുരോഗതി" },
  continueLearning: { en: "Continue Learning", ml: "പഠനം തുടരുക" },
  noAccess: {
    en: "You don't have access to this class.",
    ml: "ഈ ക്ലാസിലേക്ക് നിങ്ങൾക്ക് പ്രവേശനം ഇല്ല.",
  },
  pendingApproval: {
    en: "Your registration is waiting for approval.",
    ml: "നിങ്ങളുടെ രജിസ്ട്രേഷൻ അനുമതിക്കായി കാത്തിരിക്കുന്നു.",
  },
  suspended: {
    en: "Your account is suspended. Please contact the course owner.",
    ml: "നിങ്ങളുടെ അക്കൗണ്ട് താൽക്കാലികമായി നിർത്തിവച്ചിരിക്കുന്നു.",
  },
  lesson: { en: "Lesson", ml: "പാഠം" },
  previous: { en: "Previous", ml: "മുൻപത്തേത്" },
  next: { en: "Next", ml: "അടുത്തത്" },
  notes: { en: "Notes", ml: "കുറിപ്പുകൾ" },
  markComplete: { en: "Mark as completed", ml: "പൂർത്തിയായി അടയാളപ്പെടുത്തുക" },
  completed: { en: "Completed", ml: "പൂർത്തിയായി" },
  adminAccess: { en: "Admin Access", ml: "അഡ്മിൻ പ്രവേശനം" },
  enterKey: { en: "Enter Access Key", ml: "ആക്സസ് കീ നൽകുക" },
  verify: { en: "Verify", ml: "പരിശോധിക്കുക" },
  registrationDate: { en: "Registration date", ml: "രജിസ്ട്രേഷൻ തീയതി" },
  status: { en: "Status", ml: "സ്ഥിതി" },
};

export function useT() {
  const { lang } = useLanguage();
  return (key: keyof typeof dict) => dict[key]?.[lang] ?? String(key);
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  chosen: boolean;
};

const LanguageContext = createContext<Ctx>({ lang: "en", setLang: () => {}, chosen: true });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [chosen, setChosen] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === "en" || stored === "ml") {
      setLangState(stored);
    } else {
      setChosen(false);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    setChosen(true);
    window.localStorage.setItem(STORAGE_KEY, l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, chosen }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
