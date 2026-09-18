export interface EmailProfile {
  id: string;
  name: string;
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  from_email: string;
  from_name: string;
}

export interface EmailProfilesValue {
  default_profile_id: string | null;
  profiles: EmailProfile[];
}

export const SECRET_MASK = "***ENCRYPTED***";

export const EMAIL_PROFILES_CONFIG_KEY = "email_profiles";
