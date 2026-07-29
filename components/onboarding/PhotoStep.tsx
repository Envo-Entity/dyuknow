import { ContinueButton } from "@/components/onboarding/ContinueButton";
import { PhotoUploadStep } from "@/components/onboarding/PhotoUploadStep";
import { StepHeader } from "@/components/onboarding/StepHeader";

interface PhotoStepProps {
  description: string;
  mono: string;
  photo: string | null;
  onPhoto: (dataUrl: string | null) => void;
  onContinue: () => void;
}

export function PhotoStep({ description, mono, photo, onPhoto, onContinue }: PhotoStepProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <StepHeader eyebrow="Photo" title="Add a photo." description={description} center />
      <PhotoUploadStep mono={mono} photo={photo} onPhoto={onPhoto} />
      <ContinueButton onClick={onContinue} />
    </div>
  );
}
