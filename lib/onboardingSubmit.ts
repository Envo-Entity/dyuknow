import { createClient } from "@/utils/supabase/client";
import { dataUrlToBlob } from "@/lib/image";
import { TEAM_AGREEMENTS, VENUE_AGREEMENTS } from "@/lib/data";
import type { TalentIdentity, VenueIdentity } from "@/lib/types";

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_");
}

async function uploadDataUrl(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
  dataUrl: string
): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  // No upsert: each submission gets a fresh crypto.randomUUID() path, so
  // there's never a real collision to resolve — and upsert requires an
  // UPDATE-shaped RLS check we deliberately never granted (insert-only).
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
  });
  if (error) throw error;
  return path;
}

export type SubmitResult = { ok: true } | { ok: false; error: unknown };

export async function submitTalentOnboarding(identity: TalentIdentity): Promise<SubmitResult> {
  const supabase = createClient();
  const id = crypto.randomUUID();

  try {
    const photoPath = identity.photo ? await uploadDataUrl(supabase, "profile-photos", `talent/${id}.jpg`, identity.photo) : null;
    const rightToWorkPath = identity.rightToWork
      ? await uploadDataUrl(supabase, "verification-documents", `${id}/right-to-work-${sanitizeFilename(identity.rightToWork.name)}`, identity.rightToWork.dataUrl)
      : null;
    const foodSafetyCertPath = identity.foodSafetyCert
      ? await uploadDataUrl(supabase, "verification-documents", `${id}/food-safety-cert-${sanitizeFilename(identity.foodSafetyCert.name)}`, identity.foodSafetyCert.dataUrl)
      : null;
    const cvPath = identity.cv
      ? await uploadDataUrl(supabase, "verification-documents", `${id}/cv-${sanitizeFilename(identity.cv.name)}`, identity.cv.dataUrl)
      : null;

    const { error } = await supabase.from("talent_profiles").insert({
      id,
      full_name: orNull(identity.name),
      mobile_number: orNull(identity.mobile),
      email: orNull(identity.email),
      home_postcode: orNull(identity.postcode),
      date_of_birth: orNull(identity.dob),
      photo_filename: identity.photo ? "photo.jpg" : null,
      photo_path: photoPath,
      category: orNull(identity.category),
      positions: identity.positions,
      skills: identity.skills,
      years_band: orNull(identity.yearsBand),
      employment_history: identity.employers,
      available_today: identity.availableToday,
      preferred_shifts: identity.preferredShifts,
      max_travel: orNull(identity.maxTravel),
      preferred_areas: identity.preferredAreas,
      preferred_hourly_rate: orNull(identity.preferredRate),
      minimum_same_day_rate_gbp: numberOrNull(identity.minSameDayRate),
      right_to_work_filename: identity.rightToWork?.name ?? null,
      right_to_work_path: rightToWorkPath,
      food_safety_cert_filename: identity.foodSafetyCert?.name ?? null,
      food_safety_cert_path: foodSafetyCertPath,
      cv_filename: identity.cv?.name ?? null,
      cv_path: cvPath,
      bio: orNull(identity.bio),
      known_for: identity.knownFor,
      agreed_turn_up_on_time: identity.agreedCommunity.includes(TEAM_AGREEMENTS[0]),
      agreed_treat_venues_with_respect: identity.agreedCommunity.includes(TEAM_AGREEMENTS[1]),
      agreed_give_notice_if_cancelling: identity.agreedCommunity.includes(TEAM_AGREEMENTS[2]),
      agreed_represent_professionally: identity.agreedCommunity.includes(TEAM_AGREEMENTS[3]),
      onboarding_completed_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error("Failed to persist talent onboarding to Supabase", err);
    return { ok: false, error: err };
  }
}

export async function submitVenueOnboarding(identity: VenueIdentity): Promise<SubmitResult> {
  const supabase = createClient();
  const id = crypto.randomUUID();

  try {
    const photoPath = identity.photo ? await uploadDataUrl(supabase, "profile-photos", `venue/${id}.jpg`, identity.photo) : null;

    const { error } = await supabase.from("venue_profiles").insert({
      id,
      business_name: orNull(identity.name),
      trading_name: orNull(identity.tradingName),
      registered_company: orNull(identity.registeredCompany),
      website: orNull(identity.website),
      instagram_handle: orNull(identity.instagram),
      contact_name: orNull(identity.contactName),
      contact_position: orNull(identity.contactPosition),
      contact_phone: orNull(identity.contactPhone),
      contact_email: orNull(identity.contactEmail),
      photo_filename: identity.photo ? "photo.jpg" : null,
      photo_path: photoPath,
      venue_types: identity.venueType,
      cuisines: identity.cuisine,
      covers_band: orNull(identity.covers),
      average_team_size: numberOrNull(identity.teamSize),
      average_team_vacancies_per_week: numberOrNull(identity.teamVacanciesPerWeek),
      roles_needed: identity.needs,
      typical_shifts: identity.typicalShifts,
      typical_notice: identity.typicalNotice,
      dress_code: orNull(identity.dressCode),
      uniform_provided: identity.uniformProvided,
      staff_meal: identity.staffMeal,
      typical_hourly_rate_chef_gbp: numberOrNull(identity.rateChef),
      typical_hourly_rate_foh_gbp: numberOrNull(identity.rateFoh),
      bio: orNull(identity.bio),
      known_for: identity.knownFor,
      agreed_pay_fairly: identity.agreedCommunity.includes(VENUE_AGREEMENTS[0]),
      agreed_treat_team_like_our_own: identity.agreedCommunity.includes(VENUE_AGREEMENTS[1]),
      agreed_provide_clear_brief: identity.agreedCommunity.includes(VENUE_AGREEMENTS[2]),
      agreed_rate_honestly: identity.agreedCommunity.includes(VENUE_AGREEMENTS[3]),
      onboarding_completed_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error("Failed to persist venue onboarding to Supabase", err);
    return { ok: false, error: err };
  }
}
