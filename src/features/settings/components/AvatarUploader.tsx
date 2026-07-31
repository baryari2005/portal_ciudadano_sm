"use client";

import { RequestAccessPhotoField } from "@/features/auth/request-access/components/RequestAccessPhotoField";

type Props = {
  currentUrl?: string | null;
  onTempUploaded: (payload: { tmpPath: string; publicUrl: string }) => void;
  maxKB?: number;
  minSize?: number;
  maxSide?: number;
  disabled?: boolean;
};

export function AvatarUploader({ currentUrl, onTempUploaded, disabled }: Props) {
  return (
    <RequestAccessPhotoField
      sidePreview
      currentUrl={currentUrl}
      onUploaded={onTempUploaded}
      onClear={() => undefined}
      allowClear={false}
      allowCamera={false}
      disabled={disabled}
      title="Avatar de perfil"
      description="Elegí una imagen JPG o PNG para mostrar en el portal. También podés arrastrarla y soltarla."
    />
  );
}
